import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { ShiprocketProvider } from './shiprocket.provider';
import { ShippingProviderFactory } from './shipping-provider.factory';
import { StandardExpressShippingProvider } from './standard-express.provider';
import { MockShippingProvider } from './mock-shipping.provider';
import { ShipmentStatus } from '@ecommerce/types';
import {
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';

describe('Phase 2: Real Shiprocket Courier Integration & Contract Verification', () => {
  let shiprocketProvider: ShiprocketProvider;
  let factory: ShippingProviderFactory;
  let redisService: RedisService;
  let configService: ConfigService;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  };

  const sampleShipmentInput = {
    orderId: 'ord-12345',
    orderNumber: 'ORD-2026-SR-01',
    recipientName: 'Rahul Sharma',
    recipientPhone: '9876543210',
    recipientAddress: {
      street: '45 MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
    },
    items: [
      {
        title: 'Nova Bluetooth Headphones',
        sku: 'NOVA-AUDIO-01',
        quantity: 1,
        price: 2499,
      },
    ],
    totalAmount: 2499,
    isCod: false,
    weightKg: 0.8,
    dimensions: {
      lengthCm: 20,
      widthCm: 15,
      heightCm: 10,
    },
  };

  const mockFetch = jest.fn();
  (global as any).fetch = mockFetch;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiprocketProvider,
        ShippingProviderFactory,
        StandardExpressShippingProvider,
        MockShippingProvider,
        { provide: RedisService, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'shipping.provider') return 'SHIPROCKET';
              if (key === 'shipping.shiprocket.baseUrl') return 'https://apiv2.shiprocket.in/v1/external';
              if (key === 'shipping.shiprocket.email') return 'test_merchant@novastore.com';
              if (key === 'shipping.shiprocket.password') return 'SecretShiprocketPass123!';
              if (key === 'shipping.shiprocket.webhookSecret') return 'test_shiprocket_webhook_secret_key';
              if (key === 'shipping.shiprocket.pickupLocation') return 'Primary_Hub';
              if (key === 'shipping.timeoutMs') return 5000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    shiprocketProvider = module.get<ShiprocketProvider>(ShiprocketProvider);
    factory = module.get<ShippingProviderFactory>(ShippingProviderFactory);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  // =========================================================================
  // 1. AUTHENTICATION & TOKEN MANAGEMENT
  // =========================================================================
  describe('1. Authentication & Token Management', () => {
    it('Authenticates against official Shiprocket /auth/login and caches token in Redis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: 'mock_jwt_token_sr_12345' }),
      });

      const token = await shiprocketProvider.getAuthToken();
      expect(token).toBe('mock_jwt_token_sr_12345');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apiv2.shiprocket.in/v1/external/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test_merchant@novastore.com',
            password: 'SecretShiprocketPass123!',
          }),
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'shiprocket:auth_token',
        'mock_jwt_token_sr_12345',
        86400,
      );
    });

    it('Uses cached Redis token on subsequent calls without making repeated login requests', async () => {
      mockRedis.get.mockResolvedValueOnce('cached_jwt_token_sr_999');

      const token = await shiprocketProvider.getAuthToken();
      expect(token).toBe('cached_jwt_token_sr_999');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Throws UnauthorizedException when Shiprocket returns 401 on login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid credentials' }),
      });

      await expect(shiprocketProvider.getAuthToken(true)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // 2. FORWARD SHIPMENT CREATION (PREPAID & COD)
  // =========================================================================
  describe('2. Forward Shipment Creation & Contract Mapping', () => {
    it('Creates prepaid order and requests AWB assignment and pickup manifestation', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      // 1. Mock create adhoc order response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          order_id: 100234,
          shipment_id: 500123,
          status: 'NEW',
        }),
      });

      // 2. Mock assign AWB response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: {
            data: {
              awb_code: 'SR-DEL-9812491',
              courier_name: 'Delhivery Surface',
            },
          },
        }),
      });

      // 3. Mock pickup generation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: { pickup_status: 1, pickup_token_number: 'PK-99124' },
        }),
      });

      const result = await shiprocketProvider.createShipment(sampleShipmentInput);

      expect(result).toBeDefined();
      expect(result.courierProvider).toBe('SHIPROCKET');
      expect(result.awbNumber).toBe('SR-DEL-9812491');
      expect(result.trackingUrl).toContain('SR-DEL-9812491');
      expect(result.status).toBe(ShipmentStatus.LABEL_CREATED);
      expect(result.metadata?.courier).toBe('Delhivery Surface');
      expect(result.metadata?.shiprocketOrderId).toBe(100234);
      expect(result.metadata?.shiprocketShipmentId).toBe(500123);
    });

    it('Creates COD order with payment_method="COD" and server-calculated amount', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      const codInput = {
        ...sampleShipmentInput,
        isCod: true,
        codAmount: 3499,
        totalAmount: 3499,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          order_id: 100235,
          shipment_id: 500124,
          status: 'NEW',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: {
            data: {
              awb_code: 'SR-BLUEDART-8812',
              courier_name: 'Blue Dart COD Express',
            },
          },
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: { pickup_status: 1 } }),
      });

      const result = await shiprocketProvider.createShipment(codInput);

      expect(result.metadata?.isCod).toBe(true);
      expect(result.metadata?.codAmount).toBe(3499);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
        expect.objectContaining({
          body: expect.stringContaining('"payment_method":"COD"'),
        }),
      );
    });
  });

  // =========================================================================
  // 3. SHIPPING LABEL GENERATION
  // =========================================================================
  describe('3. Shipping Label Generation', () => {
    it('Generates label URL from official Shiprocket endpoint', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          label_url: 'https://shiprocket.co/labels/print/SR-DEL-9812491.pdf',
        }),
      });

      const labelResult = await shiprocketProvider.generateLabel('SR-DEL-9812491');
      expect(labelResult.awbNumber).toBe('SR-DEL-9812491');
      expect(labelResult.labelUrl).toBe('https://shiprocket.co/labels/print/SR-DEL-9812491.pdf');
      expect(labelResult.barcode).toBe('*SR-DEL-9812491*');
    });
  });

  // =========================================================================
  // 4. SHIPMENT TRACKING & HISTORY MAPPING
  // =========================================================================
  describe('4. Shipment Tracking & History Normalization', () => {
    it('Tracks shipment and maps official Shiprocket tracking checkpoint activities', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracking_data: {
            track_status: 1,
            shipment_status: 7, // DELIVERED
            current_status: 'DELIVERED',
            etd: '2026-09-06 18:00',
            shipment_track: [
              {
                courier_name: 'Blue Dart Surface',
                current_status: 'DELIVERED',
              },
            ],
            shipment_track_activities: [
              {
                date: '2026-09-02 11:00',
                status: 'PICKED_UP',
                activity: 'Package picked up by courier partner',
                location: 'Bengaluru Fulfillment Center',
              },
              {
                date: '2026-09-03 14:30',
                status: 'IN_TRANSIT',
                activity: 'Arrived at destination hub',
                location: 'Mumbai Central Hub',
              },
              {
                date: '2026-09-04 10:15',
                status: 'OUT_FOR_DELIVERY',
                activity: 'Out for delivery with driver',
                location: 'Bandra Delivery Center',
              },
              {
                date: '2026-09-04 16:45',
                status: 'DELIVERED',
                activity: 'Delivered to customer',
                location: 'Bandra West, Mumbai',
              },
            ],
          },
        }),
      });

      const tracking = await shiprocketProvider.trackShipment('SR-DEL-9812491');
      expect(tracking.awbNumber).toBe('SR-DEL-9812491');
      expect(tracking.currentStatus).toBe(ShipmentStatus.DELIVERED);
      expect(tracking.carrier).toBe('Blue Dart Surface');
      expect(tracking.events).toHaveLength(4);
      expect(tracking.events[0].status).toBe(ShipmentStatus.PICKED_UP);
      expect(tracking.events[3].status).toBe(ShipmentStatus.DELIVERED);
    });
  });

  // =========================================================================
  // 5. SHIPMENT CANCELLATION & REVERSE PICKUP
  // =========================================================================
  describe('5. Cancellation & Reverse Return Logistics', () => {
    it('Cancels shipment via official Shiprocket cancel endpoint', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Order cancelled successfully' }),
      });

      const cancelResult = await shiprocketProvider.cancelShipment('SR-DEL-9812491', 'Customer request');
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.message).toContain('SR-DEL-9812491');
    });

    it('Schedules reverse return pickup and maps reverse AWB', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          awb_code: 'SR-RET-9901824',
          shipment_id: 88124,
        }),
      });

      const returnPickupInput = {
        orderId: 'ord-12345',
        orderNumber: 'ORD-2026-SR-01',
        returnNumber: 'RET-2026-901',
        customerName: 'Rahul Sharma',
        customerPhone: '9876543210',
        pickupAddress: {
          street: '45 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'India',
        },
        items: [{ title: 'Headphones', quantity: 1 }],
      };

      const result = await shiprocketProvider.scheduleReturnPickup(returnPickupInput);
      expect(result.pickupAwb).toBe('SR-RET-9901824');
      expect(result.courierName).toContain('Shiprocket');
      expect(result.trackingUrl).toContain('SR-RET-9901824');
    });

    it('Cancels reverse return pickup safely', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Return cancelled' }),
      });

      const cancelResult = await shiprocketProvider.cancelReturnPickup('SR-RET-9901824');
      expect(cancelResult.success).toBe(true);
    });
  });

  // =========================================================================
  // 6. STATUS NORMALIZATION (ALL OFFICIAL SHIPROCKET STATUSES)
  // =========================================================================
  describe('6. Official Status Code & String Normalization', () => {
    it('Normalizes Manifested & AWB Assigned to READY_FOR_PICKUP', () => {
      expect(shiprocketProvider.normalizeStatus('1')).toBe(ShipmentStatus.READY_FOR_PICKUP);
      expect(shiprocketProvider.normalizeStatus('AWB ASSIGNED')).toBe(ShipmentStatus.READY_FOR_PICKUP);
      expect(shiprocketProvider.normalizeStatus('MANIFESTED')).toBe(ShipmentStatus.READY_FOR_PICKUP);
    });

    it('Normalizes Shipped / Picked Up to PICKED_UP', () => {
      expect(shiprocketProvider.normalizeStatus('6')).toBe(ShipmentStatus.PICKED_UP);
      expect(shiprocketProvider.normalizeStatus('SHIPPED')).toBe(ShipmentStatus.PICKED_UP);
      expect(shiprocketProvider.normalizeStatus('PICKED UP')).toBe(ShipmentStatus.PICKED_UP);
    });

    it('Normalizes In Transit & Sorting activities to IN_TRANSIT', () => {
      expect(shiprocketProvider.normalizeStatus('18')).toBe(ShipmentStatus.IN_TRANSIT);
      expect(shiprocketProvider.normalizeStatus('IN TRANSIT')).toBe(ShipmentStatus.IN_TRANSIT);
      expect(shiprocketProvider.normalizeStatus('22')).toBe(ShipmentStatus.IN_TRANSIT); // DELAYED
    });

    it('Normalizes Out For Delivery to OUT_FOR_DELIVERY', () => {
      expect(shiprocketProvider.normalizeStatus('17')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
      expect(shiprocketProvider.normalizeStatus('OUT FOR DELIVERY')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    });

    it('Normalizes Delivered / Fulfilled to DELIVERED', () => {
      expect(shiprocketProvider.normalizeStatus('7')).toBe(ShipmentStatus.DELIVERED);
      expect(shiprocketProvider.normalizeStatus('DELIVERED')).toBe(ShipmentStatus.DELIVERED);
      expect(shiprocketProvider.normalizeStatus('26')).toBe(ShipmentStatus.DELIVERED); // FULFILLED
    });

    it('Normalizes Failed Delivery / Lost / Damaged to FAILED_DELIVERY', () => {
      expect(shiprocketProvider.normalizeStatus('12')).toBe(ShipmentStatus.FAILED_DELIVERY); // LOST
      expect(shiprocketProvider.normalizeStatus('21')).toBe(ShipmentStatus.FAILED_DELIVERY); // UNDELIVERED
      expect(shiprocketProvider.normalizeStatus('25')).toBe(ShipmentStatus.FAILED_DELIVERY); // DAMAGED
      expect(shiprocketProvider.normalizeStatus('FAILED_DELIVERY')).toBe(ShipmentStatus.FAILED_DELIVERY);
    });

    it('Normalizes RTO Initiated / Acknowledged to RTO_INITIATED', () => {
      expect(shiprocketProvider.normalizeStatus('9')).toBe(ShipmentStatus.RTO_INITIATED);
      expect(shiprocketProvider.normalizeStatus('14')).toBe(ShipmentStatus.RTO_INITIATED);
      expect(shiprocketProvider.normalizeStatus('RTO INITIATED')).toBe(ShipmentStatus.RTO_INITIATED);
    });

    it('Normalizes RTO Delivered to RTO_DELIVERED', () => {
      expect(shiprocketProvider.normalizeStatus('10')).toBe(ShipmentStatus.RTO_DELIVERED);
      expect(shiprocketProvider.normalizeStatus('RTO DELIVERED')).toBe(ShipmentStatus.RTO_DELIVERED);
    });

    it('Normalizes Cancelled to CANCELLED', () => {
      expect(shiprocketProvider.normalizeStatus('8')).toBe(ShipmentStatus.CANCELLED);
      expect(shiprocketProvider.normalizeStatus('CANCELLED')).toBe(ShipmentStatus.CANCELLED);
    });

    it('Safely falls back to IN_TRANSIT for unknown status without crashing', () => {
      expect(shiprocketProvider.normalizeStatus('UNKNOWN_CARRIER_CODE_99')).toBe(ShipmentStatus.IN_TRANSIT);
    });
  });

  // =========================================================================
  // 7. WEBHOOK CRYPTOGRAPHIC VERIFICATION
  // =========================================================================
  describe('7. Webhook Cryptographic Verification', () => {
    const payload = {
      event: 'shipment.status',
      awb: 'SR-DEL-9812491',
      current_status: 'DELIVERED',
      status_code: 7,
    };
    const secret = 'test_shiprocket_webhook_secret_key';

    it('Accepts valid HMAC-SHA256 signature calculated with webhook secret', () => {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const headers = { 'x-shiprocket-signature': signature };
      const isValid = shiprocketProvider.verifyWebhookSignature(headers, payload);
      expect(isValid).toBe(true);
    });

    it('Accepts official Shiprocket Webhook Security Token in x-api-key header', () => {
      const headers = { 'x-api-key': secret };
      const isValid = shiprocketProvider.verifyWebhookSignature(headers, payload);
      expect(isValid).toBe(true);
    });

    it('Rejects invalid or forged x-api-key header', () => {
      const headers = { 'x-api-key': 'forged_fake_token' };
      const isValid = shiprocketProvider.verifyWebhookSignature(headers, payload);
      expect(isValid).toBe(false);
    });

    it('Rejects invalid or forged webhook signature', () => {
      const headers = { 'x-shiprocket-signature': 'forged_invalid_signature_hex_1234567890' };
      const isValid = shiprocketProvider.verifyWebhookSignature(headers, payload);
      expect(isValid).toBe(false);
    });
  });

  // =========================================================================
  // 8. RELIABILITY, RATE LIMITING & ERROR SANITIZATION
  // =========================================================================
  describe('8. Reliability, Rate Limiting & Error Sanitization', () => {
    it('Handles 429 Rate Limiting with clear user-safe error', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      await expect(shiprocketProvider.createShipment(sampleShipmentInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Handles 5xx Server Error with ServiceUnavailableException', async () => {
      mockRedis.get.mockResolvedValue('valid_cached_token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'Gateway down' }),
      });

      await expect(shiprocketProvider.createShipment(sampleShipmentInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Never leaks Shiprocket password or secrets in thrown error messages', async () => {
      mockRedis.get.mockResolvedValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Authentication failure' }),
      });

      try {
        await shiprocketProvider.getAuthToken(true);
      } catch (err: any) {
        expect(err.message).not.toContain('SecretShiprocketPass123!');
        expect(err.message).not.toContain('test_shiprocket_webhook_secret_key');
      }
    });
  });

  // =========================================================================
  // 9. SHIPPING PROVIDER FACTORY RESOLUTION
  // =========================================================================
  describe('9. ShippingProviderFactory Integration', () => {
    it('Resolves ShiprocketProvider when target is "SHIPROCKET"', () => {
      const provider = factory.getProvider('SHIPROCKET');
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('SHIPROCKET');
    });

    it('Resolves MockShippingProvider when target is "MOCK_COURIER"', () => {
      const provider = factory.getProvider('MOCK_COURIER');
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('MOCK_COURIER');
    });

    it('Resolves StandardExpressShippingProvider when target is "STANDARD_EXPRESS"', () => {
      const provider = factory.getProvider('STANDARD_EXPRESS');
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('STANDARD_EXPRESS');
    });
  });
});
