import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCouponDto, CreateCouponDto, UpdateCouponDto } from './coupons.dto';
import { DiscountType } from '@ecommerce/types';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // 1. PUBLIC OFFERS & ACTIVE COUPONS FOR CUSTOMERS
  // =========================================================================

  async getActiveCoupons() {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return coupons
      .filter((c) => !c.usageLimit || c.usedCount < c.usageLimit)
      .map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
        maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
        startDate: c.startDate,
        endDate: c.endDate,
      }));
  }

  // =========================================================================
  // 2. VALIDATE AND CALCULATE COUPON DISCOUNT (BACKEND SOURCE OF TRUTH)
  // =========================================================================

  async validateAndCalculate(userId: string, dto: ApplyCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('Invalid or inactive coupon code');
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new BadRequestException(`Coupon will become active on ${coupon.startDate.toLocaleDateString()}`);
    }

    if (now > coupon.endDate) {
      throw new BadRequestException('Coupon code has expired');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    // Check per-user limit
    const perUserLimit = coupon.perUserLimit ?? 1;
    const userUsageCount = await this.prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (userUsageCount >= perUserLimit) {
      throw new BadRequestException(`You have reached the maximum usage limit (${perUserLimit}) for this coupon`);
    }

    // Check minimum order value
    if (coupon.minOrderValue && dto.subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Minimum order value of $${Number(coupon.minOrderValue).toFixed(2)} is required for this coupon`,
      );
    }

    // Check product / category restrictions if specified
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      if (dto.productIds && dto.productIds.length > 0) {
        const matchesProduct = dto.productIds.some((pId) => coupon.applicableProductIds.includes(pId));
        if (!matchesProduct) {
          throw new BadRequestException('Coupon is not applicable to any items in your cart');
        }
      }
    }

    if (coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0) {
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        const matchesCategory = dto.categoryIds.some((cId) => coupon.applicableCategoryIds.includes(cId));
        if (!matchesCategory) {
          throw new BadRequestException('Coupon is not applicable to products in these categories');
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);
    let isFreeShipping = false;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.subtotal * discountVal) / 100;
      if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
        discountAmount = Number(coupon.maxDiscount);
      }
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(dto.subtotal, discountVal);
    } else if (coupon.discountType === DiscountType.FREE_SHIPPING) {
      discountAmount = 0;
      isFreeShipping = true;
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: discountVal,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalTotal: Number(Math.max(0, dto.subtotal - discountAmount).toFixed(2)),
      isFreeShipping,
    };
  }

  // =========================================================================
  // 2. ADMIN COUPON MANAGEMENT
  // =========================================================================

  async findAllAdmin() {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true, orders: true } },
      },
    });

    return coupons.map((c) => ({
      ...c,
      discountValue: Number(c.discountValue),
      minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    }));
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Coupon code '${code}' already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        applicableCategoryIds: dto.applicableCategoryIds ?? [],
        applicableProductIds: dto.applicableProductIds ?? [],
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.minOrderValue !== undefined && { minOrderValue: dto.minOrderValue }),
        ...(dto.maxDiscount !== undefined && { maxDiscount: dto.maxDiscount }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.perUserLimit !== undefined && { perUserLimit: dto.perUserLimit }),
        ...(dto.applicableCategoryIds && { applicableCategoryIds: dto.applicableCategoryIds }),
        ...(dto.applicableProductIds && { applicableProductIds: dto.applicableProductIds }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async toggleStatus(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  }

  async delete(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted successfully' };
  }

  async getCouponUsages(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { usedAt: 'desc' },
        },
      },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');

    return coupon.usages;
  }
}
