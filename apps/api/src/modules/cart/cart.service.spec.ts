import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@ecommerce/database';

describe('CartService - Calculations & Security', () => {
  let service: CartService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockVariant1 = {
    id: 'var-1',
    sku: 'PROD-A',
    title: 'Model A',
    price: 50.0,
    stockQuantity: 10,
    reservedStock: 2, // available = 8
    attributes: {},
    product: {
      id: 'prod-1',
      title: 'Premium Keyboard',
      slug: 'premium-keyboard',
      images: [],
    },
  };

  const mockVariant2 = {
    id: 'var-2',
    sku: 'PROD-B',
    title: 'Model B',
    price: 150.0,
    stockQuantity: 5,
    reservedStock: 0, // available = 5
    attributes: {},
    product: {
      id: 'prod-2',
      title: 'Gaming Monitor',
      slug: 'gaming-monitor',
      images: [],
    },
  };

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    coupon: {
      findFirst: jest.fn(),
    },
    couponUsage: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Price & Total Recalculation', () => {
    it('should always compute subtotal, shipping, tax, and grand total from database values', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            variantId: 'var-1',
            quantity: 20, // 20 * $50 = $1000
            variant: mockVariant1,
          },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getOrCreateCart('user-1');

      expect(result.subtotal).toBe(1000.0);
      expect(result.totalItems).toBe(20);
      expect(result.discountAmount).toBe(0);
      // Free shipping for subtotal >= 999
      expect(result.shippingAmount).toBe(0);
      // Inclusive 18% GST: 1000 - 1000/1.18 = 152.54
      expect(result.estimatedTax).toBe(152.54);
      // 1000 + 0 = 1000.00
      expect(result.totalAmount).toBe(1000.0);
    });

    it('should charge 99 shipping for subtotal under 999', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            variantId: 'var-1',
            quantity: 1, // 1 * $50 = $50
            variant: mockVariant1,
          },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getOrCreateCart('user-1');

      expect(result.subtotal).toBe(50.0);
      expect(result.shippingAmount).toBe(99.0);
      // Inclusive 18% GST: 50 - 50/1.18 = 7.63
      expect(result.estimatedTax).toBe(7.63);
      // 50 + 99 = 149.00
      expect(result.totalAmount).toBe(149.0);
    });
  });

  describe('Coupon Discounts Calculation', () => {
    it('should correctly calculate percentage discount with maximum cap', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            variantId: 'var-2',
            quantity: 2, // 2 * $150 = $300
            variant: mockVariant2,
          },
        ],
      };

      const mockCoupon = {
        id: 'cpn-1',
        code: 'SAVE20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20% of 300 = $60
        maxDiscount: 40, // capped at $40
        minOrderValue: 100,
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockRedisService.get.mockResolvedValue('SAVE20');
      mockPrismaService.coupon.findFirst.mockResolvedValue(mockCoupon);

      const result = await service.getOrCreateCart('user-1', 'SAVE20');

      expect(result.subtotal).toBe(300.0);
      expect(result.discountAmount).toBe(40.0); // Capped at $40
      expect(result.coupon?.code).toBe('SAVE20');
      // Taxable = 300 - 40 = 260. Shipping = 99 (< 999). Tax (inclusive 18%) = 39.66. Total = 359.00
      expect(result.estimatedTax).toBe(39.66);
      expect(result.totalAmount).toBe(359.0);
    });

    it('should correctly calculate fixed amount discount', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            variantId: 'var-1',
            quantity: 2, // 2 * $50 = $100
            variant: mockVariant1,
          },
        ],
      };

      const mockCoupon = {
        id: 'cpn-2',
        code: 'FLAT25',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25,
        minOrderValue: 50,
        usageLimit: 50,
        usedCount: 2,
        isActive: true,
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.coupon.findFirst.mockResolvedValue(mockCoupon);

      const result = await service.getOrCreateCart('user-1', 'FLAT25');

      expect(result.discountAmount).toBe(25.0);
      // Taxable = 100 - 25 = 75. Shipping = 99 (< 999). Tax (inclusive 18%) = 11.44. Total = 174.00
      expect(result.estimatedTax).toBe(11.44);
      expect(result.totalAmount).toBe(174.0);
    });
  });

  describe('Inventory Validation & Stock Enforcement', () => {
    it('should throw BadRequestException if adding quantity exceeds available stock', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValue(mockVariant1); // stock=10, reserved=2 => available=8

      await expect(
        service.addItem('user-1', { variantId: 'var-1', quantity: 12 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      mockPrismaService.productVariant.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem('user-1', { variantId: 'non-existent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return warnings when validating cart with insufficient stock', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            variantId: 'var-1',
            quantity: 10, // requested 10, but only 8 available
            variant: mockVariant1,
          },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.validateInventory('user-1');

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].availableStock).toBe(8);
      expect(result.warnings[0].requestedQuantity).toBe(10);
    });
  });
});
