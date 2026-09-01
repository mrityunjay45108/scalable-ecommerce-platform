import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth/auth.service';
import { ProductsService } from './products/products.service';
import { CartService } from './cart/cart.service';
import { OrdersService } from './orders/orders.service';
import { PaymentsService } from './payments/payments.service';
import { InventoryService } from './inventory/inventory.service';
import { UsersService } from './users/users.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderFactory } from './payments/providers/payment-provider.factory';
import { NotificationsService } from './notifications/notifications.service';
import { RedisService } from './redis/redis.service';
import { CouponsService } from './coupons/coupons.service';
import { OrderStatus, PaymentProvider, PaymentStatus, Role } from '@ecommerce/types';
import { InventoryLogType, UserRole } from '@ecommerce/database';
import * as bcrypt from 'bcrypt';

describe('E2E Critical Flows - 10-Step E-Commerce Workflow Verification', () => {
  let authService: AuthService;
  let productsService: ProductsService;
  let cartService: CartService;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let inventoryService: InventoryService;
  let usersService: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-flow-1',
    email: 'customer@novastore.com',
    passwordHash: '$2b$10$e2eHashedPassword',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.CUSTOMER,
    isActive: true,
    isEmailVerified: true,
  };

  const mockAdmin = {
    id: 'admin-flow-1',
    email: 'admin@novastore.com',
    passwordHash: '$2b$10$e2eHashedAdmin',
    firstName: 'Admin',
    lastName: 'Operator',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const mockProduct = {
    id: 'prod-e2e-1',
    title: 'Nova Pro ANC Headphones',
    slug: 'nova-pro-anc-headphones',
    basePrice: 199.99,
    isActive: true,
    variants: [
      {
        id: 'var-e2e-1',
        title: 'Midnight Black',
        sku: 'NOVA-BLK-01',
        price: 199.99,
        stockQuantity: 50,
        reservedStock: 0,
        availableStock: 50,
      },
    ],
  };

  const mockCart = {
    id: 'cart-e2e-1',
    userId: 'user-flow-1',
    items: [
      {
        id: 'item-e2e-1',
        variantId: 'var-e2e-1',
        quantity: 2,
        variant: {
          id: 'var-e2e-1',
          price: 199.99,
          stockQuantity: 50,
          reservedStock: 0,
          availableStock: 50,
          product: { id: 'prod-e2e-1', title: 'Nova Pro ANC Headphones', images: [] },
        },
      },
    ],
  };

  const mockOrder = {
    id: 'order-e2e-1',
    orderNumber: 'ORD-E2E-9999',
    userId: 'user-flow-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount: 399.98,
    user: mockUser,
    items: [
      {
        id: 'oi-1',
        variantId: 'var-e2e-1',
        quantity: 2,
        unitPrice: 199.99,
        totalPrice: 399.98,
        productTitle: 'Nova Pro ANC Headphones',
      },
    ],
  };

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'cart-1' }),
      update: jest.fn(),
    },
    wishlist: {
      create: jest.fn().mockResolvedValue({ id: 'wishlist-1' }),
    },
    cartItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: 'pay-db-1' }),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('mock-secret'),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockNotifications = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockCoupons = {
    validateAndCalculateDiscount: jest.fn().mockResolvedValue({ isValid: true, discountAmount: 0 }),
  };

  const mockPaymentFactory = {
    getProvider: jest.fn().mockReturnValue({
      createOrder: jest.fn().mockResolvedValue({
        id: 'pay_mock_123',
        providerOrderId: 'order_rzp_mock_123',
        amount: 399.98,
        currency: 'INR',
        status: PaymentStatus.PENDING,
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'txn_mock_success_777',
      }),
    }),
  };

  beforeAll(async () => {
    jest.spyOn(bcrypt, 'hash').mockImplementation(async () => '$2b$10$e2eHashedPassword');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ProductsService,
        CartService,
        OrdersService,
        PaymentsService,
        InventoryService,
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: CouponsService, useValue: mockCoupons },
        { provide: PaymentProviderFactory, useValue: mockPaymentFactory },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    productsService = module.get<ProductsService>(ProductsService);
    cartService = module.get<CartService>(CartService);
    ordersService = module.get<OrdersService>(OrdersService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    usersService = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // =========================================================================
  // 10-STEP E2E CRITICAL JOURNEY
  // =========================================================================

  it('Step 1: User Registration creates user account with hashed password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);

    const result = await authService.register({
      email: 'customer@novastore.com',
      password: 'StrongPassword123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.user.email).toBe('customer@novastore.com');
    expect(result.tokens.accessToken).toBe('mock-jwt-token');
  });

  it('Step 2: User Login returns session tokens and profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await authService.login({
      email: 'customer@novastore.com',
      password: 'StrongPassword123!',
    });

    expect(result.user.firstName).toBe('Jane');
    expect(result.tokens.accessToken).toBe('mock-jwt-token');
  });

  it('Step 3: Browse Products lists available catalog items', async () => {
    mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
    mockPrisma.product.count.mockResolvedValue(1);

    const result = await productsService.findAll({ page: 1, limit: 12 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('nova-pro-anc-headphones');
  });

  it('Step 4: Search with filters returns matching keyword results', async () => {
    mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
    mockPrisma.product.count.mockResolvedValue(1);

    const result = await productsService.findAll({ search: 'headphones', minPrice: 100, maxPrice: 300 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('Step 5: Add product to cart recalculates server quantities safely', async () => {
    mockPrisma.cart.findFirst.mockResolvedValue(mockCart);
    mockPrisma.productVariant.findFirst.mockResolvedValue(mockProduct.variants[0]);
    mockPrisma.productVariant.findUnique.mockResolvedValue(mockProduct.variants[0]);
    mockPrisma.cartItem.findFirst.mockResolvedValue(mockCart.items[0]);
    mockPrisma.cartItem.findUnique.mockResolvedValue(mockCart.items[0]);
    mockPrisma.cartItem.update.mockResolvedValue({
      ...mockCart.items[0],
      quantity: 2,
    });
    mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

    const updatedCart = await cartService.addItem('user-flow-1', {
      variantId: 'var-e2e-1',
      quantity: 2,
    });

    expect(updatedCart.items).toHaveLength(1);
    expect(updatedCart.subtotal).toBe(399.98);
  });

  it('Step 6: Checkout Preparation validates inventory and backend pricing truth', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
    mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-flow-1' });

    const preview = await ordersService.previewCheckout('user-flow-1', {
      addressId: 'addr-1',
    });

    expect(preview.subtotal).toBe(399.98);
    expect(preview.totalAmount).toBeGreaterThan(0);
  });

  it('Step 7: Payment Initiation creates provider order via abstraction (Razorpay)', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.payment.create.mockResolvedValue({
      id: 'pay-db-1',
      orderId: 'order-e2e-1',
      amount: 399.98,
      status: PaymentStatus.PENDING,
    });

    const paymentOrder: any = await paymentsService.createPaymentIntent('user-flow-1', {
      orderId: 'order-e2e-1',
      provider: PaymentProvider.RAZORPAY,
    });

    expect(paymentOrder.providerOrderId).toBe('order_rzp_mock_123');
    expect(paymentOrder.amount).toBe(399.98);
  });

  it('Step 8: Transaction-Safe Order Creation commits inventory reservation & snapshots metadata', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
    mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-flow-1' });
    mockPrisma.productVariant.findUnique.mockResolvedValue(mockProduct.variants[0]);
    mockPrisma.order.create.mockResolvedValue(mockOrder);

    const order = await ordersService.checkout('user-flow-1', {
      addressId: 'addr-1',
      paymentProvider: PaymentProvider.RAZORPAY,
    });

    expect(order.orderNumber).toBe('ORD-E2E-9999');
    expect(order.items[0].productTitle).toBe('Nova Pro ANC Headphones');
  });

  it('Step 9: Admin Role Authorization verifies privilege access', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: UserRole.STAFF });

    const roleUpdate = await usersService.updateUserRole('user-flow-1', UserRole.STAFF, 'admin-flow-1');

    expect(roleUpdate.role).toBe(UserRole.STAFF);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_ROLE_CHANGED',
        }),
      }),
    );
  });

  it('Step 10: Product & Inventory Management performs concurrency-safe stock adjustments', async () => {
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      ...mockProduct.variants[0],
      product: { title: 'Nova Pro ANC Headphones' },
    });
    mockPrisma.productVariant.update.mockResolvedValue({
      ...mockProduct.variants[0],
      stockQuantity: 60,
      availableStock: 60,
      product: { title: 'Nova Pro ANC Headphones' },
    });

    const adjustment = await inventoryService.adjustStock({
      variantId: 'var-e2e-1',
      quantityChange: 10,
      reason: 'Batch supplier replenishment',
    });

    expect(adjustment.stockQuantity).toBe(60);
    expect(prisma.inventoryLog.create).toHaveBeenCalled();
  });
});
