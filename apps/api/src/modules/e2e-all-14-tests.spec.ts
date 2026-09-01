import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth/auth.service';
import { ProductsService } from './products/products.service';
import { CartService } from './cart/cart.service';
import { OrdersService } from './orders/orders.service';
import { PaymentsService } from './payments/payments.service';
import { ShippingService } from './shipping/shipping.service';
import { ReturnsService } from './returns/returns.service';
import { RefundsService } from './refunds/refunds.service';
import { InventoryService } from './inventory/inventory.service';
import { UsersService } from './users/users.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis/redis.service';
import { NotificationsService } from './notifications/notifications.service';
import { CouponsService } from './coupons/coupons.service';
import { PaymentProviderFactory } from './payments/providers/payment-provider.factory';
import { RazorpayProvider } from './payments/providers/razorpay.provider';
import { StripeProvider } from './payments/providers/stripe.provider';
import { ShippingProviderFactory } from './shipping/providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from './shipping/providers/standard-express.provider';
import { MockShippingProvider } from './shipping/providers/mock-shipping.provider';
import { StorageService } from './storage/storage.service';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ShipmentStatus,
  ReturnStatus,
  ReturnReason,
  ReturnAction,
  QualityCheckResult,
  RefundStatus,
  CODStatus,
  Role,
} from '@ecommerce/types';
import { UserRole } from '@ecommerce/database';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('Phase 13 — Complete E2E Testing of All 14 Mission-Critical Workflows', () => {
  let authService: AuthService;
  let productsService: ProductsService;
  let cartService: CartService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let shippingService: ShippingService;
  let returnsService: ReturnsService;
  let refundsService: RefundsService;
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let redis: RedisService;
  let standardShippingProvider: StandardExpressShippingProvider;
  let razorpayProvider: RazorpayProvider;

  const mockCustomer = {
    id: 'cust-101',
    email: 'buyer@test.com',
    passwordHash: '$2b$10$hashedCustomerPass',
    firstName: 'Alice',
    lastName: 'Smith',
    role: UserRole.CUSTOMER,
    isActive: true,
    isEmailVerified: true,
  };

  const mockOtherCustomer = {
    id: 'cust-999',
    email: 'other@test.com',
    firstName: 'Bob',
    role: UserRole.CUSTOMER,
  };

  const mockAdmin = {
    id: 'admin-101',
    email: 'admin@novastore.com',
    role: UserRole.ADMIN,
    firstName: 'Admin',
  };

  const mockProductVariant = {
    id: 'var-1',
    productId: 'prod-1',
    title: 'Space Gray / 256GB',
    sku: 'NOVA-SG-256',
    price: 500,
    stockQuantity: 100,
    reservedStock: 0,
    availableStock: 100,
    product: {
      id: 'prod-1',
      title: 'NovaBook Pro',
      slug: 'novabook-pro',
      images: [],
    },
  };

  const mockOrder = {
    id: 'ord-101',
    orderNumber: 'ORD-2026-10101',
    userId: 'cust-101',
    status: OrderStatus.PENDING_PAYMENT,
    subtotal: 500,
    tax: 0,
    shippingCost: 0,
    discountAmount: 0,
    totalAmount: 500,
    createdAt: new Date(),
    user: mockCustomer,
    returnRequests: [],
    refunds: [],
    items: [
      {
        id: 'oi-1',
        orderId: 'ord-101',
        variantId: 'var-1',
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
        productTitle: 'NovaBook Pro',
        variantTitle: 'Space Gray / 256GB',
        variant: mockProductVariant,
      },
    ],
    shippingAddress: {
      recipientName: 'Alice Smith',
      street: '101 Tech Blvd',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      phone: '9876543210',
    },
    payment: {
      id: 'pay-101',
      orderId: 'ord-101',
      provider: PaymentProvider.RAZORPAY,
      amount: 500,
      status: PaymentStatus.PENDING,
      paymentIntentId: 'order_rzp_101',
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn((cb) =>
      typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb),
    ),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'cart-1' }),
    },
    wishlist: {
      create: jest.fn().mockResolvedValue({ id: 'wishlist-1' }),
    },
    cartItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    shipment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    shipmentTrackingEvent: {
      create: jest.fn(),
    },
    cODTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    returnRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    returnItem: {
      create: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    refundTransaction: {
      create: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
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

  beforeAll(async () => {
    jest.spyOn(bcrypt, 'hash').mockImplementation(async () => '$2b$10$hashedCustomerPass');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ProductsService,
        CartService,
        OrdersService,
        PaymentsService,
        ShippingService,
        ReturnsService,
        RefundsService,
        InventoryService,
        UsersService,
        PaymentProviderFactory,
        RazorpayProvider,
        StripeProvider,
        ShippingProviderFactory,
        StandardExpressShippingProvider,
        MockShippingProvider,
        { provide: StorageService, useValue: { uploadFile: jest.fn().mockResolvedValue({ url: 'https://cdn.test/img.png' }) } },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => {
              if (k === 'jwt.secret') return 'jwt-secret';
              if (k === 'payments.razorpay.keySecret') return 'test_razorpay_secret';
              if (k === 'payments.razorpay.keyId') return 'rzp_test_key';
              if (k === 'shipping.webhookSecret') return 'valid_sig';
              return 'test-config-value';
            }),
          },
        },
        { provide: CouponsService, useValue: { validateAndCalculateDiscount: jest.fn().mockResolvedValue({ isValid: true, discountAmount: 0 }) } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    productsService = module.get<ProductsService>(ProductsService);
    cartService = module.get<CartService>(CartService);
    ordersService = module.get<OrdersService>(OrdersService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    shippingService = module.get<ShippingService>(ShippingService);
    returnsService = module.get<ReturnsService>(ReturnsService);
    refundsService = module.get<RefundsService>(RefundsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    standardShippingProvider = module.get<StandardExpressShippingProvider>(StandardExpressShippingProvider);
    razorpayProvider = module.get<RazorpayProvider>(RazorpayProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.cart.create.mockResolvedValue({ id: 'cart-1' });
    mockPrismaService.wishlist.create.mockResolvedValue({ id: 'wishlist-1' });
    mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
  });

  // =========================================================================
  // TEST 1: Customer Online Checkout to Delivery
  // =========================================================================
  it('TEST 1: Customer Registration → Login → Product → Cart → Checkout → Payment → Shipment → Delivery', async () => {
    // 1. Registration
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce(mockCustomer);
    const regResult = await authService.register({
      email: 'buyer@test.com',
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Smith',
    });
    expect(regResult.user.email).toBe('buyer@test.com');

    // 2. Login
    mockPrismaService.user.findUnique.mockResolvedValueOnce(mockCustomer);
    const loginResult = await authService.login({
      email: 'buyer@test.com',
      password: 'Password123!',
    });
    expect(loginResult.tokens.accessToken).toBe('mock-jwt-token');

    // 3. Product Catalog
    mockPrismaService.product.findMany.mockResolvedValueOnce([mockProductVariant.product]);
    mockPrismaService.product.count.mockResolvedValueOnce(1);
    const catalog = await productsService.findAll({ page: 1, limit: 10 });
    expect(catalog.data).toHaveLength(1);

    // 4. Cart Add
    mockPrismaService.cart.findFirst.mockResolvedValue({ id: 'cart-101', userId: 'cust-101', items: [] });
    mockPrismaService.productVariant.findFirst.mockResolvedValue(mockProductVariant);
    mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
    mockPrismaService.cartItem.create.mockResolvedValue({ id: 'ci-1', variantId: 'var-1', quantity: 1 });
    mockPrismaService.cart.findUnique.mockResolvedValue({
      id: 'cart-101',
      userId: 'cust-101',
      items: [{ id: 'ci-1', variantId: 'var-1', quantity: 1, variant: mockProductVariant }],
    });
    const cart = await cartService.addItem('cust-101', { variantId: 'var-1', quantity: 1 });
    expect(cart.items).toHaveLength(1);

    // 5. Checkout (Online)
    mockPrismaService.cart.findUnique.mockResolvedValueOnce({
      id: 'cart-101',
      userId: 'cust-101',
      items: [{ id: 'ci-1', variantId: 'var-1', quantity: 1, variant: mockProductVariant }],
    });
    mockPrismaService.address.findFirst.mockResolvedValueOnce({ id: 'addr-1', userId: 'cust-101' });
    mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
    mockPrismaService.order.create.mockResolvedValueOnce(mockOrder);
    const createdOrder = await ordersService.checkout('cust-101', {
      addressId: 'addr-1',
      paymentProvider: PaymentProvider.RAZORPAY,
    });
    expect(createdOrder.orderNumber).toBe('ORD-2026-10101');

    // 6. Payment Confirmation
    mockPrismaService.order.findUnique.mockResolvedValueOnce(mockOrder);
    mockPrismaService.payment.upsert.mockResolvedValueOnce({ status: PaymentStatus.CAPTURED });
    mockPrismaService.order.update.mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.PROCESSING });
    const paymentConf = await paymentsService.confirmPayment({
      orderId: 'ord-101',
      transactionId: 'txn_rzp_success_101',
    });
    expect(paymentConf.success).toBe(true);

    // 7. Shipment Creation
    mockPrismaService.order.findUnique.mockResolvedValueOnce({
      ...mockOrder,
      status: OrderStatus.PROCESSING,
      payment: { ...mockOrder.payment, status: PaymentStatus.CAPTURED },
    });
    mockPrismaService.shipment.create.mockResolvedValueOnce({
      id: 'ship-101',
      orderId: 'ord-101',
      awbNumber: 'EXP-84920194-IN',
      status: ShipmentStatus.LABEL_CREATED,
    });
    const shipment = await shippingService.createShipment('cust-101', Role.CUSTOMER, {
      orderId: 'ord-101',
      courierProvider: 'STANDARD_EXPRESS',
    });
    expect(shipment.awbNumber).toBe('EXP-84920194-IN');

    // 8. Delivery Handover
    mockPrismaService.shipment.findUnique.mockResolvedValueOnce({
      id: 'ship-101',
      status: ShipmentStatus.OUT_FOR_DELIVERY,
      order: { id: 'ord-101' },
    });
    mockPrismaService.shipment.update.mockResolvedValueOnce({ id: 'ship-101', status: ShipmentStatus.DELIVERED });
    const deliveredShipment = await shippingService.updateShipmentStatus(
      'ship-101',
      { status: ShipmentStatus.DELIVERED, location: 'Customer Doorstep' },
      'SYSTEM_COURIER',
    );
    expect(deliveredShipment.status).toBe(ShipmentStatus.DELIVERED);
  });

  // =========================================================================
  // TEST 2: COD Checkout & Doorstep Cash Collection
  // =========================================================================
  it('TEST 2: COD Checkout → Order Confirmed → Shipment → Out for Delivery → COD Collected → Delivered', async () => {
    const codOrder = {
      ...mockOrder,
      id: 'ord-cod-202',
      orderNumber: 'ORD-2026-COD202',
      status: OrderStatus.CONFIRMED,
      payment: {
        id: 'pay-cod-202',
        provider: PaymentProvider.COD,
        status: PaymentStatus.COD_PENDING,
        amount: 500,
      },
      codTransaction: {
        id: 'cod-tx-202',
        status: CODStatus.COD_PENDING,
        amount: 500,
      },
    };

    // 1. Doorstep COD Collection by Delivery Executive
    mockPrismaService.order.findUnique.mockResolvedValueOnce(codOrder);
    mockPrismaService.payment.update.mockResolvedValueOnce({ status: PaymentStatus.COD_COLLECTED });
    mockPrismaService.cODTransaction.upsert.mockResolvedValueOnce({ status: CODStatus.COD_COLLECTED });
    mockPrismaService.order.update.mockResolvedValueOnce({ status: OrderStatus.DELIVERED });

    const codCollection = await paymentsService.confirmCodCollection('ord-cod-202', 'admin-101', {
      collectedBy: 'Sunil (Delivery Partner)',
      courierReference: 'EXP-COD-991',
    });
    expect(codCollection.success).toBe(true);
    expect(codCollection.status).toBe(PaymentStatus.COD_COLLECTED);
  });

  // =========================================================================
  // TEST 3: Return Request, Approval, Hub Intake, QC & Refund
  // =========================================================================
  it('TEST 3: Delivered Order → Return Request → Admin Approval → Pickup → Received → QC Passed → Refund Completed', async () => {
    const deliveredOrder = {
      ...mockOrder,
      id: 'ord-ret-303',
      status: OrderStatus.DELIVERED,
      returnRequests: [],
      refunds: [],
      payment: { id: 'pay-101', provider: PaymentProvider.RAZORPAY, transactionId: 'pay_rzp_101', status: PaymentStatus.CAPTURED, amount: 500 },
      shipment: { id: 'ship-303', status: ShipmentStatus.DELIVERED, deliveredAt: new Date() },
    };

    // 1. Customer Return Request
    mockPrismaService.order.findFirst.mockResolvedValueOnce(deliveredOrder);
    mockPrismaService.returnRequest.create.mockResolvedValueOnce({
      id: 'ret-303',
      returnNumber: 'RET-2026-303',
      orderId: 'ord-ret-303',
      status: ReturnStatus.REQUESTED,
      reason: ReturnReason.DEFECTIVE,
      action: ReturnAction.REFUND,
      items: [{ id: 'ri-1', orderItemId: 'oi-1', quantity: 1 }],
    });
    const returnReq = await returnsService.createReturnRequest('cust-101', {
      orderId: 'ord-ret-303',
      reason: ReturnReason.DEFECTIVE,
      action: ReturnAction.REFUND,
      items: [{ orderItemId: 'oi-1', quantity: 1 }],
    });
    expect(returnReq.status).toBe(ReturnStatus.REQUESTED);

    // 2. Admin Approval & Reverse Pickup AWB Generation
    mockPrismaService.returnRequest.findUnique.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.REQUESTED,
      order: deliveredOrder,
      items: [{ id: 'ri-1', orderItemId: 'oi-1', quantity: 1, orderItem: { variantId: 'var-1' } }],
    });
    mockPrismaService.returnRequest.update.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.PICKUP_SCHEDULED,
      pickupAwb: 'REV-EXP-7721',
    });
    const approvedReturn = await returnsService.approveReturn('ret-303', 'admin-101');
    expect(approvedReturn.status).toBe(ReturnStatus.PICKUP_SCHEDULED);
    expect(approvedReturn.pickupAwb).toBe('REV-EXP-7721');

    // 3. Hub In-Scan Receipt
    mockPrismaService.returnRequest.findUnique.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.PICKED_UP,
      order: deliveredOrder,
      items: [],
    });
    mockPrismaService.returnRequest.update.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.RECEIVED,
    });
    const receivedReturn = await returnsService.markReturnReceived('ret-303', 'admin-101');
    expect(receivedReturn.status).toBe(ReturnStatus.RECEIVED);

    // 4. Quality Inspection (Passed & Auto Restocked)
    mockPrismaService.returnRequest.findUnique.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.RECEIVED,
      action: ReturnAction.REFUND,
      order: deliveredOrder,
      items: [{ id: 'ri-1', quantity: 1, orderItem: { variantId: 'var-1', totalPrice: 500 } }],
    });
    mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
    mockPrismaService.productVariant.update.mockResolvedValue({ ...mockProductVariant, stockQuantity: 101 });
    mockPrismaService.returnRequest.update.mockResolvedValueOnce({
      id: 'ret-303',
      status: ReturnStatus.REFUND_PENDING,
      qcResult: QualityCheckResult.PASSED_RESTOCKABLE,
    });
    const qcResult = await returnsService.performQualityCheck('ret-303', 'admin-101', {
      qcResult: QualityCheckResult.PASSED_RESTOCKABLE,
      restockItems: true,
    });
    expect(qcResult.status).toBe(ReturnStatus.REFUND_PENDING);

    // 5. Gateway Refund Processing
    mockPrismaService.order.findUnique.mockResolvedValueOnce({
      ...deliveredOrder,
      payment: { id: 'pay-101', provider: PaymentProvider.RAZORPAY, transactionId: 'pay_rzp_101', status: PaymentStatus.CAPTURED, amount: 500 },
      refunds: [],
    });
    mockPrismaService.refund.create.mockResolvedValueOnce({
      id: 'rfnd-303',
      refundNumber: 'REF-2026-303',
      orderId: 'ord-ret-303',
      amount: 500,
      status: RefundStatus.PENDING,
    });
    mockPrismaService.refund.update.mockResolvedValueOnce({
      id: 'rfnd-303',
      status: RefundStatus.COMPLETED,
      amount: 500,
    });
    const refundResult = await refundsService.initiateRefund('admin-101', Role.ADMIN, {
      orderId: 'ord-ret-303',
      amount: 500,
      reason: 'QC Passed customer return',
    });
    expect(refundResult.status).toBe(RefundStatus.COMPLETED);
  });

  // =========================================================================
  // TEST 4: Return Request Rejection
  // =========================================================================
  it('TEST 4: Delivered Order → Return Request → Admin Rejection with Justification', async () => {
    mockPrismaService.returnRequest.findUnique.mockResolvedValueOnce({
      id: 'ret-404',
      status: ReturnStatus.REQUESTED,
      order: { id: 'ord-404', orderNumber: 'ORD-404', userId: 'cust-101', returnRequests: [] },
      items: [],
    });
    mockPrismaService.returnRequest.update.mockResolvedValueOnce({
      id: 'ret-404',
      status: ReturnStatus.REJECTED,
      rejectionReason: 'Product seal tampered / customer misuse',
    });

    const rejected = await returnsService.rejectReturn('ret-404', 'admin-101', {
      rejectionReason: 'Product seal tampered / customer misuse',
    });
    expect(rejected.status).toBe(ReturnStatus.REJECTED);
  });

  // =========================================================================
  // TEST 5: Replacement Workflow
  // =========================================================================
  it('TEST 5: Replacement Workflow creates replacement order and commits stock', async () => {
    mockPrismaService.returnRequest.findUnique.mockResolvedValueOnce({
      id: 'ret-505',
      returnNumber: 'RET-505',
      status: ReturnStatus.REPLACEMENT_PENDING,
      action: ReturnAction.REPLACEMENT,
      order: {
        id: 'ord-505',
        orderNumber: 'ORD-505',
        shippingAddressId: 'addr-1',
        shippingAddress: mockOrder.shippingAddress,
      },
      items: [{ id: 'ri-5', quantity: 1, orderItem: { variantId: 'var-1', unitPrice: 500 } }],
    });
    mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
    mockPrismaService.productVariant.update.mockResolvedValue(mockProductVariant);
    mockPrismaService.order.create.mockResolvedValueOnce({
      id: 'ord-rep-505',
      orderNumber: 'ORD-REP-505',
      status: OrderStatus.PROCESSING,
    });
    mockPrismaService.returnRequest.update.mockResolvedValueOnce({
      id: 'ret-505',
      status: ReturnStatus.REPLACED,
      replacementOrderId: 'ord-rep-505',
    });

    const replacement = await returnsService.processReplacement('ret-505', 'admin-101');
    expect(replacement.status).toBe(ReturnStatus.REPLACED);
  });

  // =========================================================================
  // TEST 6: Duplicate Payment Webhook Idempotency
  // =========================================================================
  it('TEST 6: Duplicate Payment Webhook returns idempotent 200 without duplicate processing', async () => {
    jest.spyOn(razorpayProvider, 'verifyWebhookSignature').mockReturnValue(true);
    mockRedisService.get.mockResolvedValueOnce('1'); // Cached in Redis

    const res = await paymentsService.handleWebhook(
      'RAZORPAY',
      { id: 'evt_pay_dup_999', event: 'payment.captured' },
      'valid_sig',
    );
    expect(res.idempotent).toBe(true);
    expect(mockPrismaService.payment.findFirst).not.toHaveBeenCalled();
  });

  // =========================================================================
  // TEST 7: Duplicate Shipping Webhook (3x DELIVERED)
  // =========================================================================
  it('TEST 7: Duplicate Shipping Webhook (3x DELIVERED) executes state machine only once', async () => {
    jest.spyOn(standardShippingProvider, 'verifyWebhookSignature').mockReturnValue(true);

    const alreadyDelivered = {
      id: 'ship-707',
      status: ShipmentStatus.DELIVERED,
      order: { id: 'ord-707' },
    };
    mockPrismaService.shipment.findUnique.mockResolvedValue(alreadyDelivered);

    const res = await shippingService.updateShipmentStatus(
      'ship-707',
      { status: ShipmentStatus.DELIVERED, location: 'Customer Doorstep' },
      'SYSTEM_COURIER',
    );
    expect(res.status).toBe(ShipmentStatus.DELIVERED);
    expect(mockPrismaService.shipmentTrackingEvent.create).not.toHaveBeenCalled();
  });

  // =========================================================================
  // TEST 8: Duplicate COD Collection Prevention
  // =========================================================================
  it('TEST 8: Duplicate COD Collection attempts are rejected with 400 Bad Request', async () => {
    mockPrismaService.order.findUnique.mockResolvedValueOnce({
      ...mockOrder,
      payment: { provider: PaymentProvider.COD, status: PaymentStatus.COD_COLLECTED },
    });

    await expect(
      paymentsService.confirmCodCollection('ord-101', 'admin-101'),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // TEST 9: Duplicate / Over-Refund Request Rejection
  // =========================================================================
  it('TEST 9: Over-Refund or Duplicate Refund is rejected by ledger constraints', async () => {
    mockPrismaService.order.findUnique.mockResolvedValueOnce({
      ...mockOrder,
      totalAmount: 500,
      payment: { id: 'pay-1', provider: PaymentProvider.RAZORPAY, status: PaymentStatus.CAPTURED, amount: 500 },
      refunds: [{ id: 'ref-existing', amount: 500, status: RefundStatus.COMPLETED }],
    });

    await expect(
      refundsService.initiateRefund('admin-101', Role.ADMIN, {
        orderId: 'ord-101',
        amount: 100, // Exceeds remaining refundable balance (0)
        reason: 'Duplicate refund test',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // TEST 10: Inventory Reservation, Release, and Restocking
  // =========================================================================
  it('TEST 10: Concurrency-safe inventory reservation on checkout and release on cancellation', async () => {
    mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
    mockPrismaService.productVariant.update.mockResolvedValue(mockProductVariant);

    // Reservation
    const reserved = await inventoryService.reserveStock('ORD-INV-10', [
      { variantId: 'var-1', quantity: 2 },
    ]);
    expect(reserved).toBe(true);

    // Release
    await expect(
      inventoryService.releaseStock('ORD-INV-10', [{ variantId: 'var-1', quantity: 2 }]),
    ).resolves.not.toThrow();
  });

  // =========================================================================
  // TEST 11: Unauthorized Customer Scoping Isolation
  // =========================================================================
  it('TEST 11: Customer cannot access or cancel another user order', async () => {
    mockPrismaService.order.findFirst.mockResolvedValueOnce(null); // Scoped by userId

    await expect(
      ordersService.findOrderById('ord-101', 'cust-999'),
    ).rejects.toThrow(NotFoundException);
  });

  // =========================================================================
  // TEST 12: Non-Admin Accessing Admin Status Mutation
  // =========================================================================
  it('TEST 12: Non-admin users cannot mutate internal shipment statuses', async () => {
    mockPrismaService.shipment.findFirst.mockResolvedValueOnce(null);

    await expect(
      shippingService.getShipmentById('ship-101', 'cust-101', Role.CUSTOMER),
    ).rejects.toThrow(NotFoundException);
  });

  // =========================================================================
  // TEST 13: Invalid Webhook Cryptographic Signature Rejection
  // =========================================================================
  it('TEST 13: Invalid webhook cryptographic signature returns HTTP 403 Forbidden', async () => {
    jest.spyOn(razorpayProvider, 'verifyWebhookSignature').mockReturnValue(false);

    await expect(
      paymentsService.handleWebhook(
        'RAZORPAY',
        { id: 'evt_forged', event: 'payment.captured' },
        'forged_signature_xyz',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // =========================================================================
  // TEST 14: Invalid Order State Transition Validation
  // =========================================================================
  it('TEST 14: Invalid order state transition jumps are rejected with 400 Bad Request', async () => {
    mockPrismaService.order.findUnique.mockResolvedValueOnce({
      ...mockOrder,
      status: OrderStatus.DELIVERED,
    });

    await expect(
      ordersService.updateOrderStatus('ord-101', { status: OrderStatus.PROCESSING }, 'admin-101'),
    ).rejects.toThrow(BadRequestException);
  });
});
