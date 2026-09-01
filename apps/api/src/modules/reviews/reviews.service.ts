import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, AdminReviewQueryDto } from './reviews.dto';
import { OrderStatus } from '@ecommerce/types';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // 1. PUBLIC PRODUCT REVIEWS LISTING
  // =========================================================================

  async findByProduct(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total, ratingDistribution] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true, isHidden: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.review.count({ where: { productId, isApproved: true, isHidden: false } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId, isApproved: true, isHidden: false },
        _count: { rating: true },
      }),
    ]);

    return {
      data: reviews,
      distribution: ratingDistribution.reduce((acc, curr) => {
        acc[curr.rating] = curr._count.rating;
        return acc;
      }, {} as Record<number, number>),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 2. CREATE REVIEW (VERIFIED PURCHASE & DUPLICATE PROTECTION)
  // =========================================================================

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: { select: { id: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product
    const existing = await this.prisma.review.findUnique({
      where: {
        productId_userId: {
          productId: dto.productId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already submitted a review for this product. You can edit your existing review.');
    }

    // Check verified purchase (User must have an order with this product in PAID, PROCESSING, SHIPPED, or DELIVERED status)
    const variantIds = product.variants.map((v) => v.id);
    const purchaseCount = await this.prisma.orderItem.count({
      where: {
        variantId: { in: variantIds },
        order: {
          userId,
          status: {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.SHIPPED,
              OrderStatus.PROCESSING,
              OrderStatus.PAID,
            ],
          },
        },
      },
    });

    const isVerifiedPurchase = purchaseCount > 0;

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerifiedPurchase,
        isApproved: true,
        isHidden: false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Update product rating aggregate
    await this.updateProductStats(dto.productId);

    return review;
  }

  // =========================================================================
  // 3. EDIT & DELETE REVIEWS
  // =========================================================================

  async update(reviewId: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    if (review.userId !== userId) {
      throw new ForbiddenException('You are not authorized to edit this review');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating && { rating: dto.rating }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.comment && { comment: dto.comment }),
      },
    });

    await this.updateProductStats(review.productId);
    return updated;
  }

  async delete(reviewId: string, userId: string, isAdmin = false) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this review');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.updateProductStats(review.productId);

    return { message: 'Review deleted successfully' };
  }

  // =========================================================================
  // 4. ADMIN MODERATION
  // =========================================================================

  async findAllAdmin(query: AdminReviewQueryDto) {
    const { page = 1, limit = 20, productId, isHidden } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (isHidden !== undefined) where.isHidden = isHidden;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleHide(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: !review.isHidden },
    });

    await this.updateProductStats(review.productId);
    return updated;
  }

  // =========================================================================
  // 5. STATS AGGREGATION
  // =========================================================================

  private async updateProductStats(productId: string) {
    const aggregations = await this.prisma.review.aggregate({
      where: { productId, isApproved: true, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: aggregations._avg.rating || 0.0,
        reviewCount: aggregations._count.rating || 0,
      },
    });
  }
}
