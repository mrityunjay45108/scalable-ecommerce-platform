import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../redis/redis.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@ecommerce/types';
import * as crypto from 'crypto';

describe('PaymentsService - Payment Architecture & Provider Abstraction', () => {
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
    items: [
      { variantId: 'var-1', quantity: 2 },
    ],
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
    productVariant: {
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
  };

  const mockInventoryService = {
    commitStock: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent - Razorpay Order Creation', () => {
    it('should create razorpay order with amount in subunits and never trust frontend total', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.createPaymentIntent('user-1', {
        orderId: 'ord-100',
        provider: PaymentProvider.RAZORPAY,
      });

      expect(result.provider).toBe('RAZORPAY');
      expect(result.amount).toBe(25000); // $250.00 in subunits (cents/paisa)
      expect(prisma.payment.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found for user', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('user-1', {
          orderId: 'invalid-ord',
          provider: PaymentProvider.RAZORPAY,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyPayment - Signature Verification & Inventory Commit', () => {
    it('should verify valid HMAC-SHA256 signature and commit stock', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING,
      });

      const providerOrderId = 'order_rzp_mock123';
      const providerPaymentId = 'pay_rzp_mock456';
      const signature = crypto
        .createHmac('sha256', 'test_secret_key_12345')
        .update(`${providerOrderId}|${providerPaymentId}`)
        .digest('hex');

      const result = await service.verifyPayment('user-1', {
        orderId: 'ord-100',
        provider: PaymentProvider.RAZORPAY,
        providerOrderId,
        providerPaymentId,
        signature,
      });

      expect(result.success).toBe(true);
      expect(inventoryService.commitStock).toHaveBeenCalledWith(
        mockOrder.orderNumber,
        expect.any(Array),
      );
    });

    it('should reject forged or invalid cryptographic signature', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.verifyPayment('user-1', {
          orderId: 'ord-100',
          provider: PaymentProvider.RAZORPAY,
          providerOrderId: 'order_rzp_mock123',
          providerPaymentId: 'pay_rzp_mock456',
          signature: 'forged_fake_signature_hex_code',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook & Idempotency', () => {
    it('should skip duplicate webhook events idempotently', async () => {
      mockRedisService.get.mockResolvedValue('1'); // already processed

      const result = await service.handleWebhook('RAZORPAY', {
        id: 'evt_12345',
        event: 'payment.captured',
      });

      expect(result.idempotent).toBe(true);
      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });
  });

  describe('processRefund', () => {
    it('should process refund and restore stock quantities', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.processRefund('ord-100', {
        amount: 250.0,
        reason: 'Customer cancelled order',
      });

      expect(result.success).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-100' },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(prisma.productVariant.update).toHaveBeenCalled();
    });
  });
});
