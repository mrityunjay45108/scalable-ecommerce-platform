import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OTP_PROVIDER } from './providers/otp-provider.interface';
import { FakeWhatsAppOtpProvider } from './providers/fake-whatsapp-otp.provider';
import { normalizePhone, isValidE164, maskPhone } from './utils/phone.util';
import { BadRequestException, HttpException } from '@nestjs/common';

describe('OtpService & WhatsApp Provider', () => {
  let service: OtpService;
  let redisService: any;
  let prisma: any;
  let fakeProvider: FakeWhatsAppOtpProvider;

  const mockPhone = '+919876543210';

  beforeEach(async () => {
    const memoryStore = new Map<string, { val: string; ttl?: number }>();

    redisService = {
      get: jest.fn(async (key: string) => {
        const item = memoryStore.get(key);
        return item ? item.val : null;
      }),
      set: jest.fn(async (key: string, val: string, ttl?: number) => {
        memoryStore.set(key, { val, ttl });
      }),
      del: jest.fn(async (key: string) => {
        memoryStore.delete(key);
      }),
      ttl: jest.fn(async (key: string) => {
        const item = memoryStore.get(key);
        return item?.ttl || 60;
      }),
      incr: jest.fn(async (key: string) => {
        const item = memoryStore.get(key);
        const count = item ? parseInt(item.val, 10) + 1 : 1;
        memoryStore.set(key, { val: String(count) });
        return count;
      }),
    };

    prisma = {
      otpVerification: {
        create: jest.fn().mockResolvedValue({ id: 'mock-verification-uuid' }),
        update: jest.fn().mockResolvedValue({ id: 'mock-verification-uuid' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    fakeProvider = new FakeWhatsAppOtpProvider();
    FakeWhatsAppOtpProvider.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: RedisService, useValue: redisService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => def),
          },
        },
        { provide: OTP_PROVIDER, useValue: fakeProvider },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('Phone Utilities', () => {
    it('should normalize 10-digit Indian numbers to E.164 with +91', () => {
      expect(normalizePhone('9876543210')).toBe('+919876543210');
      expect(normalizePhone('09876543210')).toBe('+919876543210');
      expect(normalizePhone(' 98765-43210 ')).toBe('+919876543210');
      expect(normalizePhone('+919876543210')).toBe('+919876543210');
      expect(normalizePhone('+1 (555) 234-5678')).toBe('+15552345678');
    });

    it('should validate E.164 phone formats accurately', () => {
      expect(isValidE164('+919876543210')).toBe(true);
      expect(isValidE164('+15552345678')).toBe(true);
      expect(isValidE164('9876543210')).toBe(false);
      expect(isValidE164('abc')).toBe(false);
    });

    it('should mask phone numbers for safe logging without exposing full identity', () => {
      const masked = maskPhone('+919876543210');
      expect(masked).toBe('+9198******10');
      expect(masked).not.toContain('765432');
    });
  });

  describe('OTP Generation & Hashing', () => {
    it('should generate a 6-digit cryptographically secure numeric OTP', () => {
      for (let i = 0; i < 20; i++) {
        const otp = service.generateOtp();
        expect(otp).toHaveLength(6);
        expect(/^\d{6}$/.test(otp)).toBe(true);
        expect(parseInt(otp, 10)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(otp, 10)).toBeLessThan(1000000);
      }
    });

    it('should hash OTP using HMAC-SHA256 and never store raw plaintext', () => {
      const otp = '482931';
      const hash1 = service.hashOtp(otp);
      const hash2 = service.hashOtp(otp);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(otp);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });
  });

  describe('sendOtp', () => {
    it('should generate OTP, store hashed state in Redis, and dispatch via WhatsApp provider', async () => {
      const result = await service.sendOtp(mockPhone, 'REGISTRATION', 'user-123');

      expect(result).toHaveProperty('verificationId');
      expect(result.expiresIn).toBe(300);
      expect(result.resendAfter).toBe(60);
      expect(result.phone).toBe('+9198******10');

      // Check Fake WhatsApp Provider received message
      const dispatchedOtp = FakeWhatsAppOtpProvider.getLastDispatchedOtp(mockPhone);
      expect(dispatchedOtp).toBeDefined();
      expect(dispatchedOtp).toHaveLength(6);

      // Verify state was saved to Redis
      expect(redisService.set).toHaveBeenCalledWith(
        `auth:otp:REGISTRATION:${mockPhone}`,
        expect.stringContaining(result.verificationId),
        300,
      );
    });

    it('should enforce 60-second cooldown on consecutive send requests', async () => {
      await service.sendOtp(mockPhone, 'REGISTRATION');

      // Immediate second request must throw 429 TOO_MANY_REQUESTS
      await expect(service.sendOtp(mockPhone, 'REGISTRATION')).rejects.toThrow(HttpException);
    });

    it('should enforce hourly rate limit on excessive requests', async () => {
      redisService.incr.mockResolvedValueOnce(11); // simulate 11th request

      await expect(service.sendOtp(mockPhone, 'REGISTRATION')).rejects.toThrow(HttpException);
    });
  });

  describe('verifyOtp', () => {
    it('should successfully verify correct OTP and clean up Redis state', async () => {
      const sendResult = await service.sendOtp(mockPhone, 'REGISTRATION', 'user-123');
      const otp = FakeWhatsAppOtpProvider.getLastDispatchedOtp(mockPhone)!;

      const verifyResult = await service.verifyOtp(sendResult.verificationId, mockPhone, otp);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.userId).toBe('user-123');

      // Verify OTP consumed from Redis
      expect(redisService.del).toHaveBeenCalledWith(`auth:otp:REGISTRATION:${mockPhone}`);
      expect(redisService.del).toHaveBeenCalledWith(`auth:otp:verification_id:${sendResult.verificationId}`);
    });

    it('should reject incorrect OTP and decrement remaining attempts', async () => {
      const sendResult = await service.sendOtp(mockPhone, 'REGISTRATION');

      await expect(
        service.verifyOtp(sendResult.verificationId, mockPhone, '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block and invalidate OTP session after 5 failed attempts', async () => {
      const sendResult = await service.sendOtp(mockPhone, 'REGISTRATION');

      for (let i = 0; i < 4; i++) {
        await expect(
          service.verifyOtp(sendResult.verificationId, mockPhone, '000000'),
        ).rejects.toThrow(BadRequestException);
      }

      // 5th failed attempt should trigger lockout
      await expect(
        service.verifyOtp(sendResult.verificationId, mockPhone, '000000'),
      ).rejects.toThrow('Maximum verification attempts exceeded');
    });

    it('should reject replay of already consumed OTP', async () => {
      const sendResult = await service.sendOtp(mockPhone, 'REGISTRATION');
      const otp = FakeWhatsAppOtpProvider.getLastDispatchedOtp(mockPhone)!;

      await service.verifyOtp(sendResult.verificationId, mockPhone, otp);

      // Replay attempt must fail
      await expect(
        service.verifyOtp(sendResult.verificationId, mockPhone, otp),
      ).rejects.toThrow('Verification session has expired or is invalid');
    });
  });
});
