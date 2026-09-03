import { CourierStatusMappingService } from './courier-status-mapping.service';
import { ShipmentStatus, OrderStatus } from '@ecommerce/types';

describe('CourierStatusMappingService', () => {
  let service: CourierStatusMappingService;

  beforeEach(() => {
    service = new CourierStatusMappingService();
  });

  describe('mapCourierToShipmentStatus', () => {
    it('should map CREATED and MANIFESTED to LABEL_CREATED', () => {
      expect(service.mapCourierToShipmentStatus('CREATED')).toBe(ShipmentStatus.LABEL_CREATED);
      expect(service.mapCourierToShipmentStatus('MANIFESTED')).toBe(ShipmentStatus.LABEL_CREATED);
      expect(service.mapCourierToShipmentStatus('BOOKED')).toBe(ShipmentStatus.LABEL_CREATED);
    });

    it('should map PICKUP_SCHEDULED to READY_FOR_PICKUP', () => {
      expect(service.mapCourierToShipmentStatus('PICKUP_SCHEDULED')).toBe(
        ShipmentStatus.READY_FOR_PICKUP,
      );
      expect(service.mapCourierToShipmentStatus('READY_FOR_PICKUP')).toBe(
        ShipmentStatus.READY_FOR_PICKUP,
      );
    });

    it('should map PICKED_UP to PICKED_UP', () => {
      expect(service.mapCourierToShipmentStatus('PICKED_UP')).toBe(ShipmentStatus.PICKED_UP);
      expect(service.mapCourierToShipmentStatus('DISPATCHED')).toBe(ShipmentStatus.PICKED_UP);
    });

    it('should map IN_TRANSIT and sorting checkpoints to IN_TRANSIT', () => {
      expect(service.mapCourierToShipmentStatus('IN_TRANSIT')).toBe(ShipmentStatus.IN_TRANSIT);
      expect(service.mapCourierToShipmentStatus('REACHED_HUB')).toBe(ShipmentStatus.IN_TRANSIT);
    });

    it('should map OUT_FOR_DELIVERY to OUT_FOR_DELIVERY', () => {
      expect(service.mapCourierToShipmentStatus('OUT_FOR_DELIVERY')).toBe(
        ShipmentStatus.OUT_FOR_DELIVERY,
      );
      expect(service.mapCourierToShipmentStatus('OFD')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    });

    it('should map DELIVERED to DELIVERED', () => {
      expect(service.mapCourierToShipmentStatus('DELIVERED')).toBe(ShipmentStatus.DELIVERED);
      expect(service.mapCourierToShipmentStatus('FULFILLED')).toBe(ShipmentStatus.DELIVERED);
    });

    it('should map DELIVERY_FAILED to FAILED_DELIVERY', () => {
      expect(service.mapCourierToShipmentStatus('DELIVERY_FAILED')).toBe(
        ShipmentStatus.FAILED_DELIVERY,
      );
      expect(service.mapCourierToShipmentStatus('UNDELIVERED')).toBe(
        ShipmentStatus.FAILED_DELIVERY,
      );
    });

    it('should map CANCELLED to CANCELLED', () => {
      expect(service.mapCourierToShipmentStatus('CANCELLED')).toBe(ShipmentStatus.CANCELLED);
      expect(service.mapCourierToShipmentStatus('CANCELED')).toBe(ShipmentStatus.CANCELLED);
    });

    it('should map RTO / Return events correctly', () => {
      expect(service.mapCourierToShipmentStatus('RETURN_INITIATED')).toBe(
        ShipmentStatus.RTO_INITIATED,
      );
      expect(service.mapCourierToShipmentStatus('RTO_INITIATED')).toBe(
        ShipmentStatus.RTO_INITIATED,
      );
      expect(service.mapCourierToShipmentStatus('RETURNED')).toBe(ShipmentStatus.RTO_DELIVERED);
      expect(service.mapCourierToShipmentStatus('RTO_DELIVERED')).toBe(
        ShipmentStatus.RTO_DELIVERED,
      );
    });

    it('should default unrecognized status to IN_TRANSIT', () => {
      expect(service.mapCourierToShipmentStatus('SOME_UNKNOWN_EVENT')).toBe(
        ShipmentStatus.IN_TRANSIT,
      );
    });
  });

  describe('mapCourierToOrderStatus', () => {
    it('should map PICKED_UP to SHIPPED when current order is PROCESSING', () => {
      expect(service.mapCourierToOrderStatus('PICKED_UP', OrderStatus.PROCESSING)).toBe(
        OrderStatus.SHIPPED,
      );
    });

    it('should map DELIVERED to DELIVERED when current order is OUT_FOR_DELIVERY', () => {
      expect(service.mapCourierToOrderStatus('DELIVERED', OrderStatus.OUT_FOR_DELIVERY)).toBe(
        OrderStatus.DELIVERED,
      );
    });

    it('should prevent invalid backward transitions via state machine', () => {
      // Trying to transition DELIVERED order back to SHIPPED via delayed webhook
      expect(service.mapCourierToOrderStatus('IN_TRANSIT', OrderStatus.DELIVERED)).toBeNull();
    });

    it('should return idempotent status if already in target state', () => {
      expect(service.mapCourierToOrderStatus('DELIVERED', OrderStatus.DELIVERED)).toBe(
        OrderStatus.DELIVERED,
      );
    });
  });
});
