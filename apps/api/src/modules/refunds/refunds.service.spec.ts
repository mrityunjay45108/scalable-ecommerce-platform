import { Test, TestingModule } from '@nestjs/testing';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { RazorpayProvider } from '../payments/providers/razorpay.provider';
import { StripeProvider } from '../payments/providers/stripe.provider';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  RefundStatus,
  Role,
} from '@ecommerce/types';

describe('RefundsService - Payouts & Gateway Refund Processing', () => {
  let service: RefundsService;
  let prisma: PrismaService;
  let razorpayProvider: RazorpayProvider;

  const mockOrder = {
    id: 'ord-ref-100',
    orderNumber: 'ORD-2026-REF100',
    userId: 'user-1',
    totalAmount: 2000.0,
    status: OrderStatus.DELIVERED,
    payment: {
      id: 'pay-ref-1',
      orderId: 'ord-ref-100',
      provider: PaymentProvider.RAZORPAY,
      transactionId: 'pay_rzp_mock123',
      status: PaymentStatus.CAPTURED,
      amount: 2000.0,
    },
    refunds: [],
    returnRequests: [],
  };

  const mockRefund = {
    id: 'ref-100',
    refundNumber: 'REF-2026-84910',
    orderId: 'ord-ref-100',
    paymentId: 'pay-ref-1',
    amount: 2000.0,
    currency: 'INR',
    reason: 'Defective product',
    status: RefundStatus.COMPLETED,
    idempotencyKey: 'idemp-123',
    gatewayRefundId: 'rfnd_rzp_mock456',
    order: mockOrder,
    transactions: [],
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    returnRequest: {
      update: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    refundTransaction: {
      create: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        PaymentProviderFactory,
        RazorpayProvider,
        StripeProvider,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock_secret') },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
    prisma = module.get<PrismaService>(PrismaService);
    razorpayProvider = module.get<RazorpayProvider>(RazorpayProvider);
    jest.clearAllMocks();
  });

  describe('1. Full Refund Processing', () => {
    it('should process full online refund and update payment & order status to REFUNDED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.refund.findUnique.mockResolvedValue(null); // No previous refund with same idempotencyKey
      mockPrismaService.refund.create.mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.PROCESSING,
      });
      mockPrismaService.refund.update.mockResolvedValue(mockRefund);

      jest.spyOn(razorpayProvider, 'processRefund').mockResolvedValue({
        success: true,
        refundId: 'rfnd_rzp_mock456',
        amount: 2000,
        status: 'processed',
      });

      const result = await service.initiateRefund('user-1', Role.CUSTOMER, {
        orderId: 'ord-ref-100',
        amount: 2000.0,
        reason: 'Defective product',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-ref-1' },
        data: { status: PaymentStatus.REFUNDED },
      });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-ref-100' },
        data: { status: OrderStatus.REFUNDED },
      });
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('2. Partial Refund Processing', () => {
    it('should process partial refund and set payment status to PARTIALLY_REFUNDED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.refund.findUnique.mockResolvedValue(null);
      mockPrismaService.refund.create.mockResolvedValue({
        ...mockRefund,
        amount: 500.0,
        status: RefundStatus.PROCESSING,
      });
      mockPrismaService.refund.update.mockResolvedValue({
        ...mockRefund,
        amount: 500.0,
        status: RefundStatus.COMPLETED,
      });

      jest.spyOn(razorpayProvider, 'processRefund').mockResolvedValue({
        success: true,
        refundId: 'rfnd_part_123',
        amount: 500,
        status: 'processed',
      });

      const result = await service.initiateRefund('user-1', Role.CUSTOMER, {
        orderId: 'ord-ref-100',
        amount: 500.0,
        reason: 'Price match adjustment',
      });

      expect(result.amount).toBe(500.0);
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-ref-1' },
        data: { status: PaymentStatus.PARTIALLY_REFUNDED },
      });
      // Order should NOT be fully REFUNDED yet
      expect(mockPrismaService.order.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: OrderStatus.REFUNDED } }),
      );
    });
  });

  describe('3. Duplicate & Over-Refund Prevention', () => {
    it('should reject refund exceeding total remaining paid balance', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        refunds: [
          {
            id: 'prev-ref',
            amount: 1500.0,
            status: RefundStatus.COMPLETED,
          },
        ],
      });
      mockPrismaService.refund.findUnique.mockResolvedValue(null);

      // Remaining refundable is 500, user requests 1000
      await expect(
        service.initiateRefund('user-1', Role.CUSTOMER, {
          orderId: 'ord-ref-100',
          amount: 1000.0,
          reason: 'Excess refund request',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should be idempotent and return existing refund for matching idempotencyKey', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.refund.findUnique.mockResolvedValue(mockRefund);

      const result = await service.initiateRefund('user-1', Role.CUSTOMER, {
        orderId: 'ord-ref-100',
        amount: 2000.0,
        reason: 'Duplicate call',
        idempotencyKey: 'idemp-123',
      });

      expect(result.id).toBe('ref-100');
      expect(mockPrismaService.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('4. Authorization & Security Checks', () => {
    it('should reject unauthorized user attempting to refund another user order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });

      await expect(
        service.initiateRefund('user-1', Role.CUSTOMER, {
          orderId: 'ord-ref-100',
          reason: 'Unauthorized attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject refund on unpaid / pending order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: {
          ...mockOrder.payment,
          status: PaymentStatus.PENDING,
        },
      });

      await expect(
        service.initiateRefund('user-1', Role.CUSTOMER, {
          orderId: 'ord-ref-100',
          reason: 'Unpaid order refund',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. COD Bank Transfer Payout Refund', () => {
    it('should record bank transfer payout for COD order refund', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: {
          ...mockOrder.payment,
          provider: PaymentProvider.COD,
          status: PaymentStatus.COD_COLLECTED,
        },
      });
      mockPrismaService.refund.findUnique.mockResolvedValue(null);
      mockPrismaService.refund.create.mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.PROCESSING,
      });
      mockPrismaService.refund.update.mockResolvedValue(mockRefund);

      const result = await service.initiateRefund('user-1', Role.CUSTOMER, {
        orderId: 'ord-ref-100',
        amount: 2000.0,
        reason: 'COD return refund',
      });

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockPrismaService.refundTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gateway: 'COD_BANK_TRANSFER' }),
        }),
      );
    });
  });
});
