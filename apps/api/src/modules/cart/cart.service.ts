import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AddToCartDto, UpdateCartItemDto, MergeCartDto } from './cart.dto';
import { DiscountType } from '@ecommerce/database';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // =========================================================================
  // LOGGED-IN USER CART (PERSISTED IN PRISMA DATABASE)
  // =========================================================================

  async getOrCreateCart(userId: string, couponCode?: string) {
    let cart: any = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Check if coupon stored in Redis session for this user
    const activeCouponCode = couponCode || (await this.redisService.get(`cart_coupon:${userId}`));

    return this.formatCartWithCalculations(cart, activeCouponCode || undefined);
  }

  async addItem(userId: string, dto: AddToCartDto) {
    // 1. Live inventory & pricing check directly from database
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId, deletedAt: null },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const availableStock = Math.max(0, variant.stockQuantity - variant.reservedStock);
    if (availableStock < dto.quantity) {
      throw new BadRequestException(`Only ${availableStock} units available in stock`);
    }

    // 2. Find or create user cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    // 3. Upsert cart item
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: dto.variantId,
        },
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > availableStock) {
        throw new BadRequestException(`Cannot add more than available stock (${availableStock})`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        variant: true,
      },
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    const availableStock = Math.max(0, item.variant.stockQuantity - item.variant.reservedStock);
    if (dto.quantity > availableStock) {
      throw new BadRequestException(`Only ${availableStock} units available in stock`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await this.redisService.del(`cart_coupon:${userId}`);
    }
    return { message: 'Cart cleared successfully' };
  }

  // =========================================================================
  // COUPON DISCOUNT CALCULATION
  // =========================================================================

  async applyCoupon(userId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: cleanCode,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    // Verify minimum order amount against current cart
    const cart = await this.getOrCreateCart(userId);
    if (coupon.minOrderValue && cart.subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Minimum cart total of $${Number(coupon.minOrderValue).toFixed(2)} required for this coupon`,
      );
    }

    // Store in redis for this user
    await this.redisService.set(`cart_coupon:${userId}`, cleanCode, 86400); // 24h

    return this.getOrCreateCart(userId, cleanCode);
  }

  async removeCoupon(userId: string) {
    await this.redisService.del(`cart_coupon:${userId}`);
    return this.getOrCreateCart(userId);
  }

  async applyGuestCoupon(guestId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: cleanCode,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    const cart = await this.getGuestCart(guestId);
    if (coupon.minOrderValue && cart.subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Minimum cart total of $${Number(coupon.minOrderValue).toFixed(2)} required for this coupon`,
      );
    }

    await this.redisService.set(`guest_coupon:${guestId}`, cleanCode, 86400);
    return this.getGuestCart(guestId, cleanCode);
  }

  async removeGuestCoupon(guestId: string) {
    await this.redisService.del(`guest_coupon:${guestId}`);
    return this.getGuestCart(guestId);
  }

  // =========================================================================
  // INVENTORY VALIDATION
  // =========================================================================

  async validateInventory(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { isValid: true, items: [], warnings: [] };
    }

    const itemValidations = [];
    const warnings = [];
    let isValid = true;

    for (const item of cart.items) {
      const available = Math.max(0, item.variant.stockQuantity - item.variant.reservedStock);
      const isAvailable = available >= item.quantity;

      if (!isAvailable) {
        isValid = false;
        warnings.push({
          itemId: item.id,
          variantId: item.variantId,
          productTitle: item.variant.product.title,
          variantTitle: item.variant.title,
          requestedQuantity: item.quantity,
          availableStock: available,
          message:
            available === 0
              ? `"${item.variant.product.title}" is out of stock`
              : `Only ${available} left for "${item.variant.product.title}"`,
        });
      }

      itemValidations.push({
        itemId: item.id,
        variantId: item.variantId,
        isAvailable,
        availableStock: available,
        currentUnitPrice: Number(item.variant.price),
      });
    }

    return {
      isValid,
      items: itemValidations,
      warnings,
    };
  }

  // =========================================================================
  // GUEST CART & MERGE
  // =========================================================================

  async getGuestCart(guestId: string, couponCode?: string) {
    const rawData = await this.redisService.get(`guest_cart:${guestId}`);
    const items: Array<{ variantId: string; quantity: number }> = rawData ? JSON.parse(rawData) : [];

    if (items.length === 0) {
      return this.formatCalculations(items, [], 0, 0, undefined);
    }

    const variantIds = items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, deletedAt: null },
      include: {
        product: {
          include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
          },
        },
      },
    });

    const formattedItems = items
      .map((item) => {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) return null;
        const price = Number(variant.price);
        const itemTotal = price * item.quantity;

        return {
          id: `guest-${variant.id}`,
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice: price,
          totalPrice: Number(itemTotal.toFixed(2)),
          variant: {
            id: variant.id,
            sku: variant.sku,
            title: variant.title,
            price,
            stockQuantity: variant.stockQuantity,
            availableStock: Math.max(0, variant.stockQuantity - (variant.reservedStock || 0)),
            attributes: variant.attributes,
            product: {
              id: variant.product.id,
              title: variant.product.title,
              slug: variant.product.slug,
              images: variant.product.images,
            },
          },
        };
      })
      .filter(Boolean);

    const subtotal = formattedItems.reduce((sum, item) => sum + (item?.totalPrice || 0), 0);
    const totalItems = formattedItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);

    const activeCoupon = couponCode || (await this.redisService.get(`guest_coupon:${guestId}`));
    return this.formatCalculations(formattedItems, items, subtotal, totalItems, activeCoupon || undefined);
  }

  async addGuestItem(guestId: string, dto: AddToCartDto) {
    const rawData = await this.redisService.get(`guest_cart:${guestId}`);
    let items: Array<{ variantId: string; quantity: number }> = rawData ? JSON.parse(rawData) : [];

    const existingIndex = items.findIndex((i) => i.variantId === dto.variantId);
    if (existingIndex > -1) {
      items[existingIndex].quantity += dto.quantity;
    } else {
      items.push({ variantId: dto.variantId, quantity: dto.quantity });
    }

    await this.redisService.set(`guest_cart:${guestId}`, JSON.stringify(items), 604800); // 7 days
    return this.getGuestCart(guestId);
  }

  async updateGuestItem(guestId: string, variantId: string, quantity: number) {
    const rawData = await this.redisService.get(`guest_cart:${guestId}`);
    let items: Array<{ variantId: string; quantity: number }> = rawData ? JSON.parse(rawData) : [];

    const item = items.find((i) => i.variantId === variantId);
    if (item) {
      item.quantity = quantity;
      await this.redisService.set(`guest_cart:${guestId}`, JSON.stringify(items), 604800);
    }

    return this.getGuestCart(guestId);
  }

  async removeGuestItem(guestId: string, variantId: string) {
    const rawData = await this.redisService.get(`guest_cart:${guestId}`);
    let items: Array<{ variantId: string; quantity: number }> = rawData ? JSON.parse(rawData) : [];

    items = items.filter((i) => i.variantId !== variantId);
    await this.redisService.set(`guest_cart:${guestId}`, JSON.stringify(items), 604800);

    return this.getGuestCart(guestId);
  }

  async clearGuestCart(guestId: string) {
    await this.redisService.del(`guest_cart:${guestId}`);
    await this.redisService.del(`guest_coupon:${guestId}`);
    return { message: 'Guest cart cleared' };
  }

  async mergeCart(userId: string, dto: MergeCartDto) {
    let itemsToMerge: Array<{ variantId: string; quantity: number }> = dto.items || [];

    if (dto.guestCartId) {
      const rawData = await this.redisService.get(`guest_cart:${dto.guestCartId}`);
      if (rawData) {
        const guestItems = JSON.parse(rawData);
        itemsToMerge = [...itemsToMerge, ...guestItems];
        await this.clearGuestCart(dto.guestCartId);
      }
    }

    for (const item of itemsToMerge) {
      try {
        await this.addItem(userId, { variantId: item.variantId, quantity: item.quantity });
      } catch {
        // Continue merging other items if one fails stock check
      }
    }

    return this.getOrCreateCart(userId);
  }

  // =========================================================================
  // PRICE & DISCOUNT RECALCULATION ENGINE (NEVER TRUST FRONTEND DATA)
  // =========================================================================

  private async formatCartWithCalculations(cart: any, couponCode?: string) {
    let subtotal = 0;
    let totalItems = 0;

    const items = (cart.items || []).map((item: any) => {
      // Recalculate price directly from DB decimal
      const price = Number(item.variant.price);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: Number(itemTotal.toFixed(2)),
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          title: item.variant.title,
          price,
          stockQuantity: item.variant.stockQuantity,
          availableStock: Math.max(0, item.variant.stockQuantity - (item.variant.reservedStock || 0)),
          attributes: item.variant.attributes,
          product: {
            id: item.variant.product.id,
            title: item.variant.product.title,
            slug: item.variant.product.slug,
            images: item.variant.product.images,
          },
        },
      };
    });

    return this.formatCalculations(items, cart, subtotal, totalItems, couponCode);
  }

  private async formatCalculations(
    formattedItems: any[],
    rawCart: any,
    subtotal: number,
    totalItems: number,
    couponCode?: string,
  ) {
    let discountAmount = 0;
    let couponDetails = null;

    let isFreeShipping = false;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          deletedAt: null,
        },
      });

      if (coupon) {
        if (!coupon.minOrderValue || subtotal >= Number(coupon.minOrderValue)) {
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
            if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
              discountAmount = Number(coupon.maxDiscount);
            }
          } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
            discountAmount = Math.min(subtotal, Number(coupon.discountValue));
          } else if (coupon.discountType === DiscountType.FREE_SHIPPING) {
            isFreeShipping = true;
          }

          couponDetails = {
            code: coupon.code,
            type: coupon.discountType,
            value: Number(coupon.discountValue),
            discountAmount: Number(discountAmount.toFixed(2)),
          };
        }
      }
    }

    // Estimated Shipping ($10 if subtotal < $100, Free if >= $100 or coupon is FREE_SHIPPING)
    const shippingAmount = subtotal === 0 || subtotal >= 100 || isFreeShipping ? 0 : 10.0;

    // Estimated Tax (8%)
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const estimatedTax = Number((taxableAmount * 0.08).toFixed(2));

    // Final Grand Total
    const grandTotal = Number((taxableAmount + shippingAmount + estimatedTax).toFixed(2));

    return {
      id: rawCart?.id || 'guest',
      userId: rawCart?.userId || null,
      items: formattedItems,
      totalItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      shippingAmount: Number(shippingAmount.toFixed(2)),
      estimatedTax,
      totalAmount: grandTotal,
      coupon: couponDetails,
    };
  }
}
