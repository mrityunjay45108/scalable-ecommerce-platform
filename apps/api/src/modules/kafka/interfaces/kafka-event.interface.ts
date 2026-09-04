import { KafkaTopicName, KafkaEventTypeName } from '../kafka.constants';

export interface KafkaEventEnvelope<T = any> {
  eventId: string;
  eventType: KafkaEventTypeName | string;
  version: number;
  occurredAt: string;
  producer: string;
  correlationId?: string;
  aggregateType: string;
  aggregateId: string;
  data: T;
}

// ==========================================
// ORDER DOMAIN EVENT DATA SCHEMAS
// ==========================================

export interface OrderCreatedEventData {
  orderId: string;
  orderNumber: string;
  userId: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discountAmount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  shippingPostalCode?: string;
  items: Array<{
    variantId: string;
    productTitle?: string | null;
    variantTitle?: string | null;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface OrderStatusChangedEventData {
  orderId: string;
  orderNumber: string;
  userId: string;
  previousStatus: string;
  newStatus: string;
  updatedBy?: string;
  reason?: string;
  trackingNumber?: string | null;
  courierProvider?: string | null;
}

export interface PaymentEventData {
  orderId: string;
  orderNumber: string;
  paymentId?: string;
  transactionId?: string | null;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  collectedAt?: string;
}

export interface ReturnEventData {
  returnRequestId: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  status: string;
  reason: string;
  action: string;
  itemsCount: number;
  refundAmount?: number;
}

export interface RefundEventData {
  refundId: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  gatewayRefundId?: string | null;
}

// ==========================================
// INVENTORY DOMAIN EVENT DATA SCHEMAS
// ==========================================

export interface InventoryEventData {
  variantId: string;
  productId?: string;
  productTitle?: string;
  sku?: string;
  quantityChanged: number;
  previousStock: number;
  newStock: number;
  reservedStock?: number;
  availableStock?: number;
  operation: 'RESERVE' | 'RELEASE' | 'COMMIT' | 'ADJUST' | 'RESTOCK';
  orderNumber?: string | null;
  reason?: string | null;
  isLowStock?: boolean;
}

// ==========================================
// SHIPMENT & COURIER DOMAIN EVENT DATA SCHEMAS
// ==========================================

export interface ShipmentEventData {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  courierProvider: string;
  awbNumber?: string | null;
  status: string;
  isCod: boolean;
  codAmount?: number | null;
  weight?: number | null;
  destinationPostalCode?: string;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  location?: string | null;
  activity?: string | null;
  timestamp?: string;
}

export interface CourierEventData {
  eventId?: string;
  awbNumber: string;
  orderNumber?: string;
  externalOrderId?: string;
  status: string;
  courierProvider: string;
  location?: string;
  activity?: string;
  timestamp: string;
  rawPayload?: any;
}
