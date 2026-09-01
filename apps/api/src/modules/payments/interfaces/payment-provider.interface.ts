export interface CreateOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in standard unit (e.g. 150.00 USD)
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  provider: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  clientSecret?: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  rawPayload?: any;
}

export interface VerifyPaymentResult {
  isValid: boolean;
  transactionId: string;
  amount?: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}

export interface RefundParams {
  paymentId: string;
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  rawResponse?: any;
}

export interface PaymentProviderInterface {
  readonly name: string;
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(payload: string | Buffer | object, signature: string): boolean;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
