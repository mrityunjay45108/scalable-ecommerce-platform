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
export class RazorpayProvider implements PaymentProviderInterface {
  readonly name = 'RAZORPAY';
  private readonly logger = new Logger(RazorpayProvider.name);

  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.keyId =
      this.configService.get<string>('payments.razorpay.keyId') ||
      process.env.RAZORPAY_KEY_ID ||
      'rzp_test_MockRazorpayKeyId';
    this.keySecret =
      this.configService.get<string>('payments.razorpay.keySecret') ||
      process.env.RAZORPAY_KEY_SECRET ||
      'mockRazorpayKeySecretDev';
    this.webhookSecret =
      this.configService.get<string>('payments.razorpay.webhookSecret') ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      this.keySecret;
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const amountInSubunits = Math.round(params.amount * 100);
    const providerOrderId = `order_rzp_${Date.now()}_${params.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    this.logger.log(`Created Razorpay Order ${providerOrderId} for amount ${amountInSubunits} ${params.currency}`);

    return {
      provider: this.name,
      providerOrderId,
      amount: amountInSubunits,
      currency: params.currency || 'USD',
      keyId: this.keyId,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
      },
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!params.providerOrderId || !params.providerPaymentId || !params.signature) {
      return {
        isValid: false,
        transactionId: params.providerPaymentId || '',
        status: 'FAILED',
        error: 'Missing required Razorpay verification parameters',
      };
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${params.providerOrderId}|${params.providerPaymentId}`)
        .digest('hex');

      const isMatch = this.safeCompare(generatedSignature, params.signature);

      if (!isMatch) {
        this.logger.warn(`Razorpay signature mismatch for payment ${params.providerPaymentId}`);
        return {
          isValid: false,
          transactionId: params.providerPaymentId,
          status: 'FAILED',
          error: 'Cryptographic signature verification failed',
        };
      }

      return {
        isValid: true,
        transactionId: params.providerPaymentId,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      this.logger.error(`Error during Razorpay payment verification: ${err.message}`);
      return {
        isValid: false,
        transactionId: params.providerPaymentId,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  verifyWebhookSignature(payload: string | Buffer | object, signature: string): boolean {
    if (!signature) return false;
    try {
      const bodyString = typeof payload === 'string' ? payload : Buffer.isBuffer(payload) ? payload.toString('utf8') : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyString)
        .digest('hex');

      return this.safeCompare(expectedSignature, signature);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification error: ${err.message}`);
      return false;
    }
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const refundId = `rfnd_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    this.logger.log(`Processing refund ${refundId} for payment ${params.transactionId} amount: ${params.amount}`);

    return {
      success: true,
      refundId,
      amount: params.amount || 0,
      status: 'PROCESSED',
      rawResponse: {
        id: refundId,
        payment_id: params.transactionId,
        status: 'processed',
        reason: params.reason || 'Customer requested refund',
      },
    };
  }

  private safeCompare(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
