import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@ecommerce/types';

describe('CouponsService - Validation Engine & Restrictions', () => {
  let service: CouponsService;
  let prisma: PrismaService;

  const mockCoupon = {
    id: 'coupon-1',
    code: 'SAVE20',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20.0,
    minOrderValue: 50.0,
    maxDiscount: 30.0,
    usageLimit: 100,
    perUserLimit: 1,
    usedCount: 5,
    applicableCategoryIds: [],
    applicableProductIds: [],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    isActive: true,
  };

  const mockPrismaService = {
    coupon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    couponUsage: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndCalculate', () => {
    it('should calculate percentage discount capped at maxDiscount', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      // 20% of $200 = $40, but capped at $30
      const result = await service.validateAndCalculate('user-1', {
        code: 'SAVE20',
        subtotal: 200,
      });

      expect(result.discountAmount).toBe(30.0);
      expect(result.finalTotal).toBe(170.0);
    });

    it('should reject coupon if subtotal is below minimum order value', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(
        service.validateAndCalculate('user-1', {
          code: 'SAVE20',
          subtotal: 30, // below 50 min
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon if user already reached per-user usage limit', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(1); // 1 usage already

      await expect(
        service.validateAndCalculate('user-1', {
          code: 'SAVE20',
          subtotal: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon if expired', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        endDate: new Date('2020-01-01'),
      });

      await expect(
        service.validateAndCalculate('user-1', {
          code: 'SAVE20',
          subtotal: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon if inactive or not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      });

      await expect(
        service.validateAndCalculate('user-1', {
          code: 'SAVE20',
          subtotal: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create, update, toggleStatus', () => {
    it('should create coupon with uppercase code', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.create({
        code: 'save20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        startDate: '2026-01-01',
        endDate: '2027-12-31',
      });

      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SAVE20' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if duplicate code', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(
        service.create({
          code: 'SAVE20',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          startDate: '2026-01-01',
          endDate: '2027-12-31',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should toggle coupon active state', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaService.coupon.update.mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      });

      const result = await service.toggleStatus('coupon-1');

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });
});
