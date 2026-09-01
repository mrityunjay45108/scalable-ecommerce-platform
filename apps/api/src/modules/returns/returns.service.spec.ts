import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingProviderFactory } from '../shipping/providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from '../shipping/providers/standard-express.provider';
import { MockShippingProvider } from '../shipping/providers/mock-shipping.provider';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrderStatus,
  ReturnStatus,
  ReturnReason,
  ReturnAction,
  QualityCheckResult,
  Role,
} from '@ecommerce/types';

describe('ReturnsService - Complete Returns & Reverse Pickup Logistics', () => {
  let service: ReturnsService;
  let prisma: PrismaService;
  let redis: RedisService;
  let providerFactory: ShippingProviderFactory;
  let configService: ConfigService;

  const mockOrder = {
    id: 'ord-ret-100',
    orderNumber: 'ORD-2026-RET100',
    userId: 'user-1',
    status: OrderStatus.DELIVERED,
    totalAmount: 1999.0,
    shippingAddress: {
      recipientName: 'Kavita Roy',
      phone: '+919876543210',
      street: 'Flat 402, Sunshine Heights',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    shipment: {
      id: 'ship-1',
      deliveredAt: new Date(Date.now() - 24 * 3600 * 1000 * 3), // Delivered 3 days ago
    },
    items: [
      {
        id: 'oi-100',
        orderId: 'ord-ret-100',
        variantId: 'var-100',
        productTitle: 'Pro Running Shoes',
        quantity: 2,
        unitPrice: 1999.0,
      },
    ],
    returnRequests: [],
  };

  const mockReturnRequest = {
    id: 'ret-100',
    returnNumber: 'RET-2026-9021',
    orderId: 'ord-ret-100',
    userId: 'user-1',
    status: ReturnStatus.REQUESTED,
    reason: ReturnReason.SIZE_ISSUE,
    action: ReturnAction.REFUND,
    customerNote: 'Shoe size is too small',
    pickupAwb: 'RET-AWB-9021',
    bankDetails: {
      accountHolder: 'Kavita Roy',
      accountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
      upiId: 'kavita@okhdfcbank',
      cvv: '123', // forbidden property to verify stripping
    },
    items: [
      {
        id: 'ri-100',
        returnRequestId: 'ret-100',
        orderItemId: 'oi-100',
        quantity: 1,
        restocked: false,
        orderItem: {
          id: 'oi-100',
          variantId: 'var-100',
          productTitle: 'Pro Running Shoes',
          quantity: 2,
        },
      },
    ],
    order: mockOrder,
  };

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    returnRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    returnItem: {
      update: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) =>
      typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb),
    ),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn() as jest.Mock<any, [string]>,
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'returns.windowDays') return 14;
      if (key === 'shipping.provider') return 'STANDARD_EXPRESS';
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        ShippingProviderFactory,
        StandardExpressShippingProvider,
        MockShippingProvider,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    providerFactory = module.get<ShippingProviderFactory>(ShippingProviderFactory);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  describe('1. Return Creation & Eligibility Validation', () => {
    it('should create return request for eligible delivered order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.returnRequest.create.mockResolvedValue(mockReturnRequest);

      const result = await service.createReturnRequest('user-1', {
        orderId: 'ord-ret-100',
        reason: ReturnReason.SIZE_ISSUE,
        action: ReturnAction.REFUND,
        customerNote: 'Shoe size is too small',
        items: [{ orderItemId: 'oi-100', quantity: 1 }],
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.returnRequest.create).toHaveBeenCalled();
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-ret-100' },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should respect configurable RETURN_WINDOW_DAYS from ConfigService', async () => {
      // Configure 7 days window
      mockConfigService.get.mockImplementation((k: string) => (k === 'returns.windowDays' ? 7 : null));

      // Delivered 10 days ago (expired under 7 days window)
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        shipment: { deliveredAt: new Date(Date.now() - 10 * 24 * 3600 * 1000) },
      });

      await expect(
        service.createReturnRequest('user-1', {
          orderId: 'ord-ret-100',
          reason: ReturnReason.SIZE_ISSUE,
          items: [{ orderItemId: 'oi-100', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if order is not in DELIVERED status', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });

      await expect(
        service.createReturnRequest('user-1', {
          orderId: 'ord-ret-100',
          reason: ReturnReason.DAMAGED,
          items: [{ orderItemId: 'oi-100', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject return if requested quantity exceeds purchased quantity', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.createReturnRequest('user-1', {
          orderId: 'ord-ret-100',
          reason: ReturnReason.DAMAGED,
          items: [{ orderItemId: 'oi-100', quantity: 5 }], // Purchased 2, requested 5
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate return for item with already active return', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        returnRequests: [
          {
            id: 'existing-ret',
            status: ReturnStatus.REQUESTED,
            items: [{ orderItemId: 'oi-100', quantity: 2 }],
          },
        ],
      });

      await expect(
        service.createReturnRequest('user-1', {
          orderId: 'ord-ret-100',
          reason: ReturnReason.DAMAGED,
          items: [{ orderItemId: 'oi-100', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Sensitive Bank Details Masking & Safety', () => {
    it('should mask bank account number and strip forbidden properties in responses', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue(mockReturnRequest);

      const result = await service.findReturnById('ret-100', 'user-1', Role.CUSTOMER);

      expect(result.bankDetails.accountNumber).toBe('XXXXXXXX9012');
      expect(result.bankDetails.cvv).toBeUndefined();
      expect(result.bankDetails.accountHolder).toBe('Kavita Roy');
    });
  });

  describe('3. Customer Return Cancellation', () => {
    it('should cancel active return request in REQUESTED state', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.CANCELLED,
      });

      const result = await service.cancelReturn('ret-100', 'user-1');
      expect(result.status).toBe(ReturnStatus.CANCELLED);
      expect(mockPrismaService.returnRequest.update).toHaveBeenCalled();
    });

    it('should reject cancellation if return has already been picked up or completed', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.PICKED_UP,
      });

      await expect(service.cancelReturn('ret-100', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('4. Admin Approval & Reverse Pickup Scheduling', () => {
    it('should approve return and manifest reverse pickup AWB', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.PICKUP_SCHEDULED,
      });

      const result = await service.approveReturn('ret-100', 'admin-1', {
        adminNote: 'Return approved for pickup',
      });

      expect(result.status).toBe(ReturnStatus.PICKUP_SCHEDULED);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-ret-100' },
        data: { status: OrderStatus.RETURN_APPROVED },
      });
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should retry scheduling reverse pickup if needed', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.PICKUP_SCHEDULED,
      });

      const result = await service.retryReturnPickup('ret-100', 'admin-1');
      expect(result.status).toBe(ReturnStatus.PICKUP_SCHEDULED);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('5. Admin Rejection with Justification', () => {
    it('should reject return with mandatory reason', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
      });

      const result = await service.rejectReturn('ret-100', 'admin-1', {
        rejectionReason: 'Tampered tags and used item',
      });

      expect(result.status).toBe(ReturnStatus.REJECTED);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('6. Quality Check & Restocking', () => {
    it('should pass QC, restock inventory, and advance to REFUND_PENDING', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.RECEIVED,
      });
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.REFUND_PENDING,
        qcResult: QualityCheckResult.PASSED_RESTOCKABLE,
      });

      const result = await service.performQualityCheck('ret-100', 'admin-1', {
        qcResult: QualityCheckResult.PASSED_RESTOCKABLE,
        restockItems: true,
      });

      expect(result.status).toBe(ReturnStatus.REFUND_PENDING);
      expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-100' },
        data: { stockQuantity: { increment: 1 } },
      });
      expect(mockPrismaService.returnItem.update).toHaveBeenCalled();
    });

    it('should reject return on QC fraud failure', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.RECEIVED,
      });
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
        qcResult: QualityCheckResult.FAILED_FRAUD_OR_MISMATCH,
      });

      const result = await service.performQualityCheck('ret-100', 'admin-1', {
        qcResult: QualityCheckResult.FAILED_FRAUD_OR_MISMATCH,
        qcNotes: 'Serial number does not match original unit',
      });

      expect(result.status).toBe(ReturnStatus.REJECTED);
      expect(mockPrismaService.productVariant.update).not.toHaveBeenCalled();
    });
  });

  describe('7. Reverse Logistics Webhook & Idempotency', () => {
    it('should process reverse courier webhook and update status to PICKED_UP', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.PICKED_UP,
      });

      const response = await service.handleCourierReturnWebhook(
        'STANDARD_EXPRESS',
        { 'x-shipping-signature': 'valid' },
        {
          eventId: 'EVT-RET-001',
          pickupAwb: 'RET-AWB-9021',
          status: ReturnStatus.PICKED_UP,
          location: 'Customer Doorstep',
          activity: 'Package picked up by driver',
        },
      );

      expect(response.received).toBe(true);
      expect(response.eventId).toBe('EVT-RET-001');
      expect(redis.set).toHaveBeenCalledWith('webhook_return:EVT-RET-001', '1', 604800);
    });

    it('should be idempotent and skip duplicate reverse webhook events', async () => {
      (redis.get as jest.Mock).mockResolvedValue('1'); // already cached

      const response = await service.handleCourierReturnWebhook(
        'STANDARD_EXPRESS',
        { 'x-shipping-signature': 'valid' },
        {
          eventId: 'EVT-RET-001',
          pickupAwb: 'RET-AWB-9021',
          status: ReturnStatus.PICKED_UP,
        },
      );

      expect(response.idempotent).toBe(true);
      expect(mockPrismaService.returnRequest.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('8. Replacement Dispatch', () => {
    it('should dispatch replacement and mark completed', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue({
        ...mockReturnRequest,
        action: ReturnAction.REPLACEMENT,
        status: ReturnStatus.REPLACEMENT_PENDING,
      });
      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        status: ReturnStatus.COMPLETED,
      });

      const result = await service.processReplacement('ret-100', 'admin-1', {
        trackingNumber: 'EXP-REP-9021-IN',
      });

      expect(result.status).toBe(ReturnStatus.COMPLETED);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-ret-100' },
        data: { status: OrderStatus.DELIVERED, trackingNumber: 'EXP-REP-9021-IN' },
      });
    });
  });
});
