import { Injectable, Logger } from '@nestjs/common';
import {
  ShippingProviderInterface,
  CreateShipmentInput,
  ShipmentResult,
  LabelResult,
  TrackingResult,
  ReturnPickupInput,
  ReturnPickupResult,
} from '../interfaces/shipping-provider.interface';
import { ShipmentStatus } from '@ecommerce/types';

@Injectable()
export class MockShippingProvider implements ShippingProviderInterface {
  readonly providerName = 'MOCK_COURIER';
  private readonly logger = new Logger(MockShippingProvider.name);

  // Configurable test hooks
  public shouldFail = false;
  public failureMessage = 'Mock Courier API failure';
  public simulatedDelayMs = 0;

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    this.logger.log(`[MockProvider] Creating shipment for order ${input.orderNumber}`);

    if (this.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
    }

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const awbNumber = `MOCK-AWB-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 2);

    return {
      courierProvider: this.providerName,
      awbNumber,
      trackingUrl: `https://mock.novastore.com/track/${awbNumber}`,
      labelUrl: `https://mock.novastore.com/label/${awbNumber}.pdf`,
      status: ShipmentStatus.LABEL_CREATED,
      estimatedDeliveryDate,
      metadata: {
        provider: 'Mock Courier Development Adapter',
        isCod: input.isCod,
        codAmount: input.codAmount || 0,
      },
    };
  }

  async generateLabel(awbNumber: string): Promise<LabelResult> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    return {
      awbNumber,
      labelUrl: `https://mock.novastore.com/label/${awbNumber}.pdf`,
      barcode: `*${awbNumber}*`,
      courierName: 'Mock Courier Test Express',
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    return {
      awbNumber,
      currentStatus: ShipmentStatus.IN_TRANSIT,
      estimatedDeliveryDate: new Date(),
      carrier: 'Mock Courier Test Express',
      events: [
        {
          status: ShipmentStatus.LABEL_CREATED,
          location: 'Mock Origin Warehouse',
          activity: 'Shipment created in test mode',
          timestamp: new Date(),
        },
      ],
    };
  }

  async getTrackingHistory(awbNumber: string): Promise<any[]> {
    const tracking = await this.trackShipment(awbNumber);
    return tracking.events;
  }

  async getShipmentStatus(awbNumber: string): Promise<ShipmentStatus> {
    return ShipmentStatus.IN_TRANSIT;
  }

  async cancelShipment(awbNumber: string, reason?: string): Promise<{ success: boolean; message: string }> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    return {
      success: true,
      message: `Mock shipment ${awbNumber} successfully cancelled`,
    };
  }

  async scheduleReturnPickup(input: ReturnPickupInput): Promise<ReturnPickupResult> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const pickupAwb = `MOCK-RET-${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      pickupAwb,
      pickupScheduledDate: new Date(),
      courierName: 'Mock Courier Reverse Express',
      trackingUrl: `https://mock.novastore.com/return/${pickupAwb}`,
    };
  }

  async cancelReturnPickup(pickupAwb: string, reason?: string): Promise<{ success: boolean; message: string }> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    return {
      success: true,
      message: `Mock reverse pickup ${pickupAwb} successfully cancelled`,
    };
  }

  verifyWebhookSignature(headers: Record<string, any>, payload: any): boolean {
    return true;
  }
}
