import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_PROVIDER, OtpProvider, OtpPurpose } from './providers/otp-provider.interface';
import { maskPhone } from './utils/phone.util';
import { OtpPurpose as PrismaOtpPurpose } from '@ecommerce/database';

export interface OtpState {
  verificationId: string;
  otpHash: string;
  userId?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
  phone: string;
  purpose: OtpPurpose;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpTtlSeconds = 300; // 5 minutes
  private readonly resendCooldownSeconds = 60; // 60 seconds cooldown
  private readonly maxVerificationAttempts = 5;

  // Metrics counters
  private metrics = {
    otp_requests_total: 0,
    otp_sent_total: 0,
    otp_send_failed_total: 0,
    otp_verified_total: 0,
    otp_failed_total: 0,
    otp_expired_total: 0,
    otp_rate_limited_total: 0,
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {}

  /**
   * Generates a cryptographically secure 6-digit numeric OTP.
   */
  generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes an OTP with a HMAC server secret so plaintext OTP is never persisted.
   */
  hashOtp(otp: string): string {
    const secret = this.configService.get<string>(
      'jwt.accessSecret',
      'super_secret_otp_hmac_salt_key',
    );
    return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
  }

  /**
   * Generates and dispatches a WhatsApp OTP.
   */
  async sendOtp(phone: string, purpose: OtpPurpose, userId?: string) {
    this.metrics.otp_requests_total++;

    // 1. Check Resend Cooldown
    const cooldownKey = `auth:otp:resend:${phone}`;
    const inCooldown = await this.redisService.get(cooldownKey);
    if (inCooldown) {
      this.metrics.otp_rate_limited_total++;
      const ttl = await this.redisService.ttl(cooldownKey);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Please wait ${ttl > 0 ? ttl : 60} seconds before requesting a new verification code.`,
          resendAfter: ttl > 0 ? ttl : 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Hourly rate limit per phone number (max 10 requests per hour)
    const rateLimitKey = `auth:rate:otp:${phone}`;
    const requestCount = await this.redisService.incr(rateLimitKey, 3600);
    if (requestCount > 10) {
      this.metrics.otp_rate_limited_total++;
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many verification requests for this phone number. Please try again in an hour.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Invalidate any existing OTP for this phone + purpose
    const primaryKey = `auth:otp:${purpose}:${phone}`;
    const existingRaw = await this.redisService.get(primaryKey);
    if (existingRaw) {
      try {
        const existing: OtpState = JSON.parse(existingRaw);
        await this.redisService.del(`auth:otp:verification_id:${existing.verificationId}`);
      } catch {
        // ignore parse error
      }
      await this.redisService.del(primaryKey);
    }

    // 4. Generate fresh 6-digit OTP & UUID verificationId
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const verificationId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + this.otpTtlSeconds * 1000;

    const state: OtpState = {
      verificationId,
      otpHash,
      userId,
      attempts: 0,
      maxAttempts: this.maxVerificationAttempts,
      createdAt: now,
      expiresAt,
      phone,
      purpose,
    };

    // 5. Save to Redis
    await this.redisService.set(primaryKey, JSON.stringify(state), this.otpTtlSeconds);
    await this.redisService.set(
      `auth:otp:verification_id:${verificationId}`,
      `${purpose}:${phone}`,
      this.otpTtlSeconds,
    );
    await this.redisService.set(cooldownKey, '1', this.resendCooldownSeconds);

    // 6. Record persistent OTP audit record in PostgreSQL
    let dbOtpRecordId: string | undefined;
    try {
      const dbRecord = await this.prisma.otpVerification.create({
        data: {
          id: verificationId,
          userId,
          phone,
          purpose: purpose as PrismaOtpPurpose,
          channel: 'WHATSAPP',
          otpHash,
          expiresAt: new Date(expiresAt),
          maxAttempts: this.maxVerificationAttempts,
        },
      });
      dbOtpRecordId = dbRecord.id;
    } catch (err: any) {
      this.logger.warn(`Could not save persistent OtpVerification record: ${err.message}`);
    }

    // 7. Dispatch via WhatsApp Provider
    try {
      const result = await this.otpProvider.sendOtp({
        phone,
        otp,
        purpose,
      });

      if (result.providerMessageId && dbOtpRecordId) {
        await this.prisma.otpVerification.update({
          where: { id: dbOtpRecordId },
          data: { providerMessageId: result.providerMessageId },
        }).catch(() => {});
      }

      this.metrics.otp_sent_total++;
      return {
        verificationId,
        expiresIn: this.otpTtlSeconds,
        resendAfter: this.resendCooldownSeconds,
        phone: maskPhone(phone),
      };
    } catch (err: any) {
      this.metrics.otp_send_failed_total++;
      // Clean up Redis state on provider dispatch failure
      await this.redisService.del(primaryKey);
      await this.redisService.del(`auth:otp:verification_id:${verificationId}`);
      await this.redisService.del(cooldownKey);
      throw err;
    }
  }

  /**
   * Verifies an OTP submitted by the user.
   */
  async verifyOtp(verificationId: string, phone: string, inputOtp: string): Promise<{ success: boolean; userId?: string }> {
    if (!inputOtp || inputOtp.trim().length !== 6 || !/^\d{6}$/.test(inputOtp.trim())) {
      throw new BadRequestException('Verification code must be exactly 6 digits.');
    }

    // 1. Resolve key via verificationId
    const mapped = await this.redisService.get(`auth:otp:verification_id:${verificationId}`);
    if (!mapped) {
      this.metrics.otp_expired_total++;
      throw new BadRequestException('Verification session has expired or is invalid. Please request a new code.');
    }

    const [purpose, storedPhone] = mapped.split(':');
    if (storedPhone !== phone) {
      throw new BadRequestException('Phone number does not match this verification session.');
    }

    const primaryKey = `auth:otp:${purpose}:${phone}`;
    const stateRaw = await this.redisService.get(primaryKey);
    if (!stateRaw) {
      this.metrics.otp_expired_total++;
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    const state: OtpState = JSON.parse(stateRaw);

    // 2. Check maximum attempts
    if (state.attempts >= state.maxAttempts) {
      this.metrics.otp_failed_total++;
      await this.redisService.del(primaryKey);
      await this.redisService.del(`auth:otp:verification_id:${verificationId}`);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // 3. Timing-safe compare
    const inputHash = this.hashOtp(inputOtp);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'utf8'),
      Buffer.from(state.otpHash, 'utf8'),
    );

    if (!isValid) {
      this.metrics.otp_failed_total++;
      state.attempts += 1;
      const remaining = state.maxAttempts - state.attempts;

      if (remaining <= 0) {
        await this.redisService.del(primaryKey);
        await this.redisService.del(`auth:otp:verification_id:${verificationId}`);
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
      } else {
        const remainingTtl = Math.max(1, Math.floor((state.expiresAt - Date.now()) / 1000));
        await this.redisService.set(primaryKey, JSON.stringify(state), remainingTtl);
        throw new BadRequestException(`Invalid verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
      }
    }

    // 4. Verification Successful! Consume & Clean up
    this.metrics.otp_verified_total++;
    await this.redisService.del(primaryKey);
    await this.redisService.del(`auth:otp:verification_id:${verificationId}`);

    // Update persistent audit record
    await this.prisma.otpVerification.updateMany({
      where: { id: verificationId },
      data: {
        verifiedAt: new Date(),
        attempts: state.attempts + 1,
      },
    }).catch(() => {});

    return {
      success: true,
      userId: state.userId,
    };
  }

  /**
   * Resends an OTP for an active verification session.
   */
  async resendOtp(verificationId: string, phone: string) {
    const mapped = await this.redisService.get(`auth:otp:verification_id:${verificationId}`);
    let purpose: OtpPurpose = 'REGISTRATION';
    let userId: string | undefined;

    if (mapped) {
      const parts = mapped.split(':');
      purpose = parts[0] as OtpPurpose;
      const primaryKey = `auth:otp:${purpose}:${phone}`;
      const stateRaw = await this.redisService.get(primaryKey);
      if (stateRaw) {
        const state: OtpState = JSON.parse(stateRaw);
        userId = state.userId;
      }
    }

    return this.sendOtp(phone, purpose, userId);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
