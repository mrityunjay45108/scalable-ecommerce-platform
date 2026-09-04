export const KAFKA_TOPICS = {
  ORDER_EVENTS: 'ecommerce.order.events',
  ORDER_CREATED: 'ecommerce.order.created',
  INVENTORY_EVENTS: 'ecommerce.inventory.events',
  SHIPMENT_EVENTS: 'ecommerce.shipment.events',
  COURIER_SHIPMENT_EVENTS: 'courier.shipment.events',
} as const;

export type KafkaTopicName = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export const KAFKA_EVENT_TYPES = {
  // Order Domain
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PROCESSING: 'order.processing',
  ORDER_PACKED: 'order.packed',
  ORDER_READY_TO_SHIP: 'order.ready_to_ship',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_OUT_FOR_DELIVERY: 'order.out_for_delivery',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',

  // Payment Domain (Mapped into ecommerce.order.events)
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  COD_COLLECTED: 'cod.collected',

  // Returns & Reverse Logistics (Mapped into ecommerce.order.events)
  RETURN_REQUESTED: 'return.requested',
  RETURN_APPROVED: 'return.approved',
  RETURN_REJECTED: 'return.rejected',
  RETURN_PICKED_UP: 'return.picked_up',
  RETURN_RECEIVED: 'return.received',
  REFUND_INITIATED: 'refund.initiated',
  REFUND_COMPLETED: 'refund.completed',
  REFUND_FAILED: 'refund.failed',
  RTO_INITIATED: 'rto.initiated',

  // Inventory Domain (ecommerce.inventory.events)
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  INVENTORY_COMMITTED: 'inventory.committed',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVENTORY_RESTOCKED: 'inventory.restocked',

  // E-Commerce Shipment Domain (ecommerce.shipment.events)
  SHIPMENT_REQUESTED: 'shipment.requested',
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_LABEL_GENERATED: 'shipment.label_generated',
  SHIPMENT_DISPATCHED: 'shipment.dispatched',
  SHIPMENT_DELIVERED: 'shipment.delivered',
  SHIPMENT_DELIVERY_FAILED: 'shipment.delivery_failed',
  SHIPMENT_CANCELLED: 'shipment.cancelled',

  // Courier Platform Domain (courier.shipment.events)
  COURIER_SHIPMENT_CREATED: 'shipment.created',
  COURIER_PICKUP_SCHEDULED: 'pickup_scheduled',
  COURIER_PICKED_UP: 'picked_up',
  COURIER_IN_TRANSIT: 'in_transit',
  COURIER_OUT_FOR_DELIVERY: 'out_for_delivery',
  COURIER_DELIVERED: 'delivered',
  COURIER_DELIVERY_FAILED: 'delivery_failed',
  COURIER_CANCELLED: 'cancelled',
} as const;

export type KafkaEventTypeName = (typeof KAFKA_EVENT_TYPES)[keyof typeof KAFKA_EVENT_TYPES];

export const KAFKA_CONSUMER_GROUPS = {
  ORDER_WORKER: 'ecommerce-order-worker',
  INVENTORY_WORKER: 'ecommerce-inventory-worker',
  SHIPMENT_WORKER: 'ecommerce-shipment-worker',
} as const;

export type KafkaConsumerGroupName = (typeof KAFKA_CONSUMER_GROUPS)[keyof typeof KAFKA_CONSUMER_GROUPS];

export const KAFKA_HEADERS = {
  EVENT_ID: 'x-event-id',
  EVENT_TYPE: 'x-event-type',
  CORRELATION_ID: 'x-correlation-id',
  PRODUCER: 'x-producer',
  TIMESTAMP: 'x-timestamp',
} as const;
