import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  CODStatus,
} from '@ecommerce/types';

describe('PaymentsService - Payment Architecture & COD System', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let redisService: RedisService;
  let razorpayProvider: RazorpayProvider;

  const mockOrder = {
    id: 'ord-100',
    orderNumber: 'ORD-2026-999999',
    userId: 'user-1',
    totalAmount: 250.0,
    status: OrderStatus.PENDING_PAYMENT,
    user: { email: 'buyer@test.com', phone: '+1234567890' },
    payment: {
      id: 'pay-1',
      provider: PaymentProvider.RAZORPAY,
      paymentIntentId: 'order_rzp_mock123',
      transactionId: 'pay_rzp_mock456',
      status: PaymentStatus.CAPTURED,
    },
    items: [{ variantId: 'var-1', quantity: 2 }],
  };

  const mockCodOrder = {
    id: 'ord-cod-100',
    orderNumber: 'ORD-2026-COD100',
    userId: 'user-1',
    totalAmount: 999.0,
    status: OrderStatus.CONFIRMED,
    user: { email: 'codbuyer@test.com', phone: '+1234567890' },
    payment: {
      id: 'pay-cod-1',
      provider: PaymentProvider.COD,
      status: PaymentStatus.COD_PENDING,
      amount: 999.0,
    },
    codTransaction: {
      id: 'cod-tx-1',
      orderId: 'ord-cod-100',
      status: CODStatus.COD_PENDING,
      amount: 999.0,
    },
    items: [{ variantId: 'var-1', quantity: 1 }],
  };

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    cODTransaction: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
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

  const mockInventoryService = {
    commitStock: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: any) => {
      if (key === 'payments.razorpay.keySecret') return 'test_secret_key_12345';
      if (key === 'payments.razorpay.keyId') return 'rzp_test_key_id';
      return def;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PaymentProviderFactory,
        RazorpayProvider,
        StripeProvider,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryService = module.get<InventoryService>(InventoryService);
    redisService = module.get<RedisService>(RedisService);
    razorpayProvider = module.get<RazorpayProvider>(RazorpayProvider);
    jest.clearAllMocks();
  });

  describe('1. Online Gateway Intent & Verification', () => {
    it('should create Razorpay payment intent', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.payment.upsert.mockResolvedValue({ id: 'pay-1' });
      jest.spyOn(razorpayProvider, 'createOrder').mockResolvedValue({
        provider: PaymentProvider.RAZORPAY,
        providerOrderId: 'order_rzp_mock123',
        amount: 250,
        currency: 'INR',
        keyId: 'rzp_test_key_id',
      });

      const res = await service.createPaymentIntent('user-1', {
        orderId: 'ord-100',
        provider: PaymentProvider.RAZORPAY,
      });

      expect((res as any).providerOrderId).toBe('order_rzp_mock123');
      expect(mockPrismaService.payment.upsert).toHaveBeenCalled();
    });
  });

  describe('2. Cash on Delivery (COD) Creation & Security', () => {
    it('should register COD order as COD_PENDING without marking as paid', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });
      mockPrismaService.payment.upsert.mockResolvedValue({ id: 'pay-cod' });
      mockPrismaService.cODTransaction.upsert.mockResolvedValue({ id: 'cod-tx' });

      const res = await service.createPaymentIntent('user-1', {
        orderId: 'ord-100',
        provider: PaymentProvider.COD,
      });

      expect(res.isCod).toBe(true);
      expect(res.status).toBe(PaymentStatus.COD_PENDING);
      expect(mockPrismaService.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: PaymentStatus.COD_PENDING }),
        }),
      );
    });

    it('should reject customer attempting to manually verify COD payment', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockCodOrder);

      await expect(
        service.verifyPayment('user-1', {
          orderId: 'ord-cod-100',
          provider: PaymentProvider.COD,
          providerPaymentId: 'fake_paid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject client attempting to call confirmPayment on COD order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockCodOrder);

      await expect(
        service.confirmPayment({
          orderId: 'ord-cod-100',
          transactionId: 'fake_txn',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Admin COD Collection Confirmation', () => {
    it('should successfully confirm doorstep COD collection and mark DELIVERED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockCodOrder);
      mockPrismaService.payment.update.mockResolvedValue({ status: PaymentStatus.COD_COLLECTED });
      mockPrismaService.cODTransaction.upsert.mockResolvedValue({ status: CODStatus.COD_COLLECTED });
      mockPrismaService.order.update.mockResolvedValue({ status: OrderStatus.DELIVERED });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await service.confirmCodCollection('ord-cod-100', 'admin-1', {
        collectedBy: 'Ramesh (Courier Executive)',
        courierReference: 'EXP-84920194-IN',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.COD_COLLECTED);
      expect(mockPrismaService.payment.update).toHaveBeenCalled();
      expect(mockPrismaService.cODTransaction.upsert).toHaveBeenCalled();
    });

    it('should reject duplicate COD collection if already collected', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockCodOrder,
        payment: {
          ...mockCodOrder.payment,
          status: PaymentStatus.COD_COLLECTED,
        },
      });

      await expect(
        service.confirmCodCollection('ord-cod-100', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Admin COD Settlement', () => {
    it('should settle collected COD transaction', async () => {
      mockPrismaService.cODTransaction.findUnique.mockResolvedValue({
        ...mockCodOrder.codTransaction,
        status: CODStatus.COD_COLLECTED,
        order: mockCodOrder,
      });
      mockPrismaService.cODTransaction.update.mockResolvedValue({ status: CODStatus.COD_SETTLED });
      mockPrismaService.payment.update.mockResolvedValue({ status: PaymentStatus.COD_SETTLED });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-2' });

      const result = await service.settleCodTransaction('ord-cod-100', 'admin-1', {
        settlementReference: 'BANK-REF-9021',
      });

      expect(result.status).toBe(CODStatus.COD_SETTLED);
      expect(mockPrismaService.cODTransaction.update).toHaveBeenCalled();
    });

    it('should reject settling COD transaction that has not been collected yet', async () => {
      mockPrismaService.cODTransaction.findUnique.mockResolvedValue({
        ...mockCodOrder.codTransaction,
        status: CODStatus.COD_PENDING,
        order: mockCodOrder,
      });

      await expect(
        service.settleCodTransaction('ord-cod-100', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Webhook Security & Idempotency Hardening', () => {
    it('should reject payment webhook with invalid cryptographic signature', async () => {
      jest.spyOn(razorpayProvider, 'verifyWebhookSignature').mockReturnValue(false);

      await expect(
        service.handleWebhook(
          'RAZORPAY',
          { id: 'evt_123', event: 'payment.captured' },
          'invalid_signature',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should process verified webhook and cache eventId in Redis for 7 days', async () => {
      jest.spyOn(razorpayProvider, 'verifyWebhookSignature').mockReturnValue(true);
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ord-100',
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.payment.upsert.mockResolvedValue({ status: PaymentStatus.CAPTURED });
      mockPrismaService.order.update.mockResolvedValue({ status: OrderStatus.PROCESSING });

      const response = await service.handleWebhook(
        'RAZORPAY',
        {
          id: 'evt_valid_100',
          event: 'payment.captured',
          payload: { payment: { entity: { order_id: 'order_rzp_mock', id: 'pay_rzp_mock' } } },
        },
        'valid_signature',
      );

      expect(response.received).toBe(true);
      expect(response.eventId).toBe('evt_valid_100');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'webhook_payment:evt_valid_100',
        '1',
        604800,
      );
    });

    it('should return idempotent response and skip processing for duplicate webhook event', async () => {
      jest.spyOn(razorpayProvider, 'verifyWebhookSignature').mockReturnValue(true);
      mockRedisService.get.mockResolvedValue('1'); // already cached

      const response = await service.handleWebhook(
        'RAZORPAY',
        { id: 'evt_duplicate_200', event: 'payment.captured' },
        'valid_signature',
      );

      expect(response.idempotent).toBe(true);
      expect(mockPrismaService.payment.findFirst).not.toHaveBeenCalled();
    });
  });
});
