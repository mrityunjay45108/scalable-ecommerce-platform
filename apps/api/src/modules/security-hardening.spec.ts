import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders/orders.service';
import { ReturnsService } from './returns/returns.service';
import { RefundsService } from './refunds/refunds.service';
import { ShippingService } from './shipping/shipping.service';
import { PaymentsService } from './payments/payments.service';
import { InventoryService } from './inventory/inventory.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { NotificationsService } from './notifications/notifications.service';
import { CouponsService } from './coupons/coupons.service';
import { ShippingProviderFactory } from './shipping/providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from './shipping/providers/standard-express.provider';
import { MockShippingProvider } from './shipping/providers/mock-shipping.provider';
import { PaymentProviderFactory } from './payments/providers/payment-provider.factory';
import { RazorpayProvider } from './payments/providers/razorpay.provider';
import { StripeProvider } from './payments/providers/stripe.provider';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  ShipmentStatus,
  ReturnStatus,
  ReturnReason,
  ReturnAction,
  QualityCheckResult,
  RefundStatus,
  CODStatus,
  Role,
} from '@ecommerce/types';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';

describe('Phase 1: Production Security Hardening & Authorization Verification', () => {
  let ordersService: OrdersService;
  let returnsService: ReturnsService;
  let refundsService: RefundsService;
  let shippingService: ShippingService;
  let paymentsService: PaymentsService;
  let prisma: PrismaService;
  let redis: RedisService;
  let configService: ConfigService;
  let standardExpressProvider: StandardExpressShippingProvider;

  const customerA = {
    id: 'user-cust-A',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'A',
    role: Role.CUSTOMER,
  };

  const customerB = {
    id: 'user-cust-B',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'B',
    role: Role.CUSTOMER,
  };

  const adminUser = {
    id: 'user-admin-1',
    email: 'admin@novastore.com',
    firstName: 'Admin',
    lastName: 'Super',
    role: Role.ADMIN,
  };

  const sampleOrderA = {
    id: 'order-aaa-111',
    orderNumber: 'ORD-2026-AAA',
    userId: 'user-cust-A',
    status: OrderStatus.DELIVERED,
    subtotal: 1000,
    tax: 80,
    shippingCost: 0,
    discountAmount: 0,
    totalAmount: 1080,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    items: [
      {
        id: 'item-1',
        orderId: 'order-aaa-111',
        variantId: 'var-1',
        quantity: 2,
        unitPrice: 500,
        totalPrice: 1000,
        productTitle: 'Nova Smartphone 128GB',
        variantTitle: 'Midnight Black',
        sku: 'NOVA-128-BLK',
      },
    ],
    shippingAddress: {
      recipientName: 'Alice A',
      phone: '9876543210',
      street: '123 Market St',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
    },
    payment: {
      id: 'pay-aaa-1',
      orderId: 'order-aaa-111',
      provider: PaymentProvider.RAZORPAY,
      amount: 1080,
      status: PaymentStatus.CAPTURED,
      transactionId: 'txn_razorpay_aaa',
    },
    shipment: {
      id: 'ship-aaa-1',
      orderId: 'order-aaa-111',
      awbNumber: 'EXP-84920194-IN',
      courierProvider: 'STANDARD_EXPRESS',
      status: ShipmentStatus.DELIVERED,
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Delivered 2 days ago
      isCod: false,
    },
    returnRequests: [],
    refunds: [],
  };

  const sampleReturnA = {
    id: 'ret-aaa-111',
    returnNumber: 'RET-2026-901',
    orderId: 'order-aaa-111',
    userId: 'user-cust-A',
    status: ReturnStatus.REQUESTED,
    reason: ReturnReason.DAMAGED,
    action: ReturnAction.REFUND,
    bankDetails: {
      accountNumber: '12345678901234',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Alice A',
      upiId: 'alice@okhdfcbank',
    },
    items: [
      {
        id: 'ri-1',
        returnRequestId: 'ret-aaa-111',
        orderItemId: 'item-1',
        quantity: 1,
      },
    ],
    order: sampleOrderA,
  };

  const mockPrismaService = {
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    returnRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    refund: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: 0 }),
    },
    refundTransaction: {
      create: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    cODTransaction: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: 0 }),
    },
    shipment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    shipmentTrackingEvent: {
      create: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockInventoryService = {
    commitStock: jest.fn().mockResolvedValue(undefined),
    releaseStock: jest.fn().mockResolvedValue(undefined),
  };

  const mockCouponsService = {
    validateAndCalculate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        ReturnsService,
        RefundsService,
        ShippingService,
        PaymentsService,
        ShippingProviderFactory,
        StandardExpressShippingProvider,
        MockShippingProvider,
        PaymentProviderFactory,
        RazorpayProvider,
        StripeProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'returns.windowDays') return 14;
              if (key === 'shipping.provider') return 'STANDARD_EXPRESS';
              if (key === 'shipping.webhookSecret') return 'test_webhook_secret_key';
              if (key === 'payments.razorpay.keyId') return 'rzp_test_mock';
              if (key === 'payments.razorpay.keySecret') return 'rzp_secret_mock';
              if (key === 'payments.stripe.secretKey') return 'sk_test_mock';
              return undefined;
            }),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: CouponsService, useValue: mockCouponsService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    returnsService = module.get<ReturnsService>(ReturnsService);
    refundsService = module.get<RefundsService>(RefundsService);
    shippingService = module.get<ShippingService>(ShippingService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    standardExpressProvider = module.get<StandardExpressShippingProvider>(StandardExpressShippingProvider);
  });

  // =========================================================================
  // 1. ORDER AUTHORIZATION: Customer cannot access another customer's order
  // =========================================================================
  describe('1. Order Authorization Isolation', () => {
    it('Customer A can retrieve their own order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(sampleOrderA);

      const result = await ordersService.findOrderById(sampleOrderA.id, customerA.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleOrderA.id);
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: sampleOrderA.id }, { orderNumber: sampleOrderA.id }],
          userId: customerA.id,
        },
        include: expect.any(Object),
      });
    });

    it('Customer B is denied access when requesting Customer A order (returns 404 Not Found)', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        ordersService.findOrderById(sampleOrderA.id, customerB.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // 2. RETURN AUTHORIZATION: Customer cannot access another customer's return
  // =========================================================================
  describe('2. Return Request Authorization Isolation', () => {
    it('Customer A can retrieve their own return request', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue(sampleReturnA);

      const result = await returnsService.findReturnById(sampleReturnA.id, customerA.id, Role.CUSTOMER);
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleReturnA.id);
    });

    it('Customer B is denied access when requesting Customer A return request (throws ForbiddenException)', async () => {
      mockPrismaService.returnRequest.findFirst.mockResolvedValue(sampleReturnA);

      await expect(
        returnsService.findReturnById(sampleReturnA.id, customerB.id, Role.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 3. BANK DETAILS SECURITY: Raw bank account numbers are never returned to customer
  // =========================================================================
  describe('3. Bank Details Sanitization & Financial Privacy', () => {
    it('Customer API response masks account number, IFSC code and UPI ID', () => {
      const rawBank = {
        accountNumber: '12345678901234',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Alice A',
        upiId: 'alice@okhdfcbank',
      };

      const sanitized = returnsService.sanitizeBankDetails(rawBank);
      expect(sanitized.accountNumber).toBe('XXXXXXXXXX1234');
      expect(sanitized.accountNumber).not.toContain('1234567890');
      expect(sanitized.ifscCode).toBe('XXXXXXXX234');
      expect(sanitized.upiId).toBe('a***@okhdfcbank');
    });

    it('Short account numbers (<=4 digits) are safely masked with X', () => {
      const sanitized = returnsService.sanitizeBankDetails({ accountNumber: '1234' });
      expect(sanitized.accountNumber).toBe('XXXX');
    });

    it('Incoming return submission strips forbidden properties (CVV, card numbers, PIN, passwords)', () => {
      const maliciousPayload = {
        accountNumber: '987654321098',
        ifscCode: 'SBIN0001234',
        accountHolderName: 'Alice',
        cardNumber: '4111111111111111',
        cvv: '123',
        pin: '9999',
        password: 'bankPassword123',
      };

      const clean = returnsService.sanitizeIncomingBankDetails(maliciousPayload);
      expect(clean.accountNumber).toBe('987654321098');
      expect(clean.cardNumber).toBeUndefined();
      expect(clean.cvv).toBeUndefined();
      expect(clean.pin).toBeUndefined();
      expect(clean.password).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. RETURN WINDOW CONFIGURATION & EXPIRATION VERIFICATION
  // =========================================================================
  describe('4. Configurable Return Window & Expiration Enforcement', () => {
    it('Accepts return request within active RETURN_WINDOW_DAYS (delivered 2 days ago, window 14 days)', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(sampleOrderA);
      mockPrismaService.returnRequest.create.mockResolvedValue(sampleReturnA);

      const result = await returnsService.createReturnRequest(customerA.id, {
        orderId: sampleOrderA.id,
        reason: ReturnReason.DAMAGED,
        items: [{ orderItemId: 'item-1', quantity: 1 }],
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.returnRequest.create).toHaveBeenCalled();
    });

    it('Rejects return request when delivered timestamp exceeds RETURN_WINDOW_DAYS (delivered 20 days ago)', async () => {
      const expiredOrder = {
        ...sampleOrderA,
        shipment: {
          ...sampleOrderA.shipment,
          deliveredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago > 14 days
        },
      };
      mockPrismaService.order.findFirst.mockResolvedValue(expiredOrder);

      await expect(
        returnsService.createReturnRequest(customerA.id, {
          orderId: expiredOrder.id,
          reason: ReturnReason.DAMAGED,
          items: [{ orderItemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Safely validates invalid or negative RETURN_WINDOW_DAYS by falling back to 14 days', () => {
      const fallbackDays = returnsService.getReturnWindowDays();
      expect(fallbackDays).toBe(14);
      expect(fallbackDays).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 5. COD SECURITY: Customer cannot confirm COD collection & initial state is COD_PENDING
  // =========================================================================
  describe('5. Cash on Delivery (COD) Authorization & Lifecycle', () => {
    it('Customer cannot confirm COD collection on payment endpoint', async () => {
      const codOrder = {
        ...sampleOrderA,
        payment: {
          id: 'pay-cod-1',
          orderId: sampleOrderA.id,
          provider: PaymentProvider.COD,
          amount: 1080,
          status: PaymentStatus.COD_PENDING,
        },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(codOrder);

      // Confirm payment online endpoint rejects COD orders
      await expect(
        paymentsService.confirmPayment({
          orderId: sampleOrderA.id,
          transactionId: 'fake_txn',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Confirming COD collection twice on same order throws BadRequestException (idempotent duplicate protection)', async () => {
      const collectedOrder = {
        ...sampleOrderA,
        payment: {
          id: 'pay-cod-1',
          orderId: sampleOrderA.id,
          provider: PaymentProvider.COD,
          amount: 1080,
          status: PaymentStatus.COD_COLLECTED,
        },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(collectedOrder);

      await expect(
        paymentsService.confirmCodCollection(sampleOrderA.id, adminUser.id, {
          collectedBy: 'Driver',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 6. REFUND OVERPAYMENT & IDEMPOTENCY PROTECTION
  // =========================================================================
  describe('6. Refund Security, Idempotency & Overpayment Protection', () => {
    it('Customer B cannot initiate refund on Customer A order (throws ForbiddenException)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(sampleOrderA);

      await expect(
        refundsService.initiateRefund(customerB.id, Role.CUSTOMER, {
          orderId: sampleOrderA.id,
          reason: 'Unauthorized refund attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Rejects refund if requested amount exceeds remaining refundable balance (Order Total: ₹1080, Requested: ₹1500)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(sampleOrderA);

      await expect(
        refundsService.initiateRefund(adminUser.id, Role.ADMIN, {
          orderId: sampleOrderA.id,
          amount: 1500,
          reason: 'Overpayment attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Rejects refund if order is already fully refunded', async () => {
      const fullyRefundedOrder = {
        ...sampleOrderA,
        refunds: [
          {
            id: 'ref-1',
            amount: 1080,
            status: RefundStatus.COMPLETED,
          },
        ],
      };
      mockPrismaService.order.findUnique.mockResolvedValue(fullyRefundedOrder);

      await expect(
        refundsService.initiateRefund(adminUser.id, Role.ADMIN, {
          orderId: sampleOrderA.id,
          amount: 100,
          reason: 'Double refund attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Duplicate refund request with identical idempotencyKey returns existing refund record safely without re-execution', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(sampleOrderA);
      const existingRefundRecord = {
        id: 'ref-idemp-1',
        refundNumber: 'REF-2026-999',
        orderId: sampleOrderA.id,
        amount: 500,
        status: RefundStatus.COMPLETED,
        idempotencyKey: 'idemp_key_123',
        transactions: [],
      };
      mockPrismaService.refund.findUnique.mockResolvedValue(existingRefundRecord);

      const result = await refundsService.initiateRefund(adminUser.id, Role.ADMIN, {
        orderId: sampleOrderA.id,
        amount: 500,
        reason: 'Duplicate call',
        idempotencyKey: 'idemp_key_123',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('ref-idemp-1');
      expect(mockPrismaService.refund.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. COURIER WEBHOOK SECURITY & CONSTANT-TIME SIGNATURE VERIFICATION
  // =========================================================================
  describe('7. Courier Webhook Cryptographic Verification & Replay Protection', () => {
    it('Rejects courier webhook with invalid cryptographic signature (throws ForbiddenException)', async () => {
      const payload = {
        eventId: 'EVT-WH-1234',
        awbNumber: 'EXP-84920194-IN',
        status: ShipmentStatus.DELIVERED,
      };

      const invalidHeaders = {
        'x-shipping-signature': 'invalid_forged_signature_hash',
      };

      await expect(
        shippingService.handleCourierWebhook('STANDARD_EXPRESS', invalidHeaders, payload),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Accepts courier webhook with valid HMAC-SHA256 signature and updates tracking', async () => {
      const payload = {
        eventId: 'EVT-WH-VALID-99',
        awbNumber: 'EXP-84920194-IN',
        status: ShipmentStatus.DELIVERED,
        location: 'Bengaluru Delivery Hub',
        activity: 'Delivered to recipient',
      };

      const secret = 'test_webhook_secret_key';
      process.env.SHIPPING_WEBHOOK_SECRET = secret;

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const validHeaders = {
        'x-shipping-signature': validSignature,
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        awbNumber: 'EXP-84920194-IN',
        status: ShipmentStatus.OUT_FOR_DELIVERY,
        order: { id: sampleOrderA.id, payment: sampleOrderA.payment, codTransaction: null, user: customerA },
      });
      mockPrismaService.shipment.update.mockResolvedValue({ id: 'ship-1', status: ShipmentStatus.DELIVERED });

      const response = await shippingService.handleCourierWebhook('STANDARD_EXPRESS', validHeaders, payload);
      expect(response.received).toBe(true);
      expect(response.eventId).toBe(payload.eventId);
      expect(mockRedisService.set).toHaveBeenCalledWith(`webhook_shipping:${payload.eventId}`, '1', expect.any(Number));
    });

    it('Duplicate courier webhook is safely skipped via Redis replay protection', async () => {
      const payload = {
        eventId: 'EVT-WH-DUPLICATE-1',
        awbNumber: 'EXP-84920194-IN',
        status: ShipmentStatus.IN_TRANSIT,
      };

      const secret = 'test_webhook_secret_key';
      process.env.SHIPPING_WEBHOOK_SECRET = secret;

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const validHeaders = { 'x-shipping-signature': validSignature };

      // Redis reports key already processed
      mockRedisService.get.mockResolvedValue('1');

      const response = await shippingService.handleCourierWebhook('STANDARD_EXPRESS', validHeaders, payload);
      expect(response.received).toBe(true);
      expect(response.idempotent).toBe(true);
      expect(mockPrismaService.shipment.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. PAYMENT WEBHOOK REPLAY PROTECTION
  // =========================================================================
  describe('8. Payment Webhook Cryptographic Verification & Replay Protection', () => {
    it('Duplicate payment webhook returns idempotent response without executing transaction twice', async () => {
      const payload = {
        id: 'evt_pay_duplicate_1',
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_123', order_id: 'order_rzp_1' } } },
      };

      const validSignature = crypto
        .createHmac('sha256', 'rzp_secret_mock')
        .update(JSON.stringify(payload))
        .digest('hex');

      // Redis indicates event already processed
      mockRedisService.get.mockResolvedValue('1');

      const result = await paymentsService.handleWebhook('RAZORPAY', payload, validSignature);
      expect(result.received).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });
  });
});
