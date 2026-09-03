import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CourierPlatformProvider } from './courier-platform.provider';
import { RedisService } from '../../redis/redis.service';
import { CourierStatusMappingService } from '../courier-status-mapping.service';
import { ShipmentStatus } from '@ecommerce/types';
import * as crypto from 'crypto';

describe('CourierPlatformProvider', () => {
  let provider: CourierPlatformProvider;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;
  let statusMappingService: CourierStatusMappingService;

  const mockWebhookSecret = 'test_webhook_secret_key_12345';
  const mockApiKey = 'test_api_key_novastore_secret';
  const mockBaseUrl = 'http://localhost:5000';

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'shipping.courierPlatform.baseUrl':
            return mockBaseUrl;
          case 'shipping.courierPlatform.apiKey':
            return mockApiKey;
          case 'shipping.courierPlatform.webhookSecret':
            return mockWebhookSecret;
          case 'shipping.courierPlatform.timeoutMs':
            return 5000;
          case 'shipping.courierPlatform.trackingBaseUrl':
            return 'http://localhost:5000/track';
          case 'shipping.courierPlatform.pickupPincode':
            return '110001';
          case 'shipping.courierPlatform.enabled':
            return true;
          default:
            return undefined;
        }
      }),
    } as any;

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    } as any;

    statusMappingService = new CourierStatusMappingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierPlatformProvider,
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        { provide: CourierStatusMappingService, useValue: statusMappingService },
      ],
    }).compile();

    provider = module.get<CourierPlatformProvider>(CourierPlatformProvider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Serviceability', () => {
    it('should successfully query serviceability for valid pincode', async () => {
      const mockResponse = {
        serviceable: true,
        pincode: '201301',
        city: 'Noida',
        state: 'Uttar Pradesh',
        codAvailable: true,
        estimatedDays: 2,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as any);

      const result = await provider.checkServiceability('201301');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/pricing/serviceability/201301`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Api-Key': mockApiKey,
          }),
        }),
      );
      expect(result.serviceable).toBe(true);
      expect(result.pincode).toBe('201301');
      expect(result.codAvailable).toBe(true);
      expect(result.estimatedDays).toBe(2);
    });

    it('should report unserviceable pincode correctly', async () => {
      const mockResponse = {
        serviceable: false,
        pincode: '999999',
        message: 'Destination pincode not in courier network',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as any);

      const result = await provider.checkServiceability('999999');
      expect(result.serviceable).toBe(false);
      expect(result.message).toContain('not in courier network');
    });
  });

  describe('Pricing Quote', () => {
    it('should request dynamic quote for COD package', async () => {
      const mockQuoteResponse = {
        shippingCost: 75.5,
        currency: 'INR',
        estimatedDays: 3,
        carrier: 'Express Logistics Air',
        breakdown: {
          freightCharge: 55.5,
          codCharge: 20,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockQuoteResponse,
      } as any);

      const quote = await provider.getQuote({
        pickupPincode: '110001',
        deliveryPincode: '201301',
        weight: 1.5,
        length: 25,
        width: 20,
        height: 15,
        shipmentType: 'COD',
        codAmount: 1499,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/pricing/quote`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            pickupPincode: '110001',
            deliveryPincode: '201301',
            weight: 1.5,
            length: 25,
            width: 20,
            height: 15,
            shipmentType: 'COD',
            codAmount: 1499,
          }),
        }),
      );
      expect(quote.shippingCost).toBe(75.5);
      expect(quote.currency).toBe('INR');
      expect(quote.carrier).toBe('Express Logistics Air');
    });
  });

  describe('Shipment Creation & Idempotency', () => {
    it('should create shipment with deterministic idempotency key and correct mapping', async () => {
      const mockShipmentResponse = {
        shipmentId: 'shp_90481_test',
        externalOrderId: 'ORD-2026-90481',
        trackingNumber: 'TRK-90481-DEL',
        awbNumber: 'AWB-90481-DEL',
        status: 'CREATED',
        shipmentType: 'COD',
        shippingCost: 65,
        codAmount: 1499,
        carrier: 'SpeedAir Express',
        estimatedDelivery: '2026-09-06T12:00:00Z',
        label: {
          format: 'LABEL_METADATA_ONLY',
          url: null,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockShipmentResponse,
      } as any);

      const result = await provider.createShipment({
        orderId: 'order_uuid_123',
        orderNumber: 'ORD-2026-90481',
        recipientName: 'Jane Customer',
        recipientPhone: '+919123456780',
        recipientAddress: {
          street: 'Flat 302, Green Valley Apartments',
          city: 'Noida',
          state: 'Uttar Pradesh',
          postalCode: '201301',
          country: 'India',
        },
        items: [
          {
            title: 'Classic Sneakers',
            sku: 'SHOE-001',
            quantity: 1,
            price: 1499,
          },
        ],
        totalAmount: 1499,
        isCod: true,
        codAmount: 1499,
        weightKg: 1.5,
        dimensions: { lengthCm: 25, widthCm: 20, heightCm: 15 },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/shipments`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Api-Key': mockApiKey,
            'Idempotency-Key': 'courier-shipment:ORD-2026-90481',
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(result.courierProvider).toBe('COURIER_PLATFORM');
      expect(result.awbNumber).toBe('AWB-90481-DEL');
      expect(result.status).toBe(ShipmentStatus.LABEL_CREATED);
      expect(result.labelUrl).toBe(''); // Does not fabricate fake PDF URL
      expect(result.metadata?.carrierTrackingNumber).toBe('TRK-90481-DEL');
      expect(result.metadata?.externalOrderId).toBe('ORD-2026-90481');
    });

    it('should recover existing shipment on 409 Conflict via GET by-external-order', async () => {
      const existingShipment = {
        shipmentId: 'shp_recovered_123',
        externalOrderId: 'ORD-2026-RECOVER',
        trackingNumber: 'TRK-RECOVER-999',
        status: 'IN_TRANSIT',
        shippingCost: 50,
      };

      // First call fails with 409, second call recovers via GET by-external-order
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ message: 'Duplicate shipment conflict' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => existingShipment,
        } as any);

      const result = await provider.createShipment({
        orderId: 'order_uuid_conflict',
        orderNumber: 'ORD-2026-RECOVER',
        recipientName: 'John Doe',
        recipientPhone: '+919876543210',
        recipientAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
        },
        items: [{ title: 'Item', sku: 'SKU', quantity: 1, price: 500 }],
        totalAmount: 500,
        isCod: false,
      });

      expect(result.status).toBe(ShipmentStatus.IN_TRANSIT);
      expect(result.awbNumber).toBe('TRK-RECOVER-999');
      expect(result.metadata?.courierShipmentId).toBe('shp_recovered_123');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid HMAC-SHA256 signature with matching timestamp', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const payload = {
        eventId: 'evt_test_123',
        status: 'DELIVERED',
        trackingNumber: 'TRK-12345',
      };
      const rawBody = JSON.stringify(payload);

      const hmac = crypto.createHmac('sha256', mockWebhookSecret);
      hmac.update(`${timestamp}.${rawBody}`);
      const validSignature = hmac.digest('hex');

      const headers = {
        'x-courier-event-id': 'evt_test_123',
        'x-courier-timestamp': timestamp,
        'x-courier-signature': validSignature,
      };

      const isValid = provider.verifyWebhookSignature(headers, payload, rawBody);
      expect(isValid).toBe(true);
    });

    it('should reject tampered payload or invalid signature', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const payload = { status: 'DELIVERED' };
      const rawBody = JSON.stringify(payload);

      const headers = {
        'x-courier-event-id': 'evt_test_tampered',
        'x-courier-timestamp': timestamp,
        'x-courier-signature': '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      };

      const isValid = provider.verifyWebhookSignature(headers, payload, rawBody);
      expect(isValid).toBe(false);
    });

    it('should reject stale timestamps older than 5 minutes', () => {
      const staleTimestamp = String(Math.floor((Date.now() - 400 * 1000) / 1000)); // 400 seconds ago
      const payload = { status: 'IN_TRANSIT' };
      const rawBody = JSON.stringify(payload);

      const hmac = crypto.createHmac('sha256', mockWebhookSecret);
      hmac.update(`${staleTimestamp}.${rawBody}`);
      const signature = hmac.digest('hex');

      const headers = {
        'x-courier-event-id': 'evt_stale_123',
        'x-courier-timestamp': staleTimestamp,
        'x-courier-signature': signature,
      };

      const isValid = provider.verifyWebhookSignature(headers, payload, rawBody);
      expect(isValid).toBe(false);
    });
  });

  describe('Reconciliation', () => {
    it('should fetch reconciliation records with query parameters', async () => {
      const mockReconcileData = {
        shipments: [
          {
            shipmentId: 'shp_1',
            externalOrderId: 'ORD-001',
            trackingNumber: 'TRK-001',
            status: 'DELIVERED',
            updatedAt: '2026-09-03T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockReconcileData,
      } as any);

      const result = await provider.reconcileShipments({
        updatedAfter: '2026-09-01T00:00:00Z',
        page: 1,
        limit: 50,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/integrations/shipments/reconciliation?updatedAfter='),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'X-Api-Key': mockApiKey }),
        }),
      );
      expect(result.shipments.length).toBe(1);
      expect(result.shipments[0].status).toBe('DELIVERED');
    });
  });

  describe('Label & Cancellation', () => {
    it('should handle LABEL_METADATA_ONLY without fabricating PDF URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          trackingNumber: 'TRK-90481',
          carrier: 'Nova Logistics',
          label: { format: 'LABEL_METADATA_ONLY', url: null },
        }),
      } as any);

      const label = await provider.generateLabel('ORD-2026-90481');
      expect(label.labelUrl).toBe('');
      expect(label.barcode).toBe('*TRK-90481*');
      expect(label.courierName).toBe('Nova Logistics');
    });

    it('should cancel shipment with Idempotency-Key', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Cancelled successfully' }),
      } as any);

      const res = await provider.cancelShipment('ORD-2026-90481', 'Customer request');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/shipments/by-external-order/ORD-2026-90481/cancel`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Idempotency-Key': 'cancel-shipment:ORD-2026-90481',
          }),
        }),
      );
      expect(res.success).toBe(true);
    });
  });
});
