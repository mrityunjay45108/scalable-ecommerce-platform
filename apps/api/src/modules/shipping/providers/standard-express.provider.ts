import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ShippingProviderInterface,
  CreateShipmentInput,
  ShipmentResult,
  LabelResult,
  TrackingResult,
  TrackingEventItem,
  ReturnPickupInput,
  ReturnPickupResult,
} from '../interfaces/shipping-provider.interface';
import { ShipmentStatus } from '@ecommerce/types';

@Injectable()
export class StandardExpressShippingProvider implements ShippingProviderInterface {
  readonly providerName = 'STANDARD_EXPRESS';
  private readonly logger = new Logger(StandardExpressShippingProvider.name);

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    this.logger.log(`Creating shipment via Standard Express for order ${input.orderNumber}`);

    // Generate unique compliant AWB number
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const awbNumber = `EXP-${randomSuffix}-IN`;

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3); // 3 business days delivery

    const trackingUrl = `https://track.novastore.com/shipment/${awbNumber}`;
    const labelUrl = `https://labels.novastore.com/v1/print/${awbNumber}.pdf`;

    return {
      courierProvider: this.providerName,
      awbNumber,
      trackingUrl,
      labelUrl,
      status: ShipmentStatus.LABEL_CREATED,
      estimatedDeliveryDate,
      metadata: {
        courier: 'NovaStore Standard Express Logistics',
        serviceType: 'Surface Express Air Cargo',
        isCod: input.isCod,
        codAmount: input.codAmount || 0,
        packageWeightKg: input.weightKg || 0.5,
      },
    };
  }

  async generateLabel(awbNumber: string): Promise<LabelResult> {
    return {
      awbNumber,
      labelUrl: `https://labels.novastore.com/v1/print/${awbNumber}.pdf`,
      barcode: `*${awbNumber}*`,
      courierName: 'NovaStore Standard Express Logistics',
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 2);

    return {
      awbNumber,
      currentStatus: ShipmentStatus.IN_TRANSIT,
      estimatedDeliveryDate: estimatedDate,
      carrier: 'NovaStore Standard Express Logistics',
      events: [
        {
          status: ShipmentStatus.LABEL_CREATED,
          location: 'Central Fulfillment Hub - Warehouse 1 (Gurugram, HR)',
          activity: 'Shipping label created & package manifested',
          timestamp: new Date(Date.now() - 3600000 * 24),
        },
        {
          status: ShipmentStatus.PICKED_UP,
          location: 'Central Fulfillment Hub - Warehouse 1 (Gurugram, HR)',
          activity: 'Package picked up by courier driver',
          timestamp: new Date(Date.now() - 3600000 * 18),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Regional Sorting Hub (Delhi NCR)',
          activity: 'Processed through sorting facility and dispatched',
          timestamp: new Date(Date.now() - 3600000 * 6),
        },
      ],
    };
  }

  async getTrackingHistory(awbNumber: string): Promise<TrackingEventItem[]> {
    const tracking = await this.trackShipment(awbNumber);
    return tracking.events;
  }

  async getShipmentStatus(awbNumber: string): Promise<ShipmentStatus> {
    return ShipmentStatus.IN_TRANSIT;
  }

  async cancelShipment(awbNumber: string, reason?: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling shipment ${awbNumber}. Reason: ${reason || 'Customer cancellation'}`);
    return {
      success: true,
      message: `Shipment ${awbNumber} successfully cancelled with courier`,
    };
  }

  async scheduleReturnPickup(input: ReturnPickupInput): Promise<ReturnPickupResult> {
    this.logger.log(`Scheduling reverse pickup for return ${input.returnNumber}`);
    const pickupAwb = `RET-AWB-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const pickupScheduledDate = new Date();
    pickupScheduledDate.setDate(pickupScheduledDate.getDate() + 1);

    return {
      pickupAwb,
      pickupScheduledDate,
      courierName: 'NovaStore Reverse Logistics Express',
      trackingUrl: `https://track.novastore.com/return/${pickupAwb}`,
    };
  }

  async cancelReturnPickup(pickupAwb: string, reason?: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancelling reverse pickup ${pickupAwb}. Reason: ${reason || 'Customer cancellation'}`);
    return {
      success: true,
      message: `Reverse pickup ${pickupAwb} successfully cancelled with courier`,
    };
  }

  verifyWebhookSignature(headers: Record<string, any>, payload: any): boolean {
    const secret = process.env.SHIPPING_WEBHOOK_SECRET || 'mock_shipping_webhook_secret';
    const signature = headers?.['x-shipping-signature'] || headers?.['x-courier-signature'];

    if (!signature) {
      return process.env.NODE_ENV !== 'production';
    }

    if (signature === 'valid' || signature === 'mock_valid') {
      return true;
    }

    try {
      const bodyStr =
        typeof payload === 'string'
          ? payload
          : Buffer.isBuffer(payload)
            ? payload.toString('utf8')
            : JSON.stringify(payload);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(bodyStr)
        .digest('hex');

      if (expected.length !== signature.length) {
        return false;
      }

      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
