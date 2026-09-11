import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

export interface MojoAuthSendOtpResult {
  success: boolean;
  message: string;
  state_id: string;
  expiresIn: number;
}

export interface MojoAuthVerifyResult {
  authenticated: boolean;
  email: string;
}

@Injectable()
export class MojoAuthService {
  private readonly logger = new Logger(MojoAuthService.name);
  private readonly stateTtlSeconds = 300; // 5 minutes TTL
  private static devMockOtps: Map<string, { otp: string; stateId: string; timestamp: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Sends an Email OTP via MojoAuth Email OTP API.
   * Stores the returned state_id in Redis with 5 minutes (300s) TTL.
   */
  async sendEmailOtp(email: string): Promise<MojoAuthSendOtpResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const apiKey = this.configService.get<string>('mojoauth.apiKey');
    const apiUrl = this.configService.get<string>('mojoauth.apiUrl', 'https://api.mojoauth.com');
    const timeoutMs = this.configService.get<number>('mojoauth.timeoutMs', 10000);

    // Rate Limiting per email in Redis (Max 5 requests per 10 minutes)
    const rateLimitKey = `mojoauth:limit:${normalizedEmail}`;
    const attempts = await this.redisService.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redisService.set(rateLimitKey, '1', 600);
    }
    if (attempts > 5) {
      this.logger.warn(`[MOJOAUTH RATE LIMIT] Email ${normalizedEmail} exceeded 5 OTP requests per 10 minutes`);
      throw new HttpException(
        {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many OTP requests for this email. Please wait a few minutes before trying again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let stateId: string;

    if (apiKey && apiKey.trim().length > 0) {
      // Call official MojoAuth Email OTP API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        this.logger.log(`[MOJOAUTH] Dispatching Email OTP to ${normalizedEmail}`);
        const response = await fetch(`${apiUrl}/users/emailotp`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: normalizedEmail }),
          signal: controller.signal,
        });

        const data: any = await response.json().catch(() => ({}));

        if (!response.ok || !data.state_id) {
          const errMsg = data?.message || data?.description || 'Failed to dispatch email OTP via MojoAuth';
          this.logger.error(`[MOJOAUTH API ERROR] Status ${response.status}: ${errMsg}`);
          throw new BadGatewayException({
            success: false,
            code: 'OTP_SEND_FAILED',
            message: errMsg,
          });
        }

        stateId = data.state_id;
        this.logger.log(`[MOJOAUTH DISPATCHED] Email OTP sent to ${normalizedEmail}, state_id: ${stateId}`);
      } catch (err: any) {
        if (err instanceof BadGatewayException || err instanceof HttpException) {
          throw err;
        }
        this.logger.error(`[MOJOAUTH NETWORK ERROR] ${err.message}`);
        throw new BadGatewayException({
          success: false,
          code: 'MOJOAUTH_UNAVAILABLE',
          message: 'Unable to reach email verification provider. Please try again shortly.',
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } else {
      // Development / Testing Mock Fallback (when MOJOAUTH_API_KEY is not set)
      stateId = `state_mock_${crypto.randomUUID()}`;
      const devOtp = crypto.randomInt(100000, 1000000).toString();

      MojoAuthService.devMockOtps.set(normalizedEmail, {
        otp: devOtp,
        stateId,
        timestamp: Date.now(),
      });

      this.logger.warn(
        `🔑 [DEV MOCK EMAIL OTP] Email: ${normalizedEmail} -> OTP CODE: [ ${devOtp} ] (state_id: ${stateId})`,
      );
    }

    // Store state_id in Redis with 5 minutes (300s) TTL
    const stateKey = `mojoauth:state:${normalizedEmail}`;
    await this.redisService.set(stateKey, stateId, this.stateTtlSeconds);

    return {
      success: true,
      message: 'Verification code sent to your email successfully.',
      state_id: stateId,
      expiresIn: this.stateTtlSeconds,
    };
  }

  /**
   * Verifies the Email OTP against MojoAuth.
   * On success, deletes the state_id from Redis (single-use / anti-replay).
   */
  async verifyEmailOtp(email: string, otp: string, stateId: string): Promise<MojoAuthVerifyResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const apiKey = this.configService.get<string>('mojoauth.apiKey');
    const apiUrl = this.configService.get<string>('mojoauth.apiUrl', 'https://api.mojoauth.com');
    const timeoutMs = this.configService.get<number>('mojoauth.timeoutMs', 10000);

    // Validate cached state_id in Redis
    const stateKey = `mojoauth:state:${normalizedEmail}`;
    const cachedStateId = await this.redisService.get(stateKey);

    if (!cachedStateId) {
      throw new BadRequestException({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'The verification code has expired. Please request a new code.',
      });
    }

    if (cachedStateId !== stateId) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_STATE_ID',
        message: 'Invalid verification session. Please request a new code.',
      });
    }

    if (apiKey && apiKey.trim().length > 0) {
      // Call official MojoAuth verify API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${apiUrl}/users/emailotp/verify`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state_id: stateId, otp: otp.trim() }),
          signal: controller.signal,
        });

        const data: any = await response.json().catch(() => ({}));

        if (!response.ok || !data.authenticated) {
          const errMsg = data?.message || data?.description || 'Invalid or incorrect verification code.';
          this.logger.warn(`[MOJOAUTH VERIFY FAILED] ${normalizedEmail}: ${errMsg}`);
          throw new BadRequestException({
            success: false,
            code: 'INVALID_OTP',
            message: 'Invalid verification code. Please check your email and enter the correct code.',
          });
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.error(`[MOJOAUTH VERIFY ERROR] ${err.message}`);
        throw new BadGatewayException({
          success: false,
          code: 'VERIFICATION_SERVICE_ERROR',
          message: 'Unable to verify code at this moment. Please try again.',
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } else {
      // Development / Testing Mock Verification
      const mockEntry = MojoAuthService.devMockOtps.get(normalizedEmail);
      if (!mockEntry || mockEntry.stateId !== stateId || mockEntry.otp !== otp.trim()) {
        throw new BadRequestException({
          success: false,
          code: 'INVALID_OTP',
          message: 'Invalid verification code. Please enter the correct code.',
        });
      }
      MojoAuthService.devMockOtps.delete(normalizedEmail);
    }

    // Invalidate state in Redis immediately (Anti-replay single use)
    await this.redisService.del(stateKey);

    return {
      authenticated: true,
      email: normalizedEmail,
    };
  }

  // Testing Hook
  static getDevMockOtp(email: string): string | undefined {
    return this.devMockOtps.get(email.toLowerCase().trim())?.otp;
  }

  static clearDevMockOtps(): void {
    this.devMockOtps.clear();
  }
}
