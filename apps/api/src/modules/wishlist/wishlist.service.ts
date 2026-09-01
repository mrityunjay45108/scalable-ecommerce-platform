import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { MoveToCartDto } from './wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  async getWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
                variants: { where: { deletedAt: null } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  images: true,
                  variants: { where: { deletedAt: null } },
                },
              },
            },
          },
        },
      });
    }

    return {
      id: wishlist.id,
      userId: wishlist.userId,
      items: wishlist.items
        .filter((item) => item.product && !item.product.deletedAt)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          product: {
            ...item.product,
            basePrice: Number(item.product.basePrice),
            comparePrice: item.product.comparePrice ? Number(item.product.comparePrice) : null,
            avgRating: Number(item.product.avgRating),
            inStock: item.product.variants.some((v) => v.stockQuantity > (v.reservedStock || 0)),
          },
          createdAt: item.createdAt,
        })),
    };
  }

  async toggleWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    let wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({ data: { userId } });
    }

    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      await this.prisma.wishlistItem.delete({ where: { id: existingItem.id } });
      return { added: false, message: 'Removed from wishlist' };
    } else {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
      return { added: true, message: 'Added to wishlist' };
    }
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    let wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({ data: { userId } });
    }

    // Prevent duplicate: check or upsert
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!existing) {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
    }

    return this.getWishlist(userId);
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      const item = await this.prisma.wishlistItem.findFirst({
        where: {
          wishlistId: wishlist.id,
          OR: [{ productId }, { id: productId }],
        },
      });

      if (item) {
        await this.prisma.wishlistItem.delete({ where: { id: item.id } });
      }
    }

    return this.getWishlist(userId);
  }

  async moveToCart(userId: string, productId: string, dto?: MoveToCartDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.variants || product.variants.length === 0) {
      throw new BadRequestException('No variants available for this product');
    }

    // Determine which variant to add: specified variantId, or first in-stock variant
    let selectedVariant = dto?.variantId
      ? product.variants.find((v) => v.id === dto.variantId)
      : product.variants.find((v) => v.stockQuantity > (v.reservedStock || 0)) || product.variants[0];

    if (!selectedVariant) {
      throw new BadRequestException('Selected variant not found or unavailable');
    }

    const quantity = dto?.quantity || 1;

    // 1. Add to cart using CartService (validates inventory & recalculates totals)
    await this.cartService.addItem(userId, {
      variantId: selectedVariant.id,
      quantity,
    });

    // 2. Remove from wishlist
    await this.removeFromWishlist(userId, productId);

    return {
      message: `"${product.title}" moved to cart`,
      productId,
      variantId: selectedVariant.id,
    };
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      await this.prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });
    }
    return { message: 'Wishlist cleared successfully' };
  }
}
