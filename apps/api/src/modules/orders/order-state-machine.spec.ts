import { OrderStatus } from '@ecommerce/types';
import {
  canTransitionOrder,
  validateOrderTransition,
  getOrderNotificationType,
} from './order-state-machine';
import { BadRequestException } from '@nestjs/common';
import { NotificationType } from '@ecommerce/database';

describe('Order Fulfillment State Machine', () => {
  describe('1. Valid Fulfillment Pipeline Transitions', () => {
    const validPipeline = [
      { from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.CONFIRMED },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.PROCESSING },
      { from: OrderStatus.PROCESSING, to: OrderStatus.PACKED },
      { from: OrderStatus.PACKED, to: OrderStatus.READY_TO_SHIP },
      { from: OrderStatus.READY_TO_SHIP, to: OrderStatus.SHIPPED },
      { from: OrderStatus.SHIPPED, to: OrderStatus.OUT_FOR_DELIVERY },
      { from: OrderStatus.OUT_FOR_DELIVERY, to: OrderStatus.DELIVERED },
    ];

    validPipeline.forEach(({ from, to }) => {
      it(`should allow valid transition from ${from} -> ${to}`, () => {
        expect(canTransitionOrder(from, to)).toBe(true);
        expect(() => validateOrderTransition(from, to)).not.toThrow();
      });
    });
  });

  describe('2. Valid Cancellation Transitions (Before Dispatch)', () => {
    const cancellableStates = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.PACKED,
      OrderStatus.READY_TO_SHIP,
    ];

    cancellableStates.forEach((state) => {
      it(`should permit cancellation from ${state}`, () => {
        expect(canTransitionOrder(state, OrderStatus.CANCELLED)).toBe(true);
        expect(() => validateOrderTransition(state, OrderStatus.CANCELLED)).not.toThrow();
      });
    });
  });

  describe('3. Invalid & Dangerous State Transitions (Strict Rejection)', () => {
    const invalidTransitions = [
      { from: OrderStatus.DELIVERED, to: OrderStatus.PROCESSING },
      { from: OrderStatus.DELIVERED, to: OrderStatus.PACKED },
      { from: OrderStatus.DELIVERED, to: OrderStatus.SHIPPED },
      { from: OrderStatus.DELIVERED, to: OrderStatus.CANCELLED },
      { from: OrderStatus.CANCELLED, to: OrderStatus.SHIPPED },
      { from: OrderStatus.CANCELLED, to: OrderStatus.CONFIRMED },
      { from: OrderStatus.CANCELLED, to: OrderStatus.DELIVERED },
      { from: OrderStatus.SHIPPED, to: OrderStatus.CONFIRMED },
      { from: OrderStatus.SHIPPED, to: OrderStatus.PROCESSING },
      { from: OrderStatus.OUT_FOR_DELIVERY, to: OrderStatus.PACKED },
    ];

    invalidTransitions.forEach(({ from, to }) => {
      it(`should reject invalid transition from ${from} -> ${to}`, () => {
        expect(canTransitionOrder(from, to)).toBe(false);
        expect(() => validateOrderTransition(from, to)).toThrow(BadRequestException);
      });
    });
  });

  describe('4. Idempotency Support', () => {
    it('should permit identical status transitions as idempotent no-ops', () => {
      expect(canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).toBe(true);
      expect(canTransitionOrder(OrderStatus.SHIPPED, OrderStatus.SHIPPED)).toBe(true);
      expect(canTransitionOrder(OrderStatus.PROCESSING, OrderStatus.PROCESSING)).toBe(true);
      expect(() => validateOrderTransition(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).not.toThrow();
    });
  });

  describe('5. Notification Mapping', () => {
    it('should correctly map order status to customer notification type', () => {
      expect(getOrderNotificationType(OrderStatus.CONFIRMED)).toBe(NotificationType.ORDER_CONFIRMED);
      expect(getOrderNotificationType(OrderStatus.PACKED)).toBe(NotificationType.ORDER_PACKED);
      expect(getOrderNotificationType(OrderStatus.SHIPPED)).toBe(NotificationType.ORDER_SHIPPED);
      expect(getOrderNotificationType(OrderStatus.OUT_FOR_DELIVERY)).toBe(NotificationType.OUT_FOR_DELIVERY);
      expect(getOrderNotificationType(OrderStatus.DELIVERED)).toBe(NotificationType.ORDER_DELIVERED);
      expect(getOrderNotificationType(OrderStatus.CANCELLED)).toBe(NotificationType.ORDER_CANCELLED);
    });
  });
});
