import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService - Search and Filtering', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-1',
    title: 'Sony WH-1000XM5 Wireless Headphones',
    slug: 'sony-wh-1000xm5',
    description: 'Industry leading noise canceling wireless headphones with crystal clear audio.',
    categoryId: 'cat-1',
    basePrice: 399.99,
    comparePrice: 449.99,
    isPublished: true,
    isFeatured: true,
    avgRating: 4.8,
    reviewCount: 120,
    deletedAt: null,
    category: { id: 'cat-1', name: 'Audio', slug: 'audio' },
    images: [{ id: 'img-1', url: 'https://img.jpg', isPrimary: true, sortOrder: 0 }],
    variants: [
      {
        id: 'var-1',
        sku: 'SONY-BLK',
        title: 'Black',
        price: 399.99,
        stockQuantity: 25,
        reservedStock: 0,
      },
    ],
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Keyword Search', () => {
    it('should filter by keyword search query on title, description, category, and variants', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll({ search: 'headphones' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'headphones', mode: 'insensitive' } },
              { description: { contains: 'headphones', mode: 'insensitive' } },
              { category: { name: { contains: 'headphones', mode: 'insensitive' } } },
              { variants: { some: { title: { contains: 'headphones', mode: 'insensitive' }, deletedAt: null } } },
            ],
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('Category Filtering with Subcategory Resolution', () => {
    it('should include subcategory IDs when filtering by parent category slug', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-parent',
        slug: 'electronics',
        children: [{ id: 'cat-child-1' }, { id: 'cat-child-2' }],
      });
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ categorySlug: 'electronics' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ['cat-parent', 'cat-child-1', 'cat-child-2'] },
          }),
        }),
      );
    });
  });

  describe('Price and Rating Filtering', () => {
    it('should filter by minPrice, maxPrice, and minimum rating', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ minPrice: 100, maxPrice: 500, rating: 4 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: { gte: 100, lte: 500 },
            avgRating: { gte: 4 },
          }),
        }),
      );
    });
  });

  describe('Availability (In Stock Only) Filtering', () => {
    it('should filter by inStockOnly with positive variant quantity', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ inStockOnly: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variants: {
              some: { stockQuantity: { gt: 0 }, deletedAt: null },
            },
          }),
        }),
      );
    });
  });

  describe('Sorting Options', () => {
    it('should sort by price ascending', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ sortBy: 'price_asc' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { basePrice: 'asc' },
        }),
      );
    });

    it('should sort by popularity (reviewCount desc)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ sortBy: 'popularity' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { reviewCount: 'desc' },
        }),
      );
    });

    it('should sort by highest rating', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      await service.findAll({ sortBy: 'rating' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { avgRating: 'desc' },
        }),
      );
    });
  });

  describe('Pagination', () => {
    it('should apply skip/take and return correct pagination meta', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
    });
  });
});
