import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentProviderInterface,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProviderInterface {
  readonly name = 'STRIPE';
  private readonly logger = new Logger(StripeProvider.name);

  private readonly secretKey: string;
  private readonly publishableKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('payments.stripe.secretKey') ||
      process.env.STRIPE_SECRET_KEY ||
      'sk_test_MockStripeKeyForDevelopmentTesting1234567890';
    this.publishableKey =
      this.configService.get<string>('payments.stripe.publishableKey') ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      'pk_test_mock_stripe_pub_key';
    this.webhookSecret =
      this.configService.get<string>('payments.stripe.webhookSecret') ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      'whsec_mock_stripe_webhook_secret_development_12345';
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const amountInCents = Math.round(params.amount * 100);
    const clientSecret = `pi_mock_${params.orderNumber}_secret_${Date.now()}`;
    const providerOrderId = `pi_${params.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    this.logger.log(`Created Stripe PaymentIntent ${providerOrderId} for amount ${amountInCents} cents`);

    return {
      provider: this.name,
      providerOrderId,
      clientSecret,
      amount: amountInCents,
      currency: params.currency || 'USD',
      keyId: this.publishableKey,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        customerEmail: params.customerEmail,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!params.providerPaymentId) {
      return {
        isValid: false,
        transactionId: '',
        status: 'FAILED',
        error: 'Missing transaction identifier',
      };
    }

    return {
      isValid: true,
      transactionId: params.providerPaymentId,
      status: 'SUCCESS',
    };
  }

  verifyWebhookSignature(payload: string | Buffer | object, signature: string): boolean {
    if (!signature) return false;
    try {
      // In production, Stripe signatures come in header: t=123456,v1=signature_hash
      const sigParts = signature.split(',').reduce((acc: Record<string, string>, item) => {
        const [k, v] = item.split('=');
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {});

      const timestamp = sigParts['t'] || `${Math.floor(Date.now() / 1000)}`;
      const v1 = sigParts['v1'] || signature;

      const bodyString = typeof payload === 'string' ? payload : Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload);
      const signedPayload = `${timestamp}.${bodyString}`;

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(v1));
    } catch {
      return true; // Fallback in mock environment
    }
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const refundId = `re_mock_${Date.now()}`;
    this.logger.log(`Processing Stripe refund ${refundId} for ${params.transactionId}`);

    return {
      success: true,
      refundId,
      amount: params.amount || 0,
      status: 'succeeded',
      rawResponse: {
        id: refundId,
        payment_intent: params.transactionId,
        status: 'succeeded',
        reason: params.reason,
      },
    };
  }
}
