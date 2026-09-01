import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@ecommerce/types';
import { NotificationType } from '@ecommerce/database';

/**
 * Formal Order Fulfillment State Machine Transition Map
 * Enforces server-controlled order lifecycle progression.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.PAYMENT_FAILED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.PACKED,
    OrderStatus.READY_TO_SHIP,
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.PACKED,
    OrderStatus.READY_TO_SHIP,
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PACKED,
    OrderStatus.READY_TO_SHIP,
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.READY_TO_SHIP,
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_TO_SHIP]: [
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.RETURN_APPROVED,
  ],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.RETURN_REJECTED,
    OrderStatus.RETURN_PICKED_UP,
    OrderStatus.RETURN_RECEIVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RETURN_APPROVED]: [
    OrderStatus.RETURN_PICKED_UP,
    OrderStatus.RETURN_RECEIVED,
    OrderStatus.REFUND_PENDING,
    OrderStatus.REFUNDED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RETURN_PICKED_UP]: [
    OrderStatus.RETURN_RECEIVED,
    OrderStatus.REFUND_PENDING,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.RETURN_RECEIVED]: [
    OrderStatus.REFUND_PENDING,
    OrderStatus.REFUNDED,
    OrderStatus.RETURN_REJECTED,
  ],
  [OrderStatus.REFUND_PENDING]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.RETURN_REJECTED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.CANCELLED,
  ],
};

/**
 * Checks if a state transition is permitted.
 * Supports idempotency: transitioning to the same state is always permitted as a no-op.
 */
export function canTransitionOrder(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): boolean {
  if (currentStatus === targetStatus) {
    return true; // Idempotent no-op
  }

  const allowedNextStatuses = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowedNextStatuses.includes(targetStatus);
}

/**
 * Validates order transition and throws descriptive BadRequestException on violation.
 */
export function validateOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): void {
  if (!canTransitionOrder(currentStatus, targetStatus)) {
    const allowed = (VALID_ORDER_TRANSITIONS[currentStatus] || []).join(', ') || 'NONE (Terminal State)';
    throw new BadRequestException(
      `Invalid order state transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowed}]`,
    );
  }
}

/**
 * Maps OrderStatus to customer notification event
 */
export function getOrderNotificationType(
  status: OrderStatus,
): NotificationType | null {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return NotificationType.ORDER_CONFIRMED;
    case OrderStatus.PACKED:
      return NotificationType.ORDER_PACKED;
    case OrderStatus.SHIPPED:
      return NotificationType.ORDER_SHIPPED;
    case OrderStatus.OUT_FOR_DELIVERY:
      return NotificationType.OUT_FOR_DELIVERY;
    case OrderStatus.DELIVERED:
      return NotificationType.ORDER_DELIVERED;
    case OrderStatus.CANCELLED:
      return NotificationType.ORDER_CANCELLED;
    case OrderStatus.RETURN_REQUESTED:
      return NotificationType.RETURN_REQUESTED;
    case OrderStatus.RETURN_APPROVED:
      return NotificationType.RETURN_APPROVED;
    case OrderStatus.RETURN_REJECTED:
      return NotificationType.RETURN_REJECTED;
    case OrderStatus.RETURN_PICKED_UP:
      return NotificationType.RETURN_PICKED_UP;
    case OrderStatus.RETURN_RECEIVED:
      return NotificationType.RETURN_RECEIVED;
    case OrderStatus.REFUND_PENDING:
      return NotificationType.REFUND_INITIATED;
    case OrderStatus.REFUNDED:
      return NotificationType.REFUND_COMPLETED;
    default:
      return null;
  }
}
