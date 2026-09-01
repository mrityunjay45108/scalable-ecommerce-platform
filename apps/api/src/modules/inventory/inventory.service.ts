import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  AdjustStockDto,
  UpdateInventoryDto,
  ReserveStockItem,
  InventoryQueryDto,
  InventoryLogQueryDto,
  InventoryStatusFilter,
} from './inventory.dto';
import { InventoryLogType } from '@ecommerce/database';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // =========================================================================
  // 1. CONCURRENCY-SAFE ATOMIC STOCK RESERVATION
  // =========================================================================

  async reserveStock(orderNumber: string, items: ReserveStockItem[], ttlSeconds = 900): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        // Fetch current variant record inside transaction
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: { select: { title: true } } },
        });

        if (!variant) {
          throw new NotFoundException(`Product variant not found: ${item.variantId}`);
        }

        const available = variant.stockQuantity - variant.reservedStock;
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for '${variant.product?.title || variant.title}'. Requested: ${item.quantity}, Available: ${Math.max(0, available)}`,
          );
        }

        // Atomic reservation increment
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            reservedStock: { increment: item.quantity },
          },
        });

        // Record audit log
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            previousStock: variant.stockQuantity,
            newStock: variant.stockQuantity,
            change: item.quantity,
            type: InventoryLogType.RESERVATION,
            orderNumber,
            reason: `Order ${orderNumber} checkout reservation`,
          },
        });
      }

      // Store in Redis with TTL for fallback expiration
      await this.redisService.set(
        `stock_reservation:${orderNumber}`,
        JSON.stringify(items),
        ttlSeconds,
      );

      this.logger.log(`Successfully reserved stock for order ${orderNumber}`);
      return true;
    });
  }

  // =========================================================================
  // 2. COMMIT STOCK (UPON SUCCESSFUL PAYMENT)
  // =========================================================================

  async commitStock(orderNumber: string, items: ReserveStockItem[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (variant) {
          const previousStock = variant.stockQuantity;
          const newStock = Math.max(0, variant.stockQuantity - item.quantity);

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQuantity: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          });

          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              previousStock,
              newStock,
              change: -item.quantity,
              type: InventoryLogType.COMMIT,
              orderNumber,
              reason: `Payment confirmed for order ${orderNumber}`,
            },
          });
        }
      }
    });

    await this.redisService.del(`stock_reservation:${orderNumber}`);
    this.logger.log(`Committed stock for order ${orderNumber}`);
  }

  // =========================================================================
  // 3. RELEASE STOCK (ON ORDER CANCELLATION / TIMEOUT)
  // =========================================================================

  async releaseStock(orderNumber: string, items: ReserveStockItem[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (variant) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              reservedStock: { decrement: Math.min(variant.reservedStock, item.quantity) },
            },
          });

          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              previousStock: variant.stockQuantity,
              newStock: variant.stockQuantity,
              change: item.quantity,
              type: InventoryLogType.RELEASE,
              orderNumber,
              reason: `Order ${orderNumber} cancelled or timed out`,
            },
          });
        }
      }
    });

    await this.redisService.del(`stock_reservation:${orderNumber}`);
    this.logger.log(`Released reserved stock for order ${orderNumber}`);
  }

  // =========================================================================
  // 4. STOCK ADJUSTMENT & UPDATE
  // =========================================================================

  async adjustStock(dto: AdjustStockDto, adminUserId?: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const previousStock = variant.stockQuantity;
    const newStock = previousStock + dto.quantityChange;
    if (newStock < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: dto.variantId },
        data: { stockQuantity: newStock },
        include: { product: true },
      });

      await tx.inventoryLog.create({
        data: {
          variantId: dto.variantId,
          previousStock,
          newStock,
          change: dto.quantityChange,
          type: dto.quantityChange > 0 ? InventoryLogType.RESTOCK : InventoryLogType.ADJUSTMENT,
          reason: dto.reason || (dto.quantityChange > 0 ? 'Restocked inventory' : 'Manual stock adjustment'),
          adminUserId,
        },
      });

      return {
        variantId: updated.id,
        sku: updated.sku,
        title: updated.title,
        productTitle: updated.product.title,
        stockQuantity: updated.stockQuantity,
        reservedStock: updated.reservedStock,
        availableStock: Math.max(0, updated.stockQuantity - updated.reservedStock),
      };
    });
  }

  async updateInventory(dto: UpdateInventoryDto, adminUserId?: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const previousStock = variant.stockQuantity;
    const change = dto.stockQuantity - previousStock;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: dto.variantId },
        data: { stockQuantity: dto.stockQuantity },
        include: { product: true },
      });

      await tx.inventoryLog.create({
        data: {
          variantId: dto.variantId,
          previousStock,
          newStock: dto.stockQuantity,
          change,
          type: InventoryLogType.ADJUSTMENT,
          reason: dto.reason || 'Admin inventory quantity override',
          adminUserId,
        },
      });

      return {
        variantId: updated.id,
        sku: updated.sku,
        title: updated.title,
        productTitle: updated.product.title,
        stockQuantity: updated.stockQuantity,
        reservedStock: updated.reservedStock,
        availableStock: Math.max(0, updated.stockQuantity - updated.reservedStock),
      };
    });
  }

  // =========================================================================
  // 5. ADMIN INVENTORY LISTING & LOW-STOCK ALERTS
  // =========================================================================

  async getInventory(query: InventoryQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { product: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === InventoryStatusFilter.OUT_OF_STOCK) {
      where.stockQuantity = { lte: 0 };
    } else if (status === InventoryStatusFilter.LOW_STOCK) {
      where.stockQuantity = { gt: 0, lte: 10 };
    }

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stockQuantity: 'asc' }, { createdAt: 'desc' }],
        include: {
          product: {
            select: { id: true, title: true, slug: true, images: true, category: { select: { name: true } } },
          },
        },
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    const formatted = variants.map((v) => {
      const availableStock = Math.max(0, v.stockQuantity - v.reservedStock);
      const isOutOfStock = v.stockQuantity <= 0;
      const isLowStock = !isOutOfStock && v.stockQuantity <= 10;

      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        price: Number(v.price),
        stockQuantity: v.stockQuantity,
        reservedStock: v.reservedStock,
        availableStock,
        isLowStock,
        isOutOfStock,
        lowStockThreshold: 10,
        product: {
          id: v.product.id,
          title: v.product.title,
          slug: v.product.slug,
          categoryName: v.product.category?.name,
          image: v.product.images?.[0]?.url,
        },
        updatedAt: v.updatedAt,
      };
    });

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStockVariants(threshold = 10) {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        stockQuantity: { lte: threshold },
      },
      include: {
        product: {
          select: { id: true, title: true, slug: true, images: true },
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    return variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price: Number(v.price),
      stockQuantity: v.stockQuantity,
      reservedStock: v.reservedStock,
      availableStock: Math.max(0, v.stockQuantity - v.reservedStock),
      product: {
        id: v.product.id,
        title: v.product.title,
        slug: v.product.slug,
        image: v.product.images?.[0]?.url,
      },
    }));
  }

  // =========================================================================
  // 6. INVENTORY AUDIT HISTORY
  // =========================================================================

  async getInventoryLogs(query: InventoryLogQueryDto) {
    const { page = 1, limit = 20, variantId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (variantId) where.variantId = variantId;

    const [logs, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
