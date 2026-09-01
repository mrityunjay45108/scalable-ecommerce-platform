import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponsService } from '../coupons/coupons.service';
import { CheckoutDto, CheckoutPreviewDto, UpdateOrderStatusDto, OrderQueryDto } from './orders.dto';
import { OrderStatus, PaymentStatus, PaymentProvider } from '@ecommerce/types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private couponsService: CouponsService,
  ) {}

  async previewCheckout(userId: string, dto: CheckoutPreviewDto) {
    // 1. Fetch user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 2. Validate Address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // 3. Compute Item subtotals and check inventory
    let subtotal = 0;
    let totalItems = 0;
    const inventoryIssues = [];

    const items = cart.items.map((item) => {
      const price = Number(item.variant.price);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;

      const available = Math.max(0, item.variant.stockQuantity - item.variant.reservedStock);
      if (available < item.quantity) {
        inventoryIssues.push({
          variantId: item.variantId,
          productTitle: item.variant.product.title,
          requested: item.quantity,
          available,
        });
      }

      return {
        id: item.id,
        variantId: item.variantId,
        productTitle: item.variant.product.title,
        variantTitle: item.variant.title,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: Number(itemTotal.toFixed(2)),
        image: item.variant.product.images[0]?.url,
        inStock: available >= item.quantity,
      };
    });

    // 4. Coupon calculation
    let discountAmount = 0;
    let couponDetails: any = null;

    if (dto.couponCode) {
      const couponResult = await this.couponsService.validateAndCalculate(userId, {
        code: dto.couponCode,
        subtotal,
      });
      discountAmount = couponResult.discountAmount;
      couponDetails = couponResult;
    }

    const shippingCost = subtotal >= 100 ? 0 : 10;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const tax = Number((taxableAmount * 0.08).toFixed(2));
    const totalAmount = Number((taxableAmount + tax + shippingCost).toFixed(2));

    return {
      items,
      totalItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      tax,
      totalAmount,
      coupon: couponDetails,
      shippingAddress: address,
      inventoryIssues,
      isReadyForPayment: inventoryIssues.length === 0,
    };
  }

  // =========================================================================
  // TRANSACTION-SAFE CHECKOUT & ORDER CREATION WITH FULL SNAPSHOTS
  // =========================================================================

  async checkout(userId: string, dto: CheckoutDto) {
    // 1. Fetch user's cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 2. Validate Address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // 3. Compute Item subtotals and check stock
    let subtotal = 0;
    const reservationItems = [];

    for (const item of cart.items) {
      const price = Number(item.variant.price);
      subtotal += price * item.quantity;

      reservationItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    // 4. Coupon calculation
    let discountAmount = 0;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const couponResult = await this.couponsService.validateAndCalculate(userId, {
        code: dto.couponCode,
        subtotal,
      });
      discountAmount = couponResult.discountAmount;
      couponId = couponResult.couponId;
    }

    const shippingCost = subtotal >= 100 ? 0 : 10;
    const tax = Number(((subtotal - discountAmount) * 0.08).toFixed(2));
    const totalAmount = Number((subtotal - discountAmount + tax + shippingCost).toFixed(2));

    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 5. Reserve Inventory
      await this.inventoryService.reserveStock(orderNumber, reservationItems);

      // 6. Create Order with snapshot data in items
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: address.id,
          subtotal,
          tax,
          shippingCost,
          discountAmount,
          totalAmount,
          couponId,
          status:
            dto.paymentProvider === PaymentProvider.COD
              ? OrderStatus.PROCESSING
              : OrderStatus.PENDING_PAYMENT,
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.variant.price,
              totalPrice: Number(item.variant.price) * item.quantity,
              productTitle: item.variant.product.title,
              variantTitle: item.variant.title,
              sku: item.variant.sku,
              imageUrl: item.variant.product.images?.[0]?.url || null,
            })),
          },
          payment: {
            create: {
              provider: dto.paymentProvider,
              amount: totalAmount,
              currency: 'USD',
              status:
                dto.paymentProvider === PaymentProvider.COD
                  ? PaymentStatus.PENDING
                  : PaymentStatus.PENDING,
            },
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { include: { images: true } } },
              },
            },
          },
          shippingAddress: true,
          payment: true,
        },
      });

      // If coupon used, record coupon usage
      if (couponId) {
        await tx.couponUsage.create({
          data: {
            couponId,
            userId,
            orderId: order.id,
          },
        });
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // If COD, commit stock immediately
      if (dto.paymentProvider === PaymentProvider.COD) {
        await this.inventoryService.commitStock(orderNumber, reservationItems);
      }

      // Clear user's cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return this.formatOrder(order);
    });
  }

  // =========================================================================
  // CUSTOMER ORDER RETRIEVAL & LIFECYCLE
  // =========================================================================

  async findUserOrders(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { include: { images: true } } },
              },
            },
          },
          shippingAddress: true,
          payment: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.formatOrder(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrderById(orderIdOrNumber: string, userId?: string) {
    const where: any = {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
    };

    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            variant: {
              include: { product: { include: { images: true } } },
            },
          },
        },
        shippingAddress: true,
        payment: true,
        coupon: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async cancelOrder(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: userId ? { id: orderId, userId } : { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(`Cannot cancel order in '${order.status}' status`);
    }

    // Release stock reservation
    const reservationItems = order.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    await this.inventoryService.releaseStock(order.orderNumber, reservationItems);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: {
        items: {
          include: {
            variant: { include: { product: { include: { images: true } } } },
          },
        },
        shippingAddress: true,
        payment: true,
      },
    });

    return this.formatOrder(updated);
  }

  // =========================================================================
  // ADMIN ORDER MANAGEMENT
  // =========================================================================

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        trackingNumber: dto.trackingNumber ?? order.trackingNumber,
      },
      include: {
        items: {
          include: {
            variant: { include: { product: { include: { images: true } } } },
          },
        },
        shippingAddress: true,
        payment: true,
      },
    });

    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ORDER_STATUS_UPDATED',
          entity: 'Order',
          entityId: orderId,
          details: {
            fromStatus: order.status,
            toStatus: dto.status,
            trackingNumber: dto.trackingNumber,
          },
        },
      });
    }

    return this.formatOrder(updated);
  }

  async findAllAdmin(query: OrderQueryDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: {
            include: {
              variant: { include: { product: { include: { images: true } } } },
            },
          },
          shippingAddress: true,
          payment: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.formatOrder(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private formatOrder(order: any) {
    const status = order.status;
    const isCompleted = (s: OrderStatus) => {
      const orderProgression: OrderStatus[] = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];
      return orderProgression.indexOf(status as OrderStatus) >= orderProgression.indexOf(s);
    };

    return {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shippingCost: Number(order.shippingCost),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      items: order.items?.map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        variantTitle: i.variantTitle || i.variant?.title || 'Standard',
        productTitle: i.productTitle || i.variant?.product?.title || 'Product',
        productSlug: i.variant?.product?.slug || '',
        productImage: i.imageUrl || i.variant?.product?.images?.[0]?.url || null,
        sku: i.sku || i.variant?.sku || '',
      })),
      tracking: {
        trackingNumber: order.trackingNumber || null,
        status: order.status,
        steps: [
          { status: OrderStatus.PENDING_PAYMENT, title: 'Order Placed', completed: true },
          { status: OrderStatus.PAID, title: 'Payment Confirmed', completed: isCompleted(OrderStatus.PAID) },
          { status: OrderStatus.PROCESSING, title: 'Processing & Packing', completed: isCompleted(OrderStatus.PROCESSING) },
          { status: OrderStatus.SHIPPED, title: 'Shipped / In Transit', completed: isCompleted(OrderStatus.SHIPPED) },
          { status: OrderStatus.DELIVERED, title: 'Delivered', completed: isCompleted(OrderStatus.DELIVERED) },
        ],
      },
      payment: order.payment
        ? {
            ...order.payment,
            amount: Number(order.payment.amount),
          }
        : null,
    };
  }
}
