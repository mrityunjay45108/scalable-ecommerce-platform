import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeFilter } from './analytics.dto';

describe('AnalyticsService - E-Commerce Analytics Engine', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    productVariant: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardMetrics', () => {
    it('should aggregate revenue, AOV, top products, cohorts, and order statuses for 30 days', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(50) // totalOrders in range
        .mockResolvedValueOnce(5); // pendingOrdersCount
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // totalCustomers
        .mockResolvedValueOnce(20); // newCustomersCount
      mockPrismaService.product.count.mockResolvedValue(40);
      mockPrismaService.productVariant.count.mockResolvedValue(3); // low stock
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 5000 },
      });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.groupBy
        .mockResolvedValueOnce([
          { status: 'DELIVERED', _count: { status: 30 } },
          { status: 'PROCESSING', _count: { status: 15 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { userId: 3 } },
          { userId: 'u2', _count: { userId: 2 } },
        ]); // returning customers
      mockPrismaService.orderItem.groupBy.mockResolvedValue([
        { variantId: 'v1', _sum: { quantity: 10, totalPrice: 1500 } },
      ]);
      mockPrismaService.productVariant.findUnique.mockResolvedValue({
        id: 'v1',
        product: {
          id: 'p1',
          title: 'Premium Wireless Headphones',
          slug: 'premium-wireless-headphones',
          category: { name: 'Audio' },
        },
      });

      const result = await service.getDashboardMetrics({ range: DateRangeFilter.DAYS_30 });

      expect(result.totalRevenue).toBe(5000);
      expect(result.totalOrders).toBe(50);
      expect(result.averageOrderValue).toBe(100); // 5000 / 50
      expect(result.newCustomersCount).toBe(20);
      expect(result.returningCustomersCount).toBe(2);
      expect(result.topSellingProducts).toHaveLength(1);
      expect(result.topSellingProducts[0].title).toBe('Premium Wireless Headphones');
      expect(result.topCategories[0].name).toBe('Audio');
      expect(result.orderStatusDistribution['DELIVERED']).toBe(30);
    });

    it('should correctly handle custom date ranges and avoid division by zero', async () => {
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.productVariant.count.mockResolvedValue(0);
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.groupBy.mockResolvedValue([]);
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getDashboardMetrics({
        range: DateRangeFilter.CUSTOM,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.topSellingProducts).toHaveLength(0);
    });
  });
});
