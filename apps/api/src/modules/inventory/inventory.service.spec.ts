import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryLogType } from '@ecommerce/database';

describe('InventoryService - Concurrency Safety & Stock Reservation', () => {
  let service: InventoryService;
  let prisma: PrismaService;
  let redisService: RedisService;

  const mockVariant = {
    id: 'var-10',
    productId: 'prod-1',
    sku: 'SKU-TEST-100',
    title: 'Size L / Blue',
    price: 99.99,
    stockQuantity: 10,
    reservedStock: 2, // 8 available
    product: {
      id: 'prod-1',
      title: 'Performance Athletic Hoodie',
      slug: 'performance-athletic-hoodie',
      images: [{ url: 'https://img.jpg' }],
    },
  };

  const mockPrismaService = {
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveStock (Concurrency-Safe Stock Reservation)', () => {
    it('should successfully reserve stock when sufficient available units exist', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      const result = await service.reserveStock('ORD-2026-001', [
        { variantId: 'var-10', quantity: 5 },
      ]);

      expect(result).toBe(true);
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-10' },
        data: { reservedStock: { increment: 5 } },
      });
      expect(prisma.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantId: 'var-10',
          change: 5,
          type: InventoryLogType.RESERVATION,
          orderNumber: 'ORD-2026-001',
        }),
      });
      expect(redisService.set).toHaveBeenCalledWith(
        'stock_reservation:ORD-2026-001',
        expect.any(String),
        900,
      );
    });

    it('should throw BadRequestException and prevent overselling under high concurrency', async () => {
      // 10 stock, 8 reserved -> only 2 available
      mockPrismaService.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        stockQuantity: 10,
        reservedStock: 8,
      });

      // Requesting 3 when only 2 available
      await expect(
        service.reserveStock('ORD-2026-002', [
          { variantId: 'var-10', quantity: 3 },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.productVariant.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.reserveStock('ORD-2026-003', [
          { variantId: 'non-existent', quantity: 1 },
        ]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('commitStock & releaseStock', () => {
    it('should decrement stock and reservedStock on commit and delete Redis reservation', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      await service.commitStock('ORD-2026-001', [
        { variantId: 'var-10', quantity: 2 },
      ]);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-10' },
        data: {
          stockQuantity: { decrement: 2 },
          reservedStock: { decrement: 2 },
        },
      });
      expect(prisma.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: InventoryLogType.COMMIT,
        }),
      });
      expect(redisService.del).toHaveBeenCalledWith('stock_reservation:ORD-2026-001');
    });

    it('should release reservedStock on order cancellation', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      await service.releaseStock('ORD-2026-001', [
        { variantId: 'var-10', quantity: 2 },
      ]);

      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-10' },
        data: {
          reservedStock: { decrement: 2 },
        },
      });
      expect(prisma.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: InventoryLogType.RELEASE,
        }),
      });
    });
  });

  describe('adjustStock (Admin Adjustments & Low-Stock Alerts)', () => {
    it('should adjust stock quantity and record audit trail', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        ...mockVariant,
        stockQuantity: 25,
      });

      const result = await service.adjustStock(
        { variantId: 'var-10', quantityChange: 15, reason: 'Shipment received' },
        'admin-user-1',
      );

      expect(result.stockQuantity).toBe(25);
      expect(prisma.inventoryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousStock: 10,
          newStock: 25,
          change: 15,
          type: InventoryLogType.RESTOCK,
          adminUserId: 'admin-user-1',
        }),
      });
    });

    it('should throw BadRequestException if adjustment results in negative stock', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);

      await expect(
        service.adjustStock({ variantId: 'var-10', quantityChange: -20 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should retrieve low-stock variants below threshold', async () => {
      mockPrismaService.productVariant.findMany.mockResolvedValue([mockVariant]);

      const result = await service.getLowStockVariants(10);

      expect(result).toHaveLength(1);
      expect(result[0].availableStock).toBe(8);
    });
  });
});
