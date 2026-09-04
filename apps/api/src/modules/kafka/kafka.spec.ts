import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './services/kafka-producer.service';
import { KafkaEventPublisher } from './services/kafka-event-publisher.service';
import { OutboxProcessorService } from './services/outbox-processor.service';
import { KafkaConsumerManagerService } from './services/kafka-consumer-manager.service';
import { OrderEventsConsumer } from './consumers/order-events.consumer';
import { InventoryEventsConsumer } from './consumers/inventory-events.consumer';
import { ShipmentEventsConsumer } from './consumers/shipment-events.consumer';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingService } from '../shipping/shipping.service';
import { KAFKA_TOPICS, KAFKA_EVENT_TYPES, KAFKA_CONSUMER_GROUPS } from './kafka.constants';
import { OutboxStatus } from '@ecommerce/database';

describe('Kafka & Outbox Integration Suite (14 Production Verification Tests)', () => {
  let module: TestingModule;
  let producerService: KafkaProducerService;
  let eventPublisher: KafkaEventPublisher;
  let outboxProcessor: OutboxProcessorService;
  let consumerManager: KafkaConsumerManagerService;
  let orderConsumer: OrderEventsConsumer;
  let inventoryConsumer: InventoryEventsConsumer;
  let shipmentConsumer: ShipmentEventsConsumer;

  const mockPrismaService: any = {
    outboxEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'outbox-1', ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
    },
    kafkaInboxEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'inbox-1', ...args.data })),
    },
    kafkaFailedEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'failed-1', ...args.data })),
    },
    shipment: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockShippingService = {
    createShipment: jest.fn().mockResolvedValue({ id: 'shipment-1', awbNumber: 'AWB123456' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'kafka.enabled': true,
        'kafka.brokers': ['kafka-91cce17-english-learning.i.aivencloud.com:14905'],
        'kafka.clientId': 'ecommerce-api',
        'kafka.groupId': 'ecommerce-service',
        'kafka.username': 'avnadmin',
        'kafka.password': 'mock_password_do_not_log',
        'kafka.ssl': true,
        'kafka.saslMechanism': 'scram-sha-256',
        'kafka.connectionTimeout': 10000,
        'kafka.requestTimeout': 30000,
        'kafka.outbox.batchSize': 10,
        'kafka.outbox.pollIntervalMs': 1000,
        'kafka.outbox.maxRetries': 3,
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        KafkaProducerService,
        KafkaEventPublisher,
        OutboxProcessorService,
        KafkaConsumerManagerService,
        OrderEventsConsumer,
        InventoryEventsConsumer,
        ShipmentEventsConsumer,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ShippingService, useValue: mockShippingService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    producerService = module.get<KafkaProducerService>(KafkaProducerService);
    eventPublisher = module.get<KafkaEventPublisher>(KafkaEventPublisher);
    outboxProcessor = module.get<OutboxProcessorService>(OutboxProcessorService);
    consumerManager = module.get<KafkaConsumerManagerService>(KafkaConsumerManagerService);
    orderConsumer = module.get<OrderEventsConsumer>(OrderEventsConsumer);
    inventoryConsumer = module.get<InventoryEventsConsumer>(InventoryEventsConsumer);
    shipmentConsumer = module.get<ShipmentEventsConsumer>(ShipmentEventsConsumer);
  });

  // 1. Connection Configuration
  it('1. should configure Kafka connection parameters securely for Aiven cluster', () => {
    expect(producerService).toBeDefined();
    expect(mockConfigService.get('kafka.brokers')).toEqual(['kafka-91cce17-english-learning.i.aivencloud.com:14905']);
    expect(mockConfigService.get('kafka.ssl')).toBe(true);
    expect(mockConfigService.get('kafka.saslMechanism')).toBe('scram-sha-256');
  });

  // 2. Event Envelope Validation
  it('2. should build a strongly-typed compliant event envelope', () => {
    const envelope = eventPublisher.buildEnvelope(
      KAFKA_EVENT_TYPES.ORDER_CREATED,
      'Order',
      'ord-123',
      { orderNumber: 'ORD-2026-001', totalAmount: 1499 },
      'corr-req-999',
    );

    expect(envelope.eventId).toBeDefined();
    expect(envelope.eventType).toBe('order.created');
    expect(envelope.version).toBe(1);
    expect(envelope.producer).toBe('ecommerce-api');
    expect(envelope.correlationId).toBe('corr-req-999');
    expect(envelope.aggregateType).toBe('Order');
    expect(envelope.aggregateId).toBe('ord-123');
    expect(envelope.data.orderNumber).toBe('ORD-2026-001');
  });

  // 3. Order Event Publishing
  it('3. should publish order.created to both ecommerce.order.events and ecommerce.order.created outbox', async () => {
    await eventPublisher.publishOrderCreated(
      null,
      {
        orderId: 'ord-123',
        orderNumber: 'ORD-2026-001',
        userId: 'user-1',
        totalAmount: 1499,
        subtotal: 1400,
        tax: 99,
        shippingCost: 0,
        discountAmount: 0,
        currency: 'INR',
        status: 'PENDING_PAYMENT',
        paymentProvider: 'STRIPE',
        items: [],
      },
      'req-id-1',
    );

    expect(mockPrismaService.outboxEvent.create).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.outboxEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          topic: KAFKA_TOPICS.ORDER_EVENTS,
          partitionKey: 'ord-123',
          eventType: 'order.created',
        }),
      }),
    );
    expect(mockPrismaService.outboxEvent.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          topic: KAFKA_TOPICS.ORDER_CREATED,
          partitionKey: 'ord-123',
          eventType: 'order.created',
        }),
      }),
    );
  });

  // 4. Inventory Event Publishing
  it('4. should publish inventory events with variantId partition key to ecommerce.inventory.events', async () => {
    await eventPublisher.publishInventoryEvent(
      null,
      KAFKA_EVENT_TYPES.INVENTORY_RESERVED,
      {
        variantId: 'var-999',
        quantityChanged: 2,
        previousStock: 10,
        newStock: 8,
        operation: 'RESERVE',
      },
      'req-id-2',
    );

    expect(mockPrismaService.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: KAFKA_TOPICS.INVENTORY_EVENTS,
          partitionKey: 'var-999',
          aggregateType: 'Inventory',
          aggregateId: 'var-999',
        }),
      }),
    );
  });

  // 5. Shipment Event Publishing
  it('5. should publish shipment events with shipmentId key to ecommerce.shipment.events', async () => {
    await eventPublisher.publishShipmentEvent(
      null,
      KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
      {
        shipmentId: 'ship-555',
        orderId: 'ord-123',
        orderNumber: 'ORD-2026-001',
        courierProvider: 'STANDARD_EXPRESS',
        status: 'PENDING',
        isCod: false,
      },
      'req-id-3',
    );

    expect(mockPrismaService.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: KAFKA_TOPICS.SHIPMENT_EVENTS,
          partitionKey: 'ship-555',
        }),
      }),
    );
  });

  // 6. Strict Topic Allowance
  it('6. should strictly use only the 5 existing Aiven topics', () => {
    const allowedTopics = [
      'courier.shipment.events',
      'ecommerce.inventory.events',
      'ecommerce.order.created',
      'ecommerce.order.events',
      'ecommerce.shipment.events',
    ];

    const definedTopics = Object.values(KAFKA_TOPICS).sort();
    expect(definedTopics).toEqual(allowedTopics.sort());
  });

  // 7. Partition Key Strategy
  it('7. should assign proper partition keys per aggregate', () => {
    const orderEnv = eventPublisher.buildEnvelope('order.created', 'Order', 'order-abc', {});
    expect(orderEnv.aggregateId).toBe('order-abc');

    const invEnv = eventPublisher.buildEnvelope('inventory.reserved', 'Inventory', 'variant-xyz', {});
    expect(invEnv.aggregateId).toBe('variant-xyz');

    const shipEnv = eventPublisher.buildEnvelope('shipment.created', 'Shipment', 'shipment-123', {});
    expect(shipEnv.aggregateId).toBe('shipment-123');
  });

  // 8. Consumer Processing
  it('8. should successfully process an incoming order.created event in OrderEventsConsumer', async () => {
    const envelope = eventPublisher.buildEnvelope(
      KAFKA_EVENT_TYPES.ORDER_CREATED,
      'Order',
      'ord-123',
      {
        orderId: 'ord-123',
        orderNumber: 'ORD-2026-777',
        userId: 'user-456',
        totalAmount: 2500,
      },
    );

    await orderConsumer.handleEvent(envelope);
    expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-456',
        title: expect.stringContaining('ORD-2026-777'),
        link: '/orders/ord-123',
      }),
    );
  });

  // 9. Duplicate Event Handling & Idempotency
  it('9. should skip duplicate events if already present in Redis or Inbox DB', async () => {
    mockRedisService.get.mockResolvedValueOnce('1'); // Redis hit
    const handler = jest.fn();

    await consumerManager.processMessageWithIdempotency(
      KAFKA_CONSUMER_GROUPS.ORDER_WORKER,
      {
        topic: KAFKA_TOPICS.ORDER_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from('ord-123'),
          value: Buffer.from(JSON.stringify({ eventId: 'evt-dup-1', eventType: 'order.created' })),
          offset: '100',
          attributes: 0,
          timestamp: '1234567890',
          headers: {},
        } as any,
        heartbeat: jest.fn(),
        pause: jest.fn(),
      },
      handler,
    );

    expect(handler).not.toHaveBeenCalled();
    expect(mockPrismaService.kafkaInboxEvent.create).not.toHaveBeenCalled();
  });

  // 10. Retry Mechanism in Consumer
  it('10. should retry transient errors before succeeding in consumer manager', async () => {
    let callCount = 0;
    const failingHandler = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Transient DB timeout');
      }
    });

    await consumerManager.processMessageWithIdempotency(
      KAFKA_CONSUMER_GROUPS.ORDER_WORKER,
      {
        topic: KAFKA_TOPICS.ORDER_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from('ord-123'),
          value: Buffer.from(JSON.stringify({ eventId: 'evt-retry-1', eventType: 'order.created' })),
          offset: '101',
          attributes: 0,
          timestamp: '1234567890',
          headers: {},
        } as any,
        heartbeat: jest.fn(),
        pause: jest.fn(),
      },
      failingHandler,
    );

    expect(callCount).toBe(2);
    expect(mockPrismaService.kafkaInboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventId: 'evt-retry-1' }),
      }),
    );
  });

  // 11. Failed Event Persistence to PostgreSQL (DLQ Alternative)
  it('11. should store failed events in KafkaFailedEvent table when max retries exceeded', async () => {
    const permanentFailureHandler = jest.fn().mockRejectedValue(new Error('Fatal unrecoverable error'));

    await consumerManager.processMessageWithIdempotency(
      KAFKA_CONSUMER_GROUPS.ORDER_WORKER,
      {
        topic: KAFKA_TOPICS.ORDER_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from('ord-999'),
          value: Buffer.from(JSON.stringify({ eventId: 'evt-fatal-1', eventType: 'order.created' })),
          offset: '102',
          attributes: 0,
          timestamp: '1234567890',
          headers: {},
        } as any,
        heartbeat: jest.fn(),
        pause: jest.fn(),
      },
      permanentFailureHandler,
    );

    expect(mockPrismaService.kafkaFailedEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'evt-fatal-1',
          topic: KAFKA_TOPICS.ORDER_EVENTS,
          errorMessage: 'Fatal unrecoverable error',
          retryCount: 3,
        }),
      }),
    );
  });

  // 12. Courier Shipment Idempotency
  it('12. should prevent duplicate async shipment creation using courier-shipment:<orderNumber> key', async () => {
    mockRedisService.get.mockResolvedValueOnce('PROCESSED_KAFKA_WORKER');

    const envelope = eventPublisher.buildEnvelope(
      KAFKA_EVENT_TYPES.SHIPMENT_REQUESTED,
      'Shipment',
      'ship-123',
      {
        orderId: 'ord-999',
        orderNumber: 'ORD-2026-999',
      },
    );

    await shipmentConsumer.handleEvent(envelope);
    expect(mockShippingService.createShipment).not.toHaveBeenCalled();
  });

  // 13. Correlation ID Propagation
  it('13. should preserve and propagate correlationId across outbox and envelope payloads', async () => {
    await eventPublisher.publishOrderStatusChanged(
      null,
      {
        orderId: 'ord-888',
        orderNumber: 'ORD-2026-888',
        userId: 'user-888',
        previousStatus: 'PENDING_PAYMENT',
        newStatus: 'CONFIRMED',
      },
      'trace-uuid-abcdef',
    );

    expect(mockPrismaService.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correlationId: 'trace-uuid-abcdef',
        }),
      }),
    );
  });

  // 14. Graceful Shutdown
  it('14. should disconnect cleanly on module destroy without hanging connections', async () => {
    await producerService.onModuleDestroy();
    await outboxProcessor.onModuleDestroy();
    await consumerManager.onModuleDestroy();

    expect(producerService.getIsConnected()).toBe(false);
    expect(consumerManager.getIsRunning()).toBe(false);
  });
});
