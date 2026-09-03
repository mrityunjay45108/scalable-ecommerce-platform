import { Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus, OrderStatus } from '@ecommerce/types';
import { VALID_ORDER_TRANSITIONS } from '../orders/order-state-machine';

@Injectable()
export class CourierStatusMappingService {
  private readonly logger = new Logger(CourierStatusMappingService.name);

  /**
   * Normalizes Courier Platform status strings into E-Commerce ShipmentStatus enum.
   */
  mapCourierToShipmentStatus(rawStatus?: string): ShipmentStatus {
    if (!rawStatus) return ShipmentStatus.IN_TRANSIT;

    const normalized = String(rawStatus).toUpperCase().trim().replace(/[\s-]+/g, '_');

    switch (normalized) {
      case 'CREATED':
      case 'MANIFESTED':
      case 'LABEL_CREATED':
      case 'BOOKED':
      case 'PENDING':
        return ShipmentStatus.LABEL_CREATED;

      case 'PICKUP_SCHEDULED':
      case 'READY_FOR_PICKUP':
      case 'MANIFEST_GENERATED':
        return ShipmentStatus.READY_FOR_PICKUP;

      case 'PICKED_UP':
      case 'COLLECTED':
      case 'DISPATCHED':
        return ShipmentStatus.PICKED_UP;

      case 'IN_TRANSIT':
      case 'REACHED_HUB':
      case 'DEPARTED_HUB':
      case 'SORTED':
      case 'TRANSIT':
        return ShipmentStatus.IN_TRANSIT;

      case 'OUT_FOR_DELIVERY':
      case 'OFD':
      case 'WITH_DRIVER':
        return ShipmentStatus.OUT_FOR_DELIVERY;

      case 'DELIVERED':
      case 'FULFILLED':
      case 'COMPLETED':
        return ShipmentStatus.DELIVERED;

      case 'DELIVERY_FAILED':
      case 'FAILED_DELIVERY':
      case 'UNDELIVERED':
      case 'ATTEMPTED':
      case 'NDR':
      case 'LOST':
      case 'DAMAGED':
        return ShipmentStatus.FAILED_DELIVERY;

      case 'CANCELLED':
      case 'CANCELED':
      case 'VOID':
        return ShipmentStatus.CANCELLED;

      case 'RETURN_INITIATED':
      case 'RTO_INITIATED':
      case 'RTO_ACKNOWLEDGED':
      case 'RTO_IN_TRANSIT':
        return ShipmentStatus.RTO_INITIATED;

      case 'RETURNED':
      case 'RTO_DELIVERED':
      case 'RTO_RECEIVED':
      case 'RETURN_DELIVERED':
        return ShipmentStatus.RTO_DELIVERED;

      default:
        this.logger.debug(`Unrecognized courier status '${rawStatus}'. Defaulting to IN_TRANSIT`);
        return ShipmentStatus.IN_TRANSIT;
    }
  }

  /**
   * Safely maps Courier Platform status to E-Commerce OrderStatus.
   * Enforces validation against the formal order state machine.
   */
  mapCourierToOrderStatus(
    rawStatus?: string,
    currentOrderStatus?: OrderStatus,
  ): OrderStatus | null {
    if (!rawStatus) return null;

    const shipmentStatus = this.mapCourierToShipmentStatus(rawStatus);
    let targetOrderStatus: OrderStatus | null = null;

    switch (shipmentStatus) {
      case ShipmentStatus.LABEL_CREATED:
      case ShipmentStatus.READY_FOR_PICKUP:
        targetOrderStatus = OrderStatus.READY_TO_SHIP;
        break;

      case ShipmentStatus.PICKED_UP:
      case ShipmentStatus.IN_TRANSIT:
        targetOrderStatus = OrderStatus.SHIPPED;
        break;

      case ShipmentStatus.OUT_FOR_DELIVERY:
        targetOrderStatus = OrderStatus.OUT_FOR_DELIVERY;
        break;

      case ShipmentStatus.DELIVERED:
        targetOrderStatus = OrderStatus.DELIVERED;
        break;

      case ShipmentStatus.CANCELLED:
        targetOrderStatus = OrderStatus.CANCELLED;
        break;

      case ShipmentStatus.RTO_INITIATED:
        targetOrderStatus = OrderStatus.RETURN_PICKED_UP;
        break;

      case ShipmentStatus.RTO_DELIVERED:
        targetOrderStatus = OrderStatus.RETURN_RECEIVED;
        break;

      case ShipmentStatus.FAILED_DELIVERY:
        // Do not force terminal order failure on first NDR attempt; maintain existing shipment tracking
        return null;

      default:
        return null;
    }

    // If currentOrderStatus is known, validate transition legitimacy via state machine
    if (currentOrderStatus && targetOrderStatus) {
      if (currentOrderStatus === targetOrderStatus) {
        return targetOrderStatus; // Idempotent no-op
      }

      const allowedTransitions = VALID_ORDER_TRANSITIONS[currentOrderStatus] || [];
      if (!allowedTransitions.includes(targetOrderStatus)) {
        this.logger.warn(
          `Ignoring invalid Order state transition from ${currentOrderStatus} -> ${targetOrderStatus} triggered by courier status '${rawStatus}'`,
        );
        return null;
      }
    }

    return targetOrderStatus;
  }
}
