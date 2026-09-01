import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProvider } from '@ecommerce/types';
import { PaymentProviderInterface } from '../interfaces/payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private razorpayProvider: RazorpayProvider,
    private stripeProvider: StripeProvider,
  ) {}

  getProvider(provider: PaymentProvider | string): PaymentProviderInterface {
    const normalized = String(provider).toUpperCase();

    if (normalized === 'RAZORPAY' || normalized === PaymentProvider.RAZORPAY) {
      return this.razorpayProvider;
    }

    if (normalized === 'STRIPE' || normalized === PaymentProvider.STRIPE) {
      return this.stripeProvider;
    }

    throw new BadRequestException(`Unsupported payment provider: ${provider}`);
  }
}
