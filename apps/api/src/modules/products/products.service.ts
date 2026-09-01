import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  ReorderImagesDto,
} from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, isAdmin = false) {
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      categorySlug,
      categoryId,
      minPrice,
      maxPrice,
      rating,
      inStockOnly,
      isFeatured,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (!isAdmin) {
      where.isPublished = true;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (categorySlug) {
      // Find category and its children for comprehensive category filtering
      const targetCat = await this.prisma.category.findFirst({
        where: { slug: categorySlug, deletedAt: null },
        include: { children: { where: { deletedAt: null }, select: { id: true } } },
      });
      if (targetCat) {
        const catIds = [targetCat.id, ...targetCat.children.map((c) => c.id)];
        where.categoryId = { in: catIds };
      } else {
        where.category = { slug: categorySlug, deletedAt: null };
      }
    } else if (categoryId) {
      const targetCat = await this.prisma.category.findFirst({
        where: { id: categoryId, deletedAt: null },
        include: { children: { where: { deletedAt: null }, select: { id: true } } },
      });
      if (targetCat && targetCat.children.length > 0) {
        const catIds = [targetCat.id, ...targetCat.children.map((c) => c.id)];
        where.categoryId = { in: catIds };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (search && search.trim()) {
      const queryTerm = search.trim();
      where.OR = [
        { title: { contains: queryTerm, mode: 'insensitive' } },
        { description: { contains: queryTerm, mode: 'insensitive' } },
        { category: { name: { contains: queryTerm, mode: 'insensitive' } } },
        { variants: { some: { title: { contains: queryTerm, mode: 'insensitive' }, deletedAt: null } } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }

    if (rating !== undefined) {
      where.avgRating = { gte: rating };
    }

    if (inStockOnly) {
      where.variants = {
        some: {
          stockQuantity: { gt: 0 },
          deletedAt: null,
        },
      };
    }

    const orderBy: any = {};
    if (sortBy === 'price_asc' || (sortBy === 'price' && sortOrder === 'asc')) {
      orderBy.basePrice = 'asc';
    } else if (sortBy === 'price_desc' || (sortBy === 'price' && sortOrder === 'desc')) {
      orderBy.basePrice = 'desc';
    } else if (sortBy === 'rating') {
      orderBy.avgRating = sortOrder.toLowerCase();
    } else if (sortBy === 'popularity') {
      orderBy.reviewCount = 'desc';
    } else if (sortBy === 'newest') {
      orderBy.createdAt = 'desc';
    } else if (sortBy && ['title', 'createdAt', 'basePrice', 'avgRating', 'reviewCount'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder.toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
          variants: {
            where: { deletedAt: null },
            include: { inventory: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const formattedProducts = products.map((p) => this.formatProduct(p));

    return {
      data: formattedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: {
          where: { deletedAt: null },
          include: { inventory: true },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${slug}' not found`);
    }

    return this.formatProduct(product);
  }

  async findById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: {
          where: { deletedAt: null },
          include: { inventory: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(product);
  }

  async create(dto: CreateProductDto) {
    const slug = dto.slug || this.slugify(dto.title);

    const existing = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          comparePrice: dto.comparePrice,
          isPublished: dto.isPublished ?? true,
          isFeatured: dto.isFeatured ?? false,
          images: {
            create: dto.images?.map((img, index) => ({
              url: img.url,
              publicId: img.publicId,
              altText: img.altText,
              isPrimary: img.isPrimary ?? index === 0,
              sortOrder: img.sortOrder ?? index,
            })),
          },
          variants: {
            create:
              dto.variants && dto.variants.length > 0
                ? dto.variants.map((v) => ({
                    sku: v.sku,
                    title: v.title,
                    price: v.price,
                    stockQuantity: v.stockQuantity,
                    attributes: v.attributes || {},
                    inventory: {
                      create: {
                        quantity: v.stockQuantity,
                        reserved: 0,
                        lowStockAlert: 10,
                      },
                    },
                  }))
                : [
                    {
                      sku: `${slug.toUpperCase()}-DEF`,
                      title: 'Standard',
                      price: dto.basePrice,
                      stockQuantity: 100,
                      attributes: {},
                      inventory: {
                        create: {
                          quantity: 100,
                          reserved: 0,
                          lowStockAlert: 10,
                        },
                      },
                    },
                  ],
          },
        },
        include: {
          category: true,
          images: true,
          variants: { include: { inventory: true } },
        },
      });

      return this.formatProduct(product);
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const slug = dto.slug || (dto.title ? this.slugify(dto.title) : existing.slug);

    if (slug !== existing.slug) {
      const slugConflict = await this.prisma.product.findFirst({
        where: { slug, deletedAt: null },
      });
      if (slugConflict && slugConflict.id !== id) {
        throw new ConflictException(`Product with slug '${slug}' already exists`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If variants are provided, update/sync them
      if (dto.variants && dto.variants.length > 0) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        for (const v of dto.variants) {
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              title: v.title,
              price: v.price,
              stockQuantity: v.stockQuantity,
              attributes: v.attributes || {},
              inventory: {
                create: {
                  quantity: v.stockQuantity,
                  reserved: 0,
                  lowStockAlert: 10,
                },
              },
            },
          });
        }
      }

      // If images are provided, update them
      if (dto.images && dto.images.length > 0) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: dto.images.map((img, index) => ({
            productId: id,
            url: img.url,
            publicId: img.publicId,
            altText: img.altText,
            isPrimary: img.isPrimary ?? index === 0,
            sortOrder: img.sortOrder ?? index,
          })),
        });
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          comparePrice: dto.comparePrice,
          isPublished: dto.isPublished,
          isFeatured: dto.isFeatured,
        },
        include: {
          category: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
          variants: { include: { inventory: true } },
        },
      });

      return this.formatProduct(updated);
    });
  }

  async delete(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Product deleted successfully' };
  }

  // IMAGE MANAGEMENT
  async addImage(productId: string, dto: AddProductImageDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const count = await this.prisma.productImage.count({ where: { productId } });

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        publicId: dto.publicId,
        altText: dto.altText,
        isPrimary: dto.isPrimary ?? count === 0,
        sortOrder: dto.sortOrder ?? count,
      },
    });

    return image;
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Product image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });

    // If deleted image was primary, make the first remaining image primary
    if (image.isPrimary) {
      const first = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (first) {
        await this.prisma.productImage.update({
          where: { id: first.id },
          data: { isPrimary: true },
        });
      }
    }

    return { message: 'Image deleted successfully' };
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Product image not found');

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return { message: 'Primary image set successfully' };
  }

  async reorderImages(productId: string, dto: ReorderImagesDto) {
    if (!dto.imageIds || dto.imageIds.length === 0) {
      throw new BadRequestException('imageIds array is required');
    }

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.productImage.updateMany({
          where: { id, productId },
          data: { sortOrder: index },
        }),
      ),
    );

    return { message: 'Images reordered successfully' };
  }

  private formatProduct(p: any) {
    return {
      ...p,
      basePrice: Number(p.basePrice),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      avgRating: Number(p.avgRating),
      variants: p.variants?.map((v: any) => ({
        ...v,
        price: Number(v.price),
        availableStock: Math.max(0, v.stockQuantity - (v.reservedStock || 0)),
      })),
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
