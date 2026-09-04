import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingProviderFactory } from './providers/shipping-provider.factory';
import { CourierStatusMappingService } from './courier-status-mapping.service';
import {
  PricingQuoteInput,
  ReconciliationQuery,
} from './interfaces/shipping-provider.interface';
import {
  CreateShipmentDto,
  UpdateShipmentStatusDto,
  CancelShipmentDto,
  ShipmentQueryDto,
  WebhookCourierDto,
} from './shipping.dto';
import {
  ShipmentStatus,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  CODStatus,
  Role,
} from '@ecommerce/types';
import { NotificationType } from '@ecommerce/database';
import { KafkaEventPublisher } from '../kafka/services/kafka-event-publisher.service';
import { KAFKA_EVENT_TYPES } from '../kafka/kafka.constants';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly statusMappingService: CourierStatusMappingService;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private providerFactory: ShippingProviderFactory,
    @Optional() statusMappingService?: CourierStatusMappingService,
    @Optional() private kafkaPublisher?: KafkaEventPublisher,
  ) {
    this.statusMappingService = statusMappingService || new CourierStatusMappingService();
  }

  // =========================================================================
  // 1. CREATE SHIPMENT (AWB & LABEL GENERATION)
  // =========================================================================

  async createShipment(userId: string, userRole: string, dto: CreateShipmentDto) {
    // 1. Verify Order exists
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        shippingAddress: true,
        payment: true,
        items: true,
        user: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${dto.orderId}`);
    }

    // 2. Verify authorization: Owner or Admin/Staff
    if (userRole !== Role.ADMIN && userRole !== Role.STAFF && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to create shipments for this order');
    }

    // 3. Prevent duplicate shipment creation
    if (order.shipment) {
      throw new BadRequestException(
        `Shipment already exists for order ${order.orderNumber} with AWB ${order.shipment.awbNumber || 'PENDING'}`,
      );
    }

    // 4. Validate order status eligibility
    const ineligbleStatuses: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
      OrderStatus.PAYMENT_FAILED,
    ];
    if (ineligbleStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot create shipment for order in status: ${order.status}`,
      );
    }

    // 5. Validate payment / COD eligibility
    const isCod = order.payment?.provider === PaymentProvider.COD;
    if (!isCod && order.payment?.status !== PaymentStatus.CAPTURED && order.payment?.status !== PaymentStatus.PAID) {
      // In development/test mock payments might be PENDING, but for safety:
      this.logger.warn(`Order ${order.orderNumber} payment is in status ${order.payment?.status}`);
    }

    // 6. Resolve Shipping Provider
    const provider = this.providerFactory.getProvider(dto.courierProvider);

    // 7. Request Shipment from Courier Provider
    const shipmentResult = await provider.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      recipientName: order.shippingAddress.recipientName,
      recipientPhone: order.shippingAddress.phone,
      recipientAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      },
      items: order.items.map((i) => ({
        title: i.productTitle || 'Item',
        sku: i.sku || 'SKU-001',
        quantity: i.quantity,
        price: Number(i.unitPrice),
      })),
      totalAmount: Number(order.totalAmount),
      isCod,
      codAmount: isCod ? Number(order.totalAmount) : 0,
      weightKg: dto.weightKg || 0.5,
      dimensions: dto.dimensions,
    });

    // 8. Atomically store Shipment record and initial Tracking Event
    return this.prisma.$transaction(
      async (tx) => {
        const shipment = await tx.shipment.create({
          data: {
            orderId: order.id,
            courierProvider: shipmentResult.courierProvider,
            awbNumber: shipmentResult.awbNumber,
            trackingUrl: shipmentResult.trackingUrl,
            labelUrl: shipmentResult.labelUrl,
            status: shipmentResult.status,
            shippingAddress: {
              name: order.shippingAddress.recipientName,
              phone: order.shippingAddress.phone,
              street: order.shippingAddress.street,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
            },
            weight: dto.weightKg || 0.5,
            dimensions: dto.dimensions as any,
            isCod,
            codAmount: isCod ? order.totalAmount : 0,
            estimatedDelivery: shipmentResult.estimatedDeliveryDate,
            metadata: shipmentResult.metadata as any,
          },
        });

        // Initial Tracking Event
        await tx.shipmentTrackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status: ShipmentStatus.LABEL_CREATED,
            location: 'Central Fulfillment Hub - Warehouse 1 (Gurugram, HR)',
            activity: `Shipping label and manifest generated with AWB ${shipmentResult.awbNumber}`,
            eventId: `EVT-INIT-${shipmentResult.awbNumber}`,
          },
        });

        // Update Order with trackingNumber & status
        await tx.order.update({
          where: { id: order.id },
          data: {
            trackingNumber: shipmentResult.awbNumber,
            status: OrderStatus.READY_TO_SHIP,
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'SHIPMENT_CREATED',
            entity: 'Shipment',
            entityId: shipment.id,
            details: {
              orderNumber: order.orderNumber,
              awbNumber: shipmentResult.awbNumber,
              courier: shipmentResult.courierProvider,
            },
          },
        });

        // Outbox: Publish shipment.created event
        if (this.kafkaPublisher) {
          try {
            await this.kafkaPublisher.publishShipmentEvent(tx, KAFKA_EVENT_TYPES.SHIPMENT_CREATED, {
              shipmentId: shipment.id,
              orderId: order.id,
              orderNumber: order.orderNumber,
              courierProvider: shipmentResult.courierProvider,
              awbNumber: shipmentResult.awbNumber,
              status: shipment.status,
              isCod,
              codAmount: isCod ? Number(order.totalAmount) : 0,
              weight: dto.weightKg,
              trackingUrl: shipmentResult.trackingUrl,
              labelUrl: shipmentResult.labelUrl,
            });
          } catch (kErr: any) {
            this.logger.warn(`Failed to enqueue shipment.created outbox event: ${kErr.message}`);
          }
        }

        return shipment;
      },
      { maxWait: 10000, timeout: 25000 },
    );
  }

  // =========================================================================
  // 2. GET SHIPMENT DETAILS
  // =========================================================================

  async getShipmentById(id: string, userId?: string, userRole?: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        OR: [{ id }, { orderId: id }, { awbNumber: id }],
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            items: true,
            shippingAddress: true,
            payment: true,
          },
        },
        trackingEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment not found: ${id}`);
    }

    if (userId && userRole !== Role.ADMIN && userRole !== Role.STAFF && shipment.order?.userId !== userId) {
      throw new ForbiddenException('Access denied to shipment details');
    }

    return shipment;
  }

  // =========================================================================
  // 3. GET LIVE SHIPMENT TRACKING TIMELINE
  // =========================================================================

  async getShipmentTracking(id: string, userId?: string, userRole?: string) {
    const shipment = await this.getShipmentById(id, userId, userRole);

    return {
      awbNumber: shipment.awbNumber,
      orderNumber: shipment.order?.orderNumber,
      status: shipment.status,
      courierProvider: shipment.courierProvider,
      trackingUrl: shipment.trackingUrl,
      estimatedDelivery: shipment.estimatedDelivery,
      dispatchedAt: shipment.dispatchedAt,
      deliveredAt: shipment.deliveredAt,
      isCod: shipment.isCod,
      codAmount: shipment.codAmount ? Number(shipment.codAmount) : 0,
      events: shipment.trackingEvents,
    };
  }

  // =========================================================================
  // 4. CANCEL SHIPMENT
  // =========================================================================

  async cancelShipment(id: string, userId: string, userRole: string, dto?: CancelShipmentDto) {
    const shipment = await this.getShipmentById(id, userId, userRole);

    if (shipment.status === ShipmentStatus.DELIVERED || shipment.status === ShipmentStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(
        `Cannot cancel shipment once it is ${shipment.status}`,
      );
    }

    if (shipment.status === ShipmentStatus.CANCELLED) {
      return { success: true, message: 'Shipment is already cancelled' };
    }

    const provider = this.providerFactory.getProvider(shipment.courierProvider);
    if (shipment.awbNumber) {
      await provider.cancelShipment(shipment.awbNumber, dto?.reason);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.CANCELLED,
          failureReason: dto?.reason || 'Cancelled by customer / admin',
        },
      });

      await tx.shipmentTrackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: ShipmentStatus.CANCELLED,
          location: 'Central Fulfillment Facility',
          activity: `Shipment cancelled. Reason: ${dto?.reason || 'User/Admin request'}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SHIPMENT_CANCELLED',
          entity: 'Shipment',
          entityId: shipment.id,
          details: { reason: dto?.reason },
        },
      });

      return updated;
    });
  }

  // =========================================================================
  // 5. GENERATE SHIPPING LABEL
  // =========================================================================

  async generateLabel(id: string, userId?: string, userRole?: string) {
    const shipment = await this.getShipmentById(id, userId, userRole);
    const provider = this.providerFactory.getProvider(shipment.courierProvider);

    if (!shipment.awbNumber) {
      throw new BadRequestException('AWB number is not assigned for this shipment yet');
    }

    return provider.generateLabel(shipment.awbNumber);
  }

  // =========================================================================
  // 6. ADMIN: FIND ALL SHIPMENTS WITH FILTERS & PAGINATION
  // =========================================================================

  async findAllShipments(query: ShipmentQueryDto) {
    const { page = 1, limit = 10, status, courierProvider, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (courierProvider) where.courierProvider = courierProvider;

    if (search) {
      where.OR = [
        { awbNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              shippingAddress: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          trackingEvents: {
            take: 1,
            orderBy: { timestamp: 'desc' },
          },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      data: shipments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 7. ADMIN: UPDATE SHIPMENT STATUS & SYNC ORDER LIFECYCLE
  // =========================================================================

  async updateShipmentStatus(id: string, dto: UpdateShipmentStatusDto, adminUserId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { include: { payment: true, codTransaction: true, user: true } } },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment not found: ${id}`);
    }

    if (shipment.status === dto.status) {
      this.logger.log(`Shipment ${shipment.id} is already in status ${dto.status}. Skipping duplicate state transition.`);
      return shipment;
    }

    return this.prisma.$transaction(
      async (tx) => {
        const updateData: any = {
          status: dto.status,
        };

        if (dto.failureReason) updateData.failureReason = dto.failureReason;
        if (dto.status === ShipmentStatus.DELIVERED) updateData.deliveredAt = new Date();
        if (dto.status === ShipmentStatus.PICKED_UP && !shipment.dispatchedAt) {
          updateData.dispatchedAt = new Date();
        }

        const updatedShipment = await tx.shipment.update({
          where: { id: shipment.id },
          data: updateData,
        });

        // Add Tracking Event
        await tx.shipmentTrackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status: dto.status,
            location: dto.location || 'In Transit Sorting Hub',
            activity: dto.activity || `Shipment status updated to ${dto.status}`,
          },
        });

        // Lifecycle Synchronization with Order using centralized status mapping & state machine
        const targetOrderStatus = this.statusMappingService.mapCourierToOrderStatus(
          dto.status,
          shipment.order?.status,
        );

        if (targetOrderStatus && shipment.order) {
          await tx.order.update({
            where: { id: shipment.order.id },
            data: { status: targetOrderStatus },
          });

          // If COD delivered, confirm collection
          if (dto.status === ShipmentStatus.DELIVERED && shipment.isCod && shipment.order.payment) {
            await tx.payment.update({
              where: { id: shipment.order.payment.id },
              data: { status: PaymentStatus.COD_COLLECTED },
            });

            await tx.cODTransaction.upsert({
              where: { orderId: shipment.order.id },
              update: {
                status: CODStatus.COD_COLLECTED,
                collectedAt: new Date(),
              },
              create: {
                orderId: shipment.order.id,
                amount: shipment.order.totalAmount,
                status: CODStatus.COD_COLLECTED,
                collectedAt: new Date(),
              },
            });
          }
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'SHIPMENT_STATUS_UPDATED',
            entity: 'Shipment',
            entityId: shipment.id,
            details: {
              previousStatus: shipment.status,
              newStatus: dto.status,
              location: dto.location,
            },
          },
        });

        return updatedShipment;
      },
      { maxWait: 10000, timeout: 25000 },
    );
  }

  // =========================================================================
  // 8. COURIER WEBHOOK HANDLER (IDEMPOTENT & SIGNATURE VERIFIED)
  // =========================================================================

  async handleCourierWebhook(
    providerName: string,
    headers: Record<string, any>,
    payload: any,
    rawBody?: string | Buffer,
  ) {
    const provider = this.providerFactory.getProvider(providerName);

    // 1. Verify cryptographic signature or security token
    const isValidSignature = provider.verifyWebhookSignature(headers, payload, rawBody);
    if (!isValidSignature) {
      throw new ForbiddenException('Invalid courier webhook cryptographic signature');
    }

    // Extract fields resiliently across standard DTO and provider-specific payload schemas
    const awb =
      payload.awbNumber ||
      payload.awb ||
      payload.awb_code ||
      payload.trackingNumber ||
      payload.tracking_number;
    const externalOrderId = payload.externalOrderId || payload.orderNumber || payload.order_number;
    const rawStatus =
      payload.status ||
      payload.current_status ||
      payload.current_status_id ||
      payload.shipment_status;
    const eventId =
      headers['x-courier-event-id'] ||
      headers['X-Courier-Event-Id'] ||
      payload.eventId ||
      payload.event_id ||
      (awb && rawStatus ? `evt_${awb}_${rawStatus}` : `evt_generic_${Date.now()}`);
    const location =
      payload.location ||
      payload.scans?.[0]?.location ||
      payload.checkpoint?.location ||
      'Hub Checkpoint';
    const activity =
      payload.activity ||
      payload.scans?.[0]?.activity ||
      payload.checkpoint?.activity ||
      `Webhook update: ${rawStatus}`;

    // 2. Replay & Idempotency check via Redis (7-day TTL)
    const cacheKey = `webhook_shipping:${eventId}`;
    const alreadyProcessed = await this.redisService.get(cacheKey);
    if (alreadyProcessed) {
      return { received: true, idempotent: true, eventId };
    }

    // 3. Find shipment by AWB or externalOrderId
    let shipment = null;
    if (awb) {
      shipment = await this.prisma.shipment.findUnique({
        where: { awbNumber: awb },
        include: { order: true },
      });

      if (!shipment) {
        shipment = await this.prisma.shipment.findFirst({
          where: {
            OR: [{ awbNumber: awb }, { metadata: { path: ['carrierTrackingNumber'], equals: awb } }],
          },
          include: { order: true },
        });
      }
    }

    if (!shipment && externalOrderId) {
      shipment = await this.prisma.shipment.findFirst({
        where: { order: { orderNumber: externalOrderId } },
        include: { order: true },
      });
    }

    if (!shipment) {
      this.logger.warn(`Webhook received for unknown AWB '${awb}' or Order '${externalOrderId}'`);
      return { received: true, warning: 'Shipment not found', eventId };
    }

    // 4. Normalize status and update tracking events
    const normalizedStatus = this.statusMappingService.mapCourierToShipmentStatus(rawStatus);

    await this.updateShipmentStatus(
      shipment.id,
      {
        status: normalizedStatus,
        location,
        activity,
      },
      'SYSTEM_COURIER_WEBHOOK',
    );

    // 5. Outbox: Publish courier event to courier.shipment.events topic
    if (this.kafkaPublisher) {
      try {
        await this.kafkaPublisher.publishCourierEvent(null, normalizedStatus.toLowerCase(), {
          eventId,
          awbNumber: awb || shipment.awbNumber || '',
          orderNumber: externalOrderId || shipment.order?.orderNumber,
          status: rawStatus,
          courierProvider: shipment.courierProvider,
          location,
          activity,
          timestamp: new Date().toISOString(),
        });
      } catch (kErr: any) {
        this.logger.warn(`Failed to enqueue courier.shipment.events outbox event: ${kErr.message}`);
      }
    }

    // 6. Cache eventId in Redis for 7 days
    await this.redisService.set(cacheKey, '1', 604800);

    return { received: true, eventId };
  }

  // =========================================================================
  // 9. SERVICEABILITY & DYNAMIC PRICING QUOTE HELPERS
  // =========================================================================

  async checkServiceability(pincode: string, providerName?: string) {
    const provider = this.providerFactory.getProvider(providerName);
    if (provider.checkServiceability) {
      return provider.checkServiceability(pincode);
    }
    return {
      serviceable: true,
      pincode,
      codAvailable: true,
      prepaidAvailable: true,
      estimatedDays: 3,
      message: 'Serviceable via default logistics',
    };
  }

  async getPricingQuote(input: PricingQuoteInput, providerName?: string) {
    const provider = this.providerFactory.getProvider(providerName);
    if (provider.getQuote) {
      return provider.getQuote(input);
    }
    return {
      shippingCost: input.shipmentType === 'COD' ? 60 : 40,
      currency: 'INR',
      estimatedDays: 3,
      carrier: 'Standard Logistics',
    };
  }

  // =========================================================================
  // 10. RECONCILIATION AUDIT TASK
  // =========================================================================

  async reconcileShipments(providerName = 'COURIER_PLATFORM', query: ReconciliationQuery = {}) {
    const provider = this.providerFactory.getProvider(providerName);
    if (!provider.reconcileShipments) {
      throw new BadRequestException(`Provider '${providerName}' does not support automatic reconciliation`);
    }

    const result = await provider.reconcileShipments(query);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of result.shipments || []) {
      try {
        const shipment = await this.prisma.shipment.findFirst({
          where: {
            OR: [
              { awbNumber: item.trackingNumber },
              { order: { orderNumber: item.externalOrderId } },
              { id: item.shipmentId },
            ],
          },
          include: { order: true },
        });

        if (!shipment) {
          skippedCount++;
          continue;
        }

        const mappedStatus = this.statusMappingService.mapCourierToShipmentStatus(item.status);
        if (shipment.status !== mappedStatus) {
          await this.updateShipmentStatus(
            shipment.id,
            {
              status: mappedStatus,
              location: item.carrier || 'Reconciled Facility',
              activity: `Reconciled via ${providerName} background synchronization`,
            },
            'SYSTEM_RECONCILIATION_JOB',
          );
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        this.logger.error(`Error reconciling shipment ${item.externalOrderId}: ${err}`);
      }
    }

    return {
      totalFound: result.total || result.shipments?.length || 0,
      updatedCount,
      skippedCount,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }
}
