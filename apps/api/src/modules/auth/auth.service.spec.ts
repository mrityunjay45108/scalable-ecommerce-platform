import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { OtpService } from './otp.service';
import { MojoAuthService } from './mojoauth.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@ecommerce/database';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let redisService: any;
  let otpService: any;
  let mojoAuthService: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@novastore.com',
    passwordHash: '',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+919876543210',
    phoneVerified: true,
    status: UserStatus.ACTIVE,
    role: 'CUSTOMER',
    isActive: true,
    isEmailVerified: true,
    deletedAt: null,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cart: {
        create: jest.fn().mockResolvedValue({ id: 'cart-123' }),
        upsert: jest.fn().mockResolvedValue({ id: 'cart-123' }),
      },
      wishlist: {
        create: jest.fn().mockResolvedValue({ id: 'wishlist-123' }),
        upsert: jest.fn().mockResolvedValue({ id: 'wishlist-123' }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'token-123' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_access_token'),
    };

    redisService = {
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(true),
      ttl: jest.fn().mockResolvedValue(60),
      incr: jest.fn().mockResolvedValue(1),
    };

    otpService = {
      sendOtp: jest.fn().mockResolvedValue({
        verificationId: 'mock-verification-id-uuid',
        expiresIn: 300,
        resendAfter: 60,
        phone: '+9198******10',
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-uuid-123',
      }),
      resendOtp: jest.fn().mockResolvedValue({
        verificationId: 'mock-verification-id-uuid-2',
        expiresIn: 300,
        resendAfter: 60,
        phone: '+9198******10',
      }),
    };

    mojoAuthService = {
      sendEmailOtp: jest.fn().mockResolvedValue({
        success: true,
        message: 'Verification code sent to your email successfully.',
        state_id: 'mock-mojo-state-id',
        expiresIn: 300,
      }),
      verifyEmailOtp: jest.fn().mockResolvedValue({
        authenticated: true,
        email: 'test@novastore.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => def),
          },
        },
        { provide: RedisService, useValue: redisService },
        { provide: OtpService, useValue: otpService },
        { provide: MojoAuthService, useValue: mojoAuthService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register (Direct Password Authentication)', () => {
    it('should create an active user, create cart and wishlist, and issue JWT tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
        phoneVerified: true,
        isEmailVerified: true,
      });

      const result = await service.register({
        email: 'test@novastore.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+919876543210',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@novastore.com',
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          }),
        }),
      );
      expect(prisma.cart.upsert).toHaveBeenCalled();
      expect(prisma.wishlist.upsert).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
      expect(result.user.email).toBe('test@novastore.com');
    });

    it('should throw ConflictException if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@novastore.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+919876543210',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login (Password Authentication)', () => {
    it('should successfully login user with correct credentials and active status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@novastore.com',
        password: 'Password123!',
      });

      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should auto-activate user to ACTIVE if previously in PENDING_VERIFICATION', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION,
        isEmailVerified: false,
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });

      const result = await service.login({
        email: 'test@novastore.com',
        password: 'Password123!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          }),
        }),
      );
      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@novastore.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@novastore.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh tokens', async () => {
      const result = await service.logout('sample_refresh_token');
      expect(result.message).toContain('Logged out successfully');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
