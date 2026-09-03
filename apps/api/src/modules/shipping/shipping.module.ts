import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { CourierStatusMappingService } from './courier-status-mapping.service';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { StandardExpressShippingProvider } from './providers/standard-express.provider';
import { MockShippingProvider } from './providers/mock-shipping.provider';
import { ShiprocketProvider } from './providers/shiprocket.provider';
import { CourierPlatformProvider } from './providers/courier-platform.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    CourierStatusMappingService,
    ShippingProviderFactory,
    StandardExpressShippingProvider,
    MockShippingProvider,
    ShiprocketProvider,
    CourierPlatformProvider,
  ],
  exports: [
    ShippingService,
    CourierStatusMappingService,
    ShippingProviderFactory,
    ShiprocketProvider,
    CourierPlatformProvider,
  ],
})
export class ShippingModule {}

