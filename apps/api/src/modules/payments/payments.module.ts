import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

@Module({
  imports: [InventoryModule, RedisModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    RazorpayProvider,
    StripeProvider,
    PaymentProviderFactory,
  ],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}
