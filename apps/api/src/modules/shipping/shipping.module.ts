import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from './providers/standard-express.provider';
import { MockShippingProvider } from './providers/mock-shipping.provider';
import { ShiprocketProvider } from './providers/shiprocket.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingProviderFactory,
    StandardExpressShippingProvider,
    MockShippingProvider,
    ShiprocketProvider,
  ],
  exports: [ShippingService, ShippingProviderFactory, ShiprocketProvider],
})
export class ShippingModule {}

