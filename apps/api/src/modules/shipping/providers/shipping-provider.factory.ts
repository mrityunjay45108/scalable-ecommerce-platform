import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingProviderInterface } from '../interfaces/shipping-provider.interface';
import { StandardExpressShippingProvider } from './standard-express.provider';
import { MockShippingProvider } from './mock-shipping.provider';
import { ShiprocketProvider } from './shiprocket.provider';

@Injectable()
export class ShippingProviderFactory {
  private readonly logger = new Logger(ShippingProviderFactory.name);

  constructor(
    private configService: ConfigService,
    private standardExpressProvider: StandardExpressShippingProvider,
    private mockShippingProvider: MockShippingProvider,
    @Optional() private shiprocketProvider?: ShiprocketProvider,
  ) {}

  getProvider(providerName?: string): ShippingProviderInterface {
    const configuredProvider =
      this.configService.get<string>('shipping.provider') || 'STANDARD_EXPRESS';
    const target = (providerName || configuredProvider).toUpperCase();

    this.logger.debug(`Resolving courier provider adapter for: ${target}`);

    switch (target) {
      case 'SHIPROCKET':
      case 'COURIER':
      case 'PARTNER':
      case 'LOGISTICS':
        return this.shiprocketProvider || this.standardExpressProvider;

      case 'MOCK_COURIER':
      case 'MOCK':
      case 'TEST':
        return this.mockShippingProvider;

      case 'STANDARD_EXPRESS':
      case 'DEFAULT':
        return this.standardExpressProvider;

      default:
        this.logger.warn(`Unknown courier provider '${target}'; falling back to Standard Express`);
        return this.standardExpressProvider;
    }
  }
}

