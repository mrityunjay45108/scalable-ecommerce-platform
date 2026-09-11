import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider, SendOtpInput, SendOtpResult } from './otp-provider.interface';
import { maskPhone } from '../utils/phone.util';

@Injectable()
export class FakeWhatsAppOtpProvider implements OtpProvider {
  private readonly logger = new Logger(FakeWhatsAppOtpProvider.name);
  private static dispatchedOtps: Map<string, { otp: string; purpose: string; timestamp: number }> = new Map();

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const fakeMessageId = `wam_fake_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Store in static map for test verification hooks
    FakeWhatsAppOtpProvider.dispatchedOtps.set(input.phone, {
      otp: input.otp,
      purpose: input.purpose,
      timestamp: Date.now(),
    });

    this.logger.log(
      `[DEV / TEST WHATSAPP] Dispatched OTP to ${maskPhone(input.phone)} (Purpose: ${input.purpose}, MsgId: ${fakeMessageId})`,
    );

    return {
      providerMessageId: fakeMessageId,
      status: 'MOCK_DELIVERED',
    };
  }

  /**
   * Test hook: allows integration/unit tests to inspect the generated OTP without production logs
   */
  static getLastDispatchedOtp(phone: string): string | undefined {
    return this.dispatchedOtps.get(phone)?.otp;
  }

  static clear(): void {
    this.dispatchedOtps.clear();
  }
}
