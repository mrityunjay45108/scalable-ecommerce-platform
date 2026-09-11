import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, BadGatewayException, HttpException, HttpStatus } from '@nestjs/common';
import { MojoAuthService } from './mojoauth.service';
import { RedisService } from '../redis/redis.service';

describe('MojoAuthService', () => {
  let service: MojoAuthService;
  let redisService: any;
  let configService: any;

  beforeEach(async () => {
    MojoAuthService.clearDevMockOtps();

    redisService = {
      incr: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'mojoauth.apiKey') return '';
        if (key === 'mojoauth.apiUrl') return 'https://api.mojoauth.com';
        if (key === 'mojoauth.timeoutMs') return 5000;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MojoAuthService,
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<MojoAuthService>(MojoAuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailOtp', () => {
    it('should generate mock OTP and store state_id in Redis with 300s TTL when no API key is provided', async () => {
      const email = 'customer@example.com';
      const result = await service.sendEmailOtp(email);

      expect(result.success).toBe(true);
      expect(result.expiresIn).toBe(300);
      expect(result.state_id).toBeDefined();
      expect(result.state_id).toContain('state_mock_');

      // Verify Redis rate limit increment
      expect(redisService.incr).toHaveBeenCalledWith('mojoauth:limit:customer@example.com');
      // Verify Redis state_id storage with 300s TTL
      expect(redisService.set).toHaveBeenCalledWith(
        'mojoauth:state:customer@example.com',
        result.state_id,
        300,
      );
    });

    it('should throw 429 TOO_MANY_REQUESTS when rate limit of 5 requests per 10 minutes is exceeded', async () => {
      redisService.incr.mockResolvedValue(6);

      await expect(service.sendEmailOtp('spammer@example.com')).rejects.toThrow(HttpException);
    });

    it('should call official MojoAuth API when API key is provided', async () => {
      configService.get.mockImplementation((key: string, def?: any) => {
        if (key === 'mojoauth.apiKey') return 'live_api_key_test_123';
        if (key === 'mojoauth.apiUrl') return 'https://api.mojoauth.com';
        return def;
      });

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state_id: 'mojo_state_abc123' }),
      } as any);

      const result = await service.sendEmailOtp('user@domain.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mojoauth.com/users/emailotp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'live_api_key_test_123',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ email: 'user@domain.com' }),
        }),
      );
      expect(result.state_id).toBe('mojo_state_abc123');
      expect(redisService.set).toHaveBeenCalledWith(
        'mojoauth:state:user@domain.com',
        'mojo_state_abc123',
        300,
      );
    });

    it('should throw BadGatewayException when MojoAuth API returns error', async () => {
      configService.get.mockImplementation((key: string, def?: any) => {
        if (key === 'mojoauth.apiKey') return 'invalid_api_key';
        return def;
      });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid API Key' }),
      } as any);

      await expect(service.sendEmailOtp('user@domain.com')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('verifyEmailOtp', () => {
    const email = 'customer@example.com';
    const stateId = 'state_mock_valid_123';

    it('should throw BadRequestException if state has expired in Redis', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        service.verifyEmailOtp(email, '123456', stateId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if state_id does not match cached Redis state', async () => {
      redisService.get.mockResolvedValue('mismatched_state_456');

      await expect(
        service.verifyEmailOtp(email, '123456', stateId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify mock OTP and delete Redis state key (anti-replay)', async () => {
      const sendRes = await service.sendEmailOtp(email);
      const generatedOtp = MojoAuthService.getDevMockOtp(email)!;

      redisService.get.mockResolvedValue(sendRes.state_id);

      const result = await service.verifyEmailOtp(email, generatedOtp, sendRes.state_id);

      expect(result.authenticated).toBe(true);
      expect(result.email).toBe(email);
      expect(redisService.del).toHaveBeenCalledWith(`mojoauth:state:${email}`);
    });

    it('should throw BadRequestException on incorrect mock OTP', async () => {
      const sendRes = await service.sendEmailOtp(email);
      redisService.get.mockResolvedValue(sendRes.state_id);

      await expect(
        service.verifyEmailOtp(email, '000000', sendRes.state_id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify live MojoAuth API when API key is provided and delete Redis state key', async () => {
      configService.get.mockImplementation((key: string, def?: any) => {
        if (key === 'mojoauth.apiKey') return 'live_api_key_test_123';
        if (key === 'mojoauth.apiUrl') return 'https://api.mojoauth.com';
        return def;
      });

      const liveStateId = 'live_state_xyz_789';
      redisService.get.mockResolvedValue(liveStateId);

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true }),
      } as any);

      const result = await service.verifyEmailOtp(email, '654321', liveStateId);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mojoauth.com/users/emailotp/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'live_api_key_test_123',
          }),
          body: JSON.stringify({ state_id: liveStateId, otp: '654321' }),
        }),
      );
      expect(result.authenticated).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith(`mojoauth:state:${email}`);
    });
  });
});
