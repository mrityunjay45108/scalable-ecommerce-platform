import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingService } from '../shipping/shipping.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentProvider, OrderStatus, PaymentStatus } from '@ecommerce/types';

describe('OrdersService - Complete Order Lifecycle & Snapshot Integrity', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let couponsService: CouponsService;

  const mockAddress = {
    id: 'addr-1',
    userId: 'user-1',
    recipientName: 'Alex Smith',
    phone: '+15559876543',
    street: '789 High Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  };

  const mockCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [
      {
        id: 'ci-1',
        variantId: 'var-1',
        quantity: 2,
        variant: {
          id: 'var-1',
          title: 'Space Gray / 256GB',
          sku: 'SKU-SPACEGRAY-256',
          price: 150.0,
          stockQuantity: 10,
          reservedStock: 2,
          product: {
            id: 'prod-1',
            title: '4K Ultra Gaming Monitor',
            slug: '4k-ultra-gaming-monitor',
            images: [{ url: 'https://image.jpg' }],
          },
        },
      },
    ],
  };

  const mockOrder = {
    id: 'ord-123',
    orderNumber: 'ORD-2026-123456',
    userId: 'user-1',
    addressId: 'addr-1',
    subtotal: 300.0,
    tax: 24.0,
    shippingCost: 0.0,
    discountAmount: 0.0,
    totalAmount: 324.0,
    status: OrderStatus.PENDING_PAYMENT,
    shippingAddress: mockAddress,
    items: [
      {
        id: 'oi-1',
        orderId: 'ord-123',
        variantId: 'var-1',
        quantity: 2,
        unitPrice: 150.0,
        totalPrice: 300.0,
        productTitle: '4K Ultra Gaming Monitor',
        variantTitle: 'Space Gray / 256GB',
        sku: 'SKU-SPACEGRAY-256',
        imageUrl: 'https://image.jpg',
      },
    ],
    payment: {
      id: 'pay-1',
      orderId: 'ord-123',
      provider: PaymentProvider.STRIPE,
      amount: 324.0,
      currency: 'USD',
      status: PaymentStatus.PENDING,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    cart: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cartItem: { deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
  };

  const mockInventoryService = {
    reserveStock: jest.fn(),
    commitStock: jest.fn(),
    releaseStock: jest.fn(),
  };

  const mockCouponsService = {
    validateAndCalculate: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockShippingService = {
    checkServiceability: jest.fn().mockResolvedValue({ serviceable: true }),
    getPricingQuote: jest.fn().mockResolvedValue({ shippingCost: 0 }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'shipping.provider') return 'STANDARD_EXPRESS';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ShippingService, useValue: mockShippingService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryService = module.get<InventoryService>(InventoryService);
    couponsService = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Order Creation with Snapshot Data', () => {
    it('should create order in transaction and snapshot product name, SKU, variant title, and image', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.checkout('user-1', {
        addressId: 'addr-1',
        paymentProvider: PaymentProvider.STRIPE,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(inventoryService.reserveStock).toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            totalAmount: 324.0,
            items: {
              create: [
                expect.objectContaining({
                  productTitle: '4K Ultra Gaming Monitor',
                  variantTitle: 'Space Gray / 256GB',
                  sku: 'SKU-SPACEGRAY-256',
                  imageUrl: 'https://image.jpg',
                  unitPrice: 150.0,
                  totalPrice: 300.0,
                }),
              ],
            },
          }),
        }),
      );
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(result.id).toBe('ord-123');
      expect(result.items[0].productTitle).toBe('4K Ultra Gaming Monitor');
    });
  });

  describe('findUserOrders & findOrderById', () => {
    it('should return user orders list with formatted snapshot totals', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findUserOrders('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].totalAmount).toBe(324.0);
      expect(result.data[0].items[0].variantTitle).toBe('Space Gray / 256GB');
    });

    it('should return order details with timeline tracking steps', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOrderById('ord-123', 'user-1');

      expect(result.id).toBe('ord-123');
      expect(result.tracking).toBeDefined();
      expect(result.tracking.steps).toHaveLength(5);
      expect(result.tracking.steps[0].completed).toBe(true);
    });
  });

  describe('updateOrderStatus (Admin Lifecycle)', () => {
    it('should update status to SHIPPED with tracking number and log audit event', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.READY_TO_SHIP,
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRK-USPS-123456',
      });

      const result = await service.updateOrderStatus(
        'ord-123',
        { status: OrderStatus.SHIPPED, trackingNumber: 'TRK-USPS-123456' },
        'admin-1',
      );

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-123' },
        data: expect.objectContaining({
          status: OrderStatus.SHIPPED,
          trackingNumber: 'TRK-USPS-123456',
        }),
        include: expect.any(Object),
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('cancelOrder (Lifecycle & Stock Release)', () => {
    it('should cancel eligible pending order and release reserved stock', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelOrder('ord-123', 'user-1');

      expect(inventoryService.releaseStock).toHaveBeenCalledWith(
        mockOrder.orderNumber,
        [{ variantId: 'var-1', quantity: 2 }],
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-123' },
        data: { status: OrderStatus.CANCELLED },
        include: expect.any(Object),
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should reject cancellation if order is already SHIPPED or DELIVERED', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });

      await expect(service.cancelOrder('ord-123', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
