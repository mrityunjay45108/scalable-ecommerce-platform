import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  FirebaseLoginDto,
  VerifyWhatsAppOtpDto,
  ResendOtpDto,
} from './auth.dto';
import { Role } from '@ecommerce/types';
import { UserRole, UserStatus } from '@ecommerce/database';
import { OtpService } from './otp.service';
import { normalizePhone, isValidE164, maskPhone } from './utils/phone.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private otpService: OtpService,
  ) {}

  // 1. REGISTRATION (WITH WHATSAPP OTP)
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedPhone = normalizePhone(dto.phone);

    if (!isValidE164(normalizedPhone)) {
      throw new BadRequestException('Invalid phone number format. Please provide a valid phone number with country code (e.g. +91 9876543210).');
    }

    // Check duplicate email
    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmailUser && existingEmailUser.status !== UserStatus.PENDING_VERIFICATION) {
      throw new ConflictException('An account with this email already exists');
    }

    // Check duplicate phone
    const existingPhoneUser = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        status: { not: UserStatus.PENDING_VERIFICATION },
      },
    });

    if (existingPhoneUser) {
      throw new ConflictException('An account with this phone number already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    let user: any;
    if (existingEmailUser && existingEmailUser.status === UserStatus.PENDING_VERIFICATION) {
      user = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: normalizedPhone,
          phoneVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: normalizedPhone,
          phoneVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          role: UserRole.CUSTOMER,
        },
      });
    }

    // Audit Log: User Registration Started
    try {
      await this.prisma.auditLog?.create({
        data: {
          userId: user.id,
          action: 'AUTH_REGISTER_CREATED',
          entity: 'User',
          entityId: user.id,
          details: { phone: maskPhone(normalizedPhone), email: normalizedEmail },
        },
      });
    } catch {}

    // Dispatch WhatsApp OTP
    const otpResult = await this.otpService.sendOtp(normalizedPhone, 'REGISTRATION', user.id);

    // Audit Log: OTP Sent
    try {
      await this.prisma.auditLog?.create({
        data: {
          userId: user.id,
          action: 'AUTH_OTP_SENT',
          entity: 'User',
          entityId: user.id,
          details: { channel: 'WHATSAPP', phone: maskPhone(normalizedPhone), verificationId: otpResult.verificationId },
        },
      });
    } catch {}

    return {
      message: 'Verification code sent to WhatsApp',
      verificationId: otpResult.verificationId,
      expiresIn: otpResult.expiresIn,
      resendAfter: otpResult.resendAfter,
      phone: otpResult.phone,
    };
  }

  // 2. VERIFY WHATSAPP OTP & ACTIVATE ACCOUNT
  async verifyWhatsAppOtp(dto: VerifyWhatsAppOtpDto) {
    const normalizedPhone = normalizePhone(dto.phone);

    // Verify through OtpService (validates TTL, timing-safe compare, attempt count)
    const verification = await this.otpService.verifyOtp(dto.verificationId, normalizedPhone, dto.otp);

    // Transactional Activation & Session Creation
    const activatedUser = await this.prisma.$transaction(async (tx) => {
      const user = verification.userId
        ? await tx.user.findUnique({ where: { id: verification.userId } })
        : await tx.user.findFirst({ where: { phone: normalizedPhone } });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User account not found or deleted.');
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          phoneVerified: true,
          isActive: true,
        },
      });

      // Auto-create empty cart and wishlist
      await tx.cart.upsert({
        where: { userId: updated.id },
        create: { userId: updated.id },
        update: {},
      });
      await tx.wishlist.upsert({
        where: { userId: updated.id },
        create: { userId: updated.id },
        update: {},
      });

      // Audit Log: OTP Verified
      try {
        await tx.auditLog?.create({
          data: {
            userId: updated.id,
            action: 'AUTH_OTP_VERIFIED',
            entity: 'User',
            entityId: updated.id,
            details: { channel: 'WHATSAPP', phone: maskPhone(normalizedPhone) },
          },
        });
      } catch {}

      return updated;
    });

    // Generate tokens with rotation
    const tokens = await this.generateTokens(activatedUser.id, activatedUser.email, activatedUser.role);

    return {
      user: this.formatUser(activatedUser),
      tokens,
    };
  }

  // 3. RESEND WHATSAPP OTP
  async resendOtp(dto: ResendOtpDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    const result = await this.otpService.resendOtp(dto.verificationId, normalizedPhone);

    return {
      message: 'New verification code sent to WhatsApp',
      verificationId: result.verificationId,
      expiresIn: result.expiresIn,
      resendAfter: result.resendAfter,
      phone: result.phone,
    };
  }

  // 4. LOGIN (PASSWORD-BASED WITH VERIFICATION CHECK)
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION || !user.phoneVerified) {
      throw new UnauthorizedException('Please verify your phone number via WhatsApp OTP to complete registration.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BLOCKED || !user.isActive) {
      throw new UnauthorizedException('This account has been disabled or suspended. Please contact support.');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('This account has been deleted.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    try {
      await this.prisma.auditLog?.create({
        data: {
          userId: user.id,
          action: 'AUTH_LOGIN_SUCCESS',
          entity: 'User',
          entityId: user.id,
        },
      });
    } catch {}

    return {
      user: this.formatUser(user),
      tokens,
    };
  }


  // FIREBASE OAUTH / SOCIAL LOGIN
  async firebaseLogin(dto: FirebaseLoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, this.saltRounds);
      const names = (dto.firstName || 'Customer').split(' ');

      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName || names[0] || 'User',
          lastName: dto.lastName || (names.length > 1 ? names.slice(1).join(' ') : 'Customer'),
          avatarUrl: dto.avatarUrl,
          role: UserRole.CUSTOMER,
          isEmailVerified: true,
          isActive: true,
          cart: { create: {} },
          wishlist: { create: {} },
        },
      });
    } else {
      if (!user.isActive || user.deletedAt) {
        throw new UnauthorizedException('This account is disabled or deleted.');
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          avatarUrl: user.avatarUrl || dto.avatarUrl,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  // 3. REFRESH TOKENS (WITH ROTATION)
  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token. Please login again.');
    }

    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      throw new UnauthorizedException('Account is inactive.');
    }

    // Token Rotation: revoke previous token immediately
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new token pair
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );

    return {
      user: this.formatUser(storedToken.user),
      tokens,
    };
  }

  // 4. LOGOUT
  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    } else if (userId) {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    return { message: 'Logged out successfully' };
  }

  // 5. PASSWORD RESET ARCHITECTURE
  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive && !user.deletedAt) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      // Store in Redis with 1-hour TTL (3600 seconds)
      const ttl = 3600;
      await this.redisService.set(`pwd_reset:${tokenHash}`, user.id, ttl);

      const appUrl = this.configService.get<string>('appUrl', 'http://localhost:3000');
      const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

      if (process.env.NODE_ENV === 'production') {
        this.logger.log(`[PASSWORD RESET] Reset token dispatched for ${user.email}`);
      } else {
        this.logger.log(`[PASSWORD RESET] Reset link generated for ${user.email}: ${resetLink}`);
      }
    }

    // Generic response to prevent email enumeration attacks
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const userId = await this.redisService.get(`pwd_reset:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new BadRequestException('User account not found or inactive');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all active sessions upon password reset (Security Requirement)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    // Consume token
    await this.redisService.del(`pwd_reset:${tokenHash}`);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  // 6. EMAIL VERIFICATION ARCHITECTURE
  async sendVerificationEmail(userId: string, email?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified.' };
    }

    await this.generateAndSendVerificationEmail(user.id, email || user.email);

    return { message: 'Verification email sent successfully.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.hashToken(dto.token);
    const userId = await this.redisService.get(`email_verify:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    await this.redisService.del(`email_verify:${tokenHash}`);

    return { message: 'Email verified successfully!' };
  }

  // 7. CHANGE PASSWORD (AUTHENTICATED)
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke previous tokens except current
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password updated successfully' };
  }

  // 8. PROFILE
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        roleModel: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  // HELPER METHODS
  private async generateAndSendVerificationEmail(userId: string, email: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 24-hour TTL (86400 seconds)
    await this.redisService.set(`email_verify:${tokenHash}`, userId, 86400);

    const appUrl = this.configService.get<string>('appUrl', 'http://localhost:3000');
    const verifyLink = `${appUrl}/verify-email?token=${rawToken}`;

    if (process.env.NODE_ENV === 'production') {
      this.logger.log(`[EMAIL VERIFICATION] Verification token dispatched for ${email}`);
    } else {
      this.logger.log(`[EMAIL VERIFICATION] Verification link for ${email}: ${verifyLink}`);
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>(
      'jwt.accessSecret',
      'super_secret_access_jwt_key_dev',
    );
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration', '15m');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiration as any,
    });

    // Generate Refresh Token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  formatUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
