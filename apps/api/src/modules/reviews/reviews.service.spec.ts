import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ReviewsService - Verified Reviews & Rating Aggregation', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-1',
    title: '4K Ultra Gaming Monitor',
    slug: '4k-ultra-gaming-monitor',
    avgRating: 4.5,
    reviewCount: 2,
    variants: [{ id: 'var-1' }],
  };

  const mockReview = {
    id: 'rev-1',
    productId: 'prod-1',
    userId: 'user-1',
    rating: 5,
    title: 'Flawless display!',
    comment: 'Colors are vivid and 144Hz feels butter smooth.',
    isVerifiedPurchase: true,
    isApproved: true,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    orderItem: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create review', () => {
    it('should create review with verified purchase badge and update product avg rating', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.orderItem.count.mockResolvedValue(1); // has delivered order
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 5.0 },
        _count: { rating: 1 },
      });

      const result = await service.create('user-1', {
        productId: 'prod-1',
        rating: 5,
        title: 'Flawless display!',
        comment: 'Colors are vivid and 144Hz feels butter smooth.',
      });

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            userId: 'user-1',
            rating: 5,
            isVerifiedPurchase: true,
          }),
        }),
      );
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { avgRating: 5.0, reviewCount: 1 },
      });
      expect(result.isVerifiedPurchase).toBe(true);
    });

    it('should prevent duplicate reviews by the same user on the same product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview); // Already reviewed

      await expect(
        service.create('user-1', {
          productId: 'prod-1',
          rating: 4,
          comment: 'Another review attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update review', () => {
    it('should update review when requested by author and recalculate ratings', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        rating: 4,
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.0 },
        _count: { rating: 1 },
      });

      const result = await service.update('rev-1', 'user-1', { rating: 4 });

      expect(prisma.review.update).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalled();
      expect(result.rating).toBe(4);
    });

    it('should reject update if user is not author', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.update('rev-1', 'other-user', { rating: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('admin moderation toggleHide', () => {
    it('should hide inappropriate review and exclude from aggregates', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        isHidden: true,
      });
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });

      const result = await service.toggleHide('rev-1');

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: { isHidden: true },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { avgRating: 0.0, reviewCount: 0 },
      });
      expect(result.isHidden).toBe(true);
    });
  });
});
