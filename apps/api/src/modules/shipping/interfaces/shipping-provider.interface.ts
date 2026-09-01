import { ShipmentStatus } from '@ecommerce/types';

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    title: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  isCod: boolean;
  codAmount?: number;
  weightKg?: number;
  dimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
}

export interface ShipmentResult {
  courierProvider: string;
  awbNumber: string;
  trackingUrl: string;
  labelUrl: string;
  status: ShipmentStatus;
  estimatedDeliveryDate: Date;
  metadata?: Record<string, any>;
}

export interface LabelResult {
  awbNumber: string;
  labelUrl: string;
  barcode: string;
  courierName: string;
}

export interface TrackingEventItem {
  status: ShipmentStatus;
  location: string;
  activity: string;
  timestamp: Date;
}

export interface TrackingResult {
  awbNumber: string;
  currentStatus: ShipmentStatus;
  estimatedDeliveryDate: Date;
  carrier: string;
  events: TrackingEventItem[];
}

export interface ReturnPickupInput {
  orderId: string;
  orderNumber: string;
  returnNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    title: string;
    quantity: number;
  }>;
}

export interface ReturnPickupResult {
  pickupAwb: string;
  pickupScheduledDate: Date;
  courierName: string;
  trackingUrl: string;
}

export interface ShippingProviderInterface {
  readonly providerName: string;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  generateLabel(awbNumber: string): Promise<LabelResult>;
  trackShipment(awbNumber: string): Promise<TrackingResult>;
  getTrackingHistory?(awbNumber: string): Promise<TrackingEventItem[]>;
  cancelShipment(awbNumber: string, reason?: string): Promise<{ success: boolean; message: string }>;
  scheduleReturnPickup(input: ReturnPickupInput): Promise<ReturnPickupResult>;
  cancelReturnPickup?(pickupAwb: string, reason?: string): Promise<{ success: boolean; message: string }>;
  verifyWebhookSignature(headers: Record<string, any>, payload: any): boolean;
}
