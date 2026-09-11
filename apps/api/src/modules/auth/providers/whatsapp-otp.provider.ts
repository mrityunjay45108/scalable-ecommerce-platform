import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider, SendOtpInput, SendOtpResult } from './otp-provider.interface';
import { maskPhone } from '../utils/phone.util';

@Injectable()
export class WhatsAppOtpProvider implements OtpProvider {
  private readonly logger = new Logger(WhatsAppOtpProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const apiVersion = this.configService.get<string>('whatsapp.apiVersion', 'v21.0');
    const phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId');
    const accessToken = this.configService.get<string>('whatsapp.accessToken');
    const templateName = this.configService.get<string>(
      'whatsapp.authTemplateName',
      'authentication_otp',
    );
    const templateLang = this.configService.get<string>(
      'whatsapp.templateLanguage',
      'en_US',
    );
    const timeoutMs = this.configService.get<number>('whatsapp.timeoutMs', 10000);

    if (!phoneNumberId || !accessToken) {
      this.logger.error('Meta WhatsApp credentials missing (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN)');
      throw new BadGatewayException({
        success: false,
        code: 'OTP_DELIVERY_FAILED',
        message: 'WhatsApp delivery service is currently not configured properly.',
      });
    }

    // Meta API expects recipient phone without '+' prefix
    const recipientPhone = input.phone.startsWith('+') ? input.phone.substring(1) : input.phone;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Standard Meta Authentication Template structure
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLang,
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: input.otp,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: input.otp,
              },
            ],
          },
        ],
      },
    };

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger.log(`[WHATSAPP DISPATCH] Sending OTP to ${maskPhone(input.phone)} for ${input.purpose}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseTime = Date.now() - startTime;
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.error?.message || 'Meta API returned non-OK status';
        const errorCode = data?.error?.code || response.status;
        this.logger.error(
          `[WHATSAPP DISPATCH FAILED] Code: ${errorCode}, Message: ${errorMsg}, Recipient: ${maskPhone(input.phone)}, Latency: ${responseTime}ms`,
        );

        throw new BadGatewayException({
          success: false,
          code: 'OTP_DELIVERY_FAILED',
          message: 'Unable to send verification code to WhatsApp. Please verify your number and try again.',
        });
      }

      const providerMessageId = data?.messages?.[0]?.id || 'unknown';
      this.logger.log(
        `[WHATSAPP SENT] Message ID: ${providerMessageId} to ${maskPhone(input.phone)} in ${responseTime}ms`,
      );

      return {
        providerMessageId,
        status: 'DELIVERED',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.error(`[WHATSAPP NETWORK ERROR] Recipient: ${maskPhone(input.phone)} Error: ${err.message}`);
      throw new BadGatewayException({
        success: false,
        code: 'OTP_DELIVERY_FAILED',
        message: 'Unable to send verification code. Please try again later.',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
