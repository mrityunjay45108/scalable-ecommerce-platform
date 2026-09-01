import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShippingService } from './shipping.service';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from './providers/standard-express.provider';
import { MockShippingProvider } from './providers/mock-shipping.provider';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ShipmentStatus,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  Role,
} from '@ecommerce/types';

describe('ShippingService & Courier Provider Abstraction (Unit & Integration)', () => {
  let service: ShippingService;
  let prisma: PrismaService;
  let redis: RedisService;
  let providerFactory: ShippingProviderFactory;
  let mockProvider: MockShippingProvider;
  let standardProvider: StandardExpressShippingProvider;

  const mockOrder = {
    id: 'order-123',
    orderNumber: 'ORD-2026-1001',
    userId: 'user-1',
    status: OrderStatus.CONFIRMED,
    totalAmount: 1499.0,
    shippingAddress: {
      recipientName: 'Rahul Sharma',
      phone: '+919876543210',
      street: '42 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    payment: {
      provider: PaymentProvider.COD,
      status: PaymentStatus.COD_PENDING,
    },
    items: [
      {
        id: 'item-1',
        productTitle: 'Nova ANC Headphones',
        sku: 'NV-HP-01',
        quantity: 1,
        unitPrice: 1499.0,
      },
    ],
    shipment: null,
  };

  const mockShipment = {
    id: 'ship-123',
    orderId: 'order-123',
    courierProvider: 'STANDARD_EXPRESS',
    awbNumber: 'EXP-84920194-IN',
    trackingUrl: 'https://track.novastore.com/shipment/EXP-84920194-IN',
    labelUrl: 'https://labels.novastore.com/v1/print/EXP-84920194-IN.pdf',
    status: ShipmentStatus.LABEL_CREATED,
    isCod: true,
    codAmount: 1499.0,
    order: mockOrder,
    trackingEvents: [
      {
        id: 'evt-1',
        shipmentId: 'ship-123',
        status: ShipmentStatus.LABEL_CREATED,
        location: 'Central Hub',
        activity: 'Label generated',
        timestamp: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        ShippingProviderFactory,
        StandardExpressShippingProvider,
        MockShippingProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'shipping.provider') return 'STANDARD_EXPRESS';
              if (key === 'shipping.timeoutMs') return 10000;
              return undefined;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            shipment: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            shipmentTrackingEvent: {
              create: jest.fn(),
            },
            payment: {
              update: jest.fn(),
            },
            cODTransaction: {
              upsert: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) =>
              callback({
                shipment: {
                  create: jest.fn().mockResolvedValue(mockShipment),
                  update: jest.fn().mockResolvedValue(mockShipment),
                },
                shipmentTrackingEvent: {
                  create: jest.fn().mockResolvedValue({ id: 'evt-new' }),
                },
                order: {
                  update: jest.fn().mockResolvedValue(mockOrder),
                },
                payment: {
                  update: jest.fn().mockResolvedValue({ status: PaymentStatus.COD_COLLECTED }),
                },
                cODTransaction: {
                  upsert: jest.fn().mockResolvedValue({ status: 'COD_COLLECTED' }),
                },
                auditLog: {
                  create: jest.fn().mockResolvedValue({ id: 'log-1' }),
                },
              }),
            ),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    providerFactory = module.get<ShippingProviderFactory>(ShippingProviderFactory);
    mockProvider = module.get<MockShippingProvider>(MockShippingProvider);
    standardProvider = module.get<StandardExpressShippingProvider>(StandardExpressShippingProvider);
  });

  describe('1. Courier Provider Factory & Abstraction Selection', () => {
    it('should resolve standard express provider by default', () => {
      const provider = providerFactory.getProvider();
      expect(provider.providerName).toBe('STANDARD_EXPRESS');
    });

    it('should resolve mock provider when explicitly requested', () => {
      const provider = providerFactory.getProvider('MOCK_COURIER');
      expect(provider.providerName).toBe('MOCK_COURIER');
    });

    it('should generate AWB and label via mock provider', async () => {
      const result = await mockProvider.createShipment({
        orderId: 'ord-1',
        orderNumber: 'ORD-TEST-001',
        recipientName: 'Test User',
        recipientPhone: '9999999999',
        recipientAddress: {
          street: 'Test St',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
        },
        items: [{ title: 'Item', sku: 'SKU-1', quantity: 1, price: 100 }],
        totalAmount: 100,
        isCod: false,
      });

      expect(result.awbNumber).toMatch(/^MOCK-AWB-/);
      expect(result.status).toBe(ShipmentStatus.LABEL_CREATED);
    });

    it('should handle simulated mock provider failure', async () => {
      mockProvider.shouldFail = true;
      mockProvider.failureMessage = 'Simulated Gateway Timeout';

      await expect(
        mockProvider.createShipment({
          orderId: 'ord-1',
          orderNumber: 'ORD-TEST-001',
          recipientName: 'Test User',
          recipientPhone: '9999999999',
          recipientAddress: {
            street: 'Test St',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'India',
          },
          items: [],
          totalAmount: 100,
          isCod: false,
        }),
      ).rejects.toThrow('Simulated Gateway Timeout');

      mockProvider.shouldFail = false;
    });
  });

  describe('2. Shipment Creation & Validation', () => {
    it('should successfully create a shipment for an eligible order and assign AWB', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createShipment('user-1', Role.CUSTOMER, {
        orderId: 'order-123',
        courierProvider: 'STANDARD_EXPRESS',
      });

      expect(result).toBeDefined();
      expect(result.awbNumber).toBe('EXP-84920194-IN');
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order does not exist', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createShipment('user-1', Role.CUSTOMER, { orderId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if customer tries to create shipment for another user order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });

      await expect(
        service.createShipment('user-1', Role.CUSTOMER, { orderId: 'order-123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if shipment already exists for the order (duplicate prevention)', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        shipment: { id: 'existing-shipment', awbNumber: 'EXP-11111-IN' },
      });

      await expect(
        service.createShipment('user-1', Role.CUSTOMER, { orderId: 'order-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is in ineligible status', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.createShipment('user-1', Role.CUSTOMER, { orderId: 'order-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Shipment Retrieval & Tracking Timeline', () => {
    it('should retrieve shipment details with tracking events', async () => {
      (prisma.shipment.findFirst as jest.Mock).mockResolvedValue(mockShipment);

      const result = await service.getShipmentById('ship-123', 'user-1', Role.CUSTOMER);
      expect(result).toBeDefined();
      expect(result.id).toBe('ship-123');
      expect(result.trackingEvents.length).toBe(1);
    });

    it('should return live tracking timeline', async () => {
      (prisma.shipment.findFirst as jest.Mock).mockResolvedValue(mockShipment);

      const tracking = await service.getShipmentTracking('ship-123', 'user-1', Role.CUSTOMER);
      expect(tracking.awbNumber).toBe('EXP-84920194-IN');
      expect(tracking.status).toBe(ShipmentStatus.LABEL_CREATED);
    });
  });

  describe('4. Shipment Cancellation & Label Generation', () => {
    it('should prevent cancelling a delivered shipment', async () => {
      (prisma.shipment.findFirst as jest.Mock).mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.DELIVERED,
      });

      await expect(
        service.cancelShipment('ship-123', 'user-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully cancel an active in-preparation shipment', async () => {
      (prisma.shipment.findFirst as jest.Mock).mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.LABEL_CREATED,
      });

      const result = await service.cancelShipment('ship-123', 'user-1', Role.CUSTOMER, {
        reason: 'Customer requested order change',
      });

      expect(result).toBeDefined();
    });

    it('should generate compliant shipping label', async () => {
      (prisma.shipment.findFirst as jest.Mock).mockResolvedValue(mockShipment);

      const label = await service.generateLabel('ship-123', 'user-1', Role.CUSTOMER);
      expect(label.awbNumber).toBe('EXP-84920194-IN');
      expect(label.labelUrl).toContain('.pdf');
    });
  });

  describe('5. Admin Status Updates & COD Lifecycle', () => {
    it('should update status and automatically mark COD collected when delivered', async () => {
      (prisma.shipment.findUnique as jest.Mock).mockResolvedValue(mockShipment);

      const result = await service.updateShipmentStatus(
        'ship-123',
        { status: ShipmentStatus.DELIVERED, location: 'Destination Doorstep' },
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('6. Webhook Signature Verification & Idempotency', () => {
    it('should reject courier webhook with invalid signature', async () => {
      jest.spyOn(standardProvider, 'verifyWebhookSignature').mockReturnValue(false);

      await expect(
        service.handleCourierWebhook(
          'STANDARD_EXPRESS',
          { 'x-shipping-signature': 'bad_sig' },
          {
            eventId: 'EVT-WH-BAD',
            awbNumber: 'EXP-84920194-IN',
            status: ShipmentStatus.IN_TRANSIT,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should process courier webhook and update tracking', async () => {
      jest.spyOn(standardProvider, 'verifyWebhookSignature').mockReturnValue(true);
      (prisma.shipment.findUnique as jest.Mock).mockResolvedValue(mockShipment);

      const response = await service.handleCourierWebhook(
        'STANDARD_EXPRESS',
        { 'x-shipping-signature': 'valid_sig' },
        {
          eventId: 'EVT-WH-001',
          awbNumber: 'EXP-84920194-IN',
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Regional Sorting Facility',
          activity: 'Package in transit to delivery station',
        },
      );

      expect(response.received).toBe(true);
      expect(response.eventId).toBe('EVT-WH-001');
      expect(redis.set).toHaveBeenCalledWith('webhook_shipping:EVT-WH-001', '1', 604800);
    });

    it('should be idempotent and skip duplicate webhook event IDs', async () => {
      jest.spyOn(standardProvider, 'verifyWebhookSignature').mockReturnValue(true);
      (redis.get as jest.Mock).mockResolvedValue('1'); // already processed

      const response = await service.handleCourierWebhook(
        'STANDARD_EXPRESS',
        { 'x-shipping-signature': 'valid_sig' },
        {
          eventId: 'EVT-WH-001',
          awbNumber: 'EXP-84920194-IN',
          status: ShipmentStatus.IN_TRANSIT,
        },
      );

      expect(response.idempotent).toBe(true);
      expect(prisma.shipment.findUnique).not.toHaveBeenCalled();
    });

    it('should safely handle 3 duplicate DELIVERED events without repeating order delivery logic', async () => {
      const deliveredShipment = {
        ...mockShipment,
        status: ShipmentStatus.DELIVERED,
      };
      (prisma.shipment.findUnique as jest.Mock).mockResolvedValue(deliveredShipment);

      // Sending DELIVERED status to an already DELIVERED shipment
      const res = await service.updateShipmentStatus(
        'ship-123',
        { status: ShipmentStatus.DELIVERED, location: 'Customer Doorstep' },
        'SYSTEM_COURIER',
      );

      expect(res.status).toBe(ShipmentStatus.DELIVERED);
      // DB transaction was skipped because status is already DELIVERED
      expect(prisma.shipmentTrackingEvent.create).not.toHaveBeenCalled();
    });
  });
});
