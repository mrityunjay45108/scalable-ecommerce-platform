'use client';

import React, { useEffect, useState } from 'react';
import { OrderDto, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  PackageCheck,
  RotateCcw,
  Receipt,
  Banknote,
  MapPin,
  User,
  CreditCard,
  AlertCircle,
  ShieldCheck,
  X,
  XCircle,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailsModalOrder, setDetailsModalOrder] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.PROCESSING);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/orders/admin/all');
      setOrders(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenStatus = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.trackingNumber || '');
    setShowStatusModal(true);
  };

  const handleOpenDetails = async (order: any) => {
    try {
      const fullOrder = await apiClient.get(`/orders/${order.id}`);
      setDetailsModalOrder(fullOrder.data || fullOrder);
    } catch {
      setDetailsModalOrder(order);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(`/orders/admin/${selectedOrder.id}/status`, {
        status: newStatus,
        trackingNumber: trackingNumber || undefined,
      });
      setShowStatusModal(false);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      searchFilter === '' ||
      o.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.user?.firstName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.shipment?.awbNumber?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Timeline Step Evaluator
  const getTimelineSteps = (order: any) => {
    const isCod = order.payment?.provider === 'COD' || order.shipment?.isCod;
    const isCancelled = order.status === OrderStatus.CANCELLED;
    const isRefunded = order.status === OrderStatus.REFUNDED || order.payment?.status === 'REFUNDED';
    const hasReturn = order.returnRequests && order.returnRequests.length > 0;

    const baseSteps = [
      {
        id: 'CONFIRMED',
        title: 'Order Confirmed',
        description: `Order #${order.orderNumber} placed`,
        completed: true,
        date: order.createdAt,
      },
      {
        id: 'PAYMENT',
        title: isCod ? 'COD Pending' : 'Payment Received',
        description: isCod ? 'Pay on delivery' : `${order.payment?.provider || 'Card'} payment confirmed`,
        completed: isCod ? true : order.payment?.status === 'PAID' || order.payment?.status === 'CAPTURED',
        date: order.payment?.updatedAt || order.createdAt,
      },
      {
        id: 'INVENTORY',
        title: 'Stock Reserved',
        description: 'Items allocated at warehouse',
        completed: order.status !== OrderStatus.PENDING_PAYMENT,
      },
      {
        id: 'PACKED',
        title: 'Packed & Manifested',
        description: order.shipment?.awbNumber ? `AWB: ${order.shipment.awbNumber}` : 'Packaging completed',
        completed: [
          'PACKED',
          'READY_TO_SHIP',
          'SHIPPED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'RETURN_REQUESTED',
          'RETURN_APPROVED',
          'RETURN_PICKED_UP',
          'RETURN_RECEIVED',
          'REFUNDED',
        ].includes(order.status),
      },
      {
        id: 'SHIPPED',
        title: 'Shipped via Courier',
        description: `Courier: ${order.shipment?.courierProvider || 'Standard Express'}`,
        completed: [
          'SHIPPED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'RETURN_REQUESTED',
          'RETURN_APPROVED',
          'RETURN_PICKED_UP',
          'RETURN_RECEIVED',
          'REFUNDED',
        ].includes(order.status),
      },
      {
        id: 'OUT_FOR_DELIVERY',
        title: 'Out for Delivery',
        description: 'Courier agent on route to customer doorstep',
        completed: [
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'RETURN_REQUESTED',
          'RETURN_APPROVED',
          'RETURN_PICKED_UP',
          'RETURN_RECEIVED',
          'REFUNDED',
        ].includes(order.status),
      },
      {
        id: 'DELIVERED',
        title: 'Delivered',
        description: 'Package handed over to customer',
        completed: [
          'DELIVERED',
          'RETURN_REQUESTED',
          'RETURN_APPROVED',
          'RETURN_PICKED_UP',
          'RETURN_RECEIVED',
          'REFUNDED',
        ].includes(order.status),
        date: order.shipment?.deliveredAt,
      },
    ];

    if (isCod) {
      baseSteps.push({
        id: 'COD_COLLECTED',
        title: 'COD Cash Collected',
        description: order.payment?.status === 'COD_COLLECTED' || order.payment?.status === 'COD_SETTLED' ? 'Cash collected & verified' : 'Awaiting collection',
        completed: order.payment?.status === 'COD_COLLECTED' || order.payment?.status === 'COD_SETTLED',
      });
    }

    if (hasReturn) {
      const activeReturn = order.returnRequests[0];
      baseSteps.push(
        {
          id: 'RETURN_REQUESTED',
          title: 'Return Requested',
          description: `Reason: ${activeReturn.reason || 'Customer request'}`,
          completed: true,
          date: activeReturn.requestedAt,
        },
        {
          id: 'RETURN_APPROVED',
          title: 'Return Approved & Pickup Scheduled',
          description: activeReturn.pickupAwb ? `Reverse AWB: ${activeReturn.pickupAwb}` : 'Under Review',
          completed: ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'COMPLETED'].includes(activeReturn.status),
          date: activeReturn.approvedAt,
        },
        {
          id: 'RETURN_PICKED_UP',
          title: 'Return Picked Up',
          description: 'Courier driver collected return item',
          completed: ['PICKED_UP', 'RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'COMPLETED'].includes(activeReturn.status),
          date: activeReturn.pickedUpAt,
        },
        {
          id: 'RETURN_RECEIVED',
          title: 'Received & QC Inspected',
          description: activeReturn.qcResult ? `QC: ${activeReturn.qcResult}` : 'Under Inspection',
          completed: ['RECEIVED', 'QUALITY_CHECK', 'REFUND_PENDING', 'REFUNDED', 'COMPLETED'].includes(activeReturn.status),
          date: activeReturn.receivedAt,
        },
      );
    }

    if (isRefunded || (order.refunds && order.refunds.length > 0)) {
      baseSteps.push({
        id: 'REFUNDED',
        title: 'Refund Processed',
        description: 'Amount credited back to original payment method or bank',
        completed: true,
        date: order.refunds?.[0]?.completedAt,
      });
    }

    return baseSteps;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Order Management & Fulfillment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status transitions, shipment manifestation, returns, and reverse logistics tracking
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="rounded-xl flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search Order #, Customer, Email, AWB..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1 h-10 px-4 rounded-2xl border bg-card text-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 rounded-2xl border bg-card text-xs font-semibold"
        >
          <option value="ALL">All Statuses</option>
          <option value={OrderStatus.CONFIRMED}>CONFIRMED</option>
          <option value={OrderStatus.PROCESSING}>PROCESSING</option>
          <option value={OrderStatus.PACKED}>PACKED</option>
          <option value={OrderStatus.READY_TO_SHIP}>READY_TO_SHIP</option>
          <option value={OrderStatus.SHIPPED}>SHIPPED</option>
          <option value={OrderStatus.OUT_FOR_DELIVERY}>OUT_FOR_DELIVERY</option>
          <option value={OrderStatus.DELIVERED}>DELIVERED</option>
          <option value={OrderStatus.RETURN_REQUESTED}>RETURN_REQUESTED</option>
          <option value={OrderStatus.REFUNDED}>REFUNDED</option>
          <option value={OrderStatus.CANCELLED}>CANCELLED</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">Shipment Status</th>
                <th className="p-4">Courier</th>
                <th className="p-4">AWB</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o: any) => {
                  const paymentMethod = o.payment?.provider || (o.shipment?.isCod ? 'COD' : 'ONLINE');
                  const paymentStatus = o.payment?.status || 'PENDING';
                  const shipmentStatus = o.shipment?.status || 'PENDING';
                  const courier = o.shipment?.courierProvider || 'STANDARD_EXPRESS';
                  const awb = o.shipment?.awbNumber || o.trackingNumber || 'Unassigned';

                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-primary">{o.orderNumber}</td>
                      <td className="p-4">
                        <p className="font-semibold">
                          {o.user?.firstName} {o.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{o.user?.email}</p>
                      </td>
                      <td className="p-4 font-extrabold">{formatPrice(o.totalAmount)}</td>
                      <td className="p-4">
                        <span className="font-bold uppercase text-[11px] px-2 py-0.5 bg-muted rounded-lg">
                          {paymentMethod}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            paymentStatus === 'PAID' || paymentStatus === 'CAPTURED' || paymentStatus === 'COD_COLLECTED'
                              ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                              : paymentStatus === 'REFUNDED'
                              ? 'border-indigo-500 text-indigo-600 bg-indigo-500/10'
                              : 'border-amber-500 text-amber-600 bg-amber-500/10'
                          }`}
                        >
                          {paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="default" className="text-[10px] font-bold">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-[11px] font-semibold">{shipmentStatus}</span>
                      </td>
                      <td className="p-4 text-muted-foreground font-semibold">{courier}</td>
                      <td className="p-4 font-mono text-[11px] text-primary">{awb}</td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenDetails(o)}
                          className="rounded-xl text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStatus(o)}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Update Status
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Order Details & Timeline Modal */}
      {detailsModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border p-6 max-w-4xl w-full shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-black">Order #{detailsModalOrder.orderNumber}</h3>
                <p className="text-xs text-muted-foreground">
                  Placed on {formatDate(detailsModalOrder.createdAt)} • Total: {formatPrice(detailsModalOrder.totalAmount)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDetailsModalOrder(null)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Visual Fulfillment Lifecycle Timeline */}
            <div className="space-y-3 bg-muted/20 p-5 rounded-2xl border">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Fulfillment & Logistics Lifecycle Timeline
              </h4>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {getTimelineSteps(detailsModalOrder).map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.completed
                          ? 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/20'
                          : 'bg-muted border text-muted-foreground'
                      }`}
                    >
                      {step.completed ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className={`font-bold text-xs ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{step.description}</p>
                      {step.date && (
                        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                          {formatDate(step.date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Products & Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items */}
              <div className="space-y-3 border p-4 rounded-2xl bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-primary" />
                  Order Items
                </h4>
                <div className="space-y-3 divide-y">
                  {detailsModalOrder.items?.map((item: any) => (
                    <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold">{item.productTitle}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.variantTitle} • SKU: {item.sku}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-extrabold">{formatPrice(Number(item.unitPrice) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Shipping Address */}
              <div className="space-y-3 border p-4 rounded-2xl bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Customer & Delivery Address
                </h4>
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    {detailsModalOrder.shippingAddress?.recipientName ||
                      `${detailsModalOrder.user?.firstName} ${detailsModalOrder.user?.lastName}`}
                  </p>
                  <p className="text-muted-foreground">{detailsModalOrder.shippingAddress?.phone}</p>
                  <p className="text-muted-foreground">{detailsModalOrder.shippingAddress?.street}</p>
                  <p className="text-muted-foreground">
                    {detailsModalOrder.shippingAddress?.city}, {detailsModalOrder.shippingAddress?.state} -{' '}
                    {detailsModalOrder.shippingAddress?.postalCode}
                  </p>
                  <p className="text-muted-foreground">{detailsModalOrder.shippingAddress?.country}</p>
                </div>
              </div>
            </div>

            {/* Payment, Shipment & Returns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Payment */}
              <div className="border p-4 rounded-2xl bg-card space-y-1">
                <p className="font-bold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Payment Details
                </p>
                <p className="font-extrabold text-sm">{formatPrice(detailsModalOrder.totalAmount)}</p>
                <p className="text-muted-foreground font-semibold">Provider: {detailsModalOrder.payment?.provider || 'N/A'}</p>
                <p className="text-emerald-600 font-bold">Status: {detailsModalOrder.payment?.status}</p>
                {detailsModalOrder.payment?.transactionId && (
                  <p className="text-[10px] font-mono text-muted-foreground truncate">
                    TxID: {detailsModalOrder.payment.transactionId}
                  </p>
                )}
              </div>

              {/* Shipment */}
              <div className="border p-4 rounded-2xl bg-card space-y-1">
                <p className="font-bold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  Shipment & Logistics
                </p>
                <p className="font-bold">{detailsModalOrder.shipment?.courierProvider || 'Standard Express'}</p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  AWB: {detailsModalOrder.shipment?.awbNumber || detailsModalOrder.trackingNumber || 'Pending'}
                </p>
                <p className="text-primary font-semibold">Status: {detailsModalOrder.shipment?.status || 'PENDING'}</p>
              </div>

              {/* Returns / Refunds */}
              <div className="border p-4 rounded-2xl bg-card space-y-1">
                <p className="font-bold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                  Return & Refund Records
                </p>
                {detailsModalOrder.returnRequests && detailsModalOrder.returnRequests.length > 0 ? (
                  <div>
                    <p className="font-bold text-rose-600">Return #{detailsModalOrder.returnRequests[0].returnNumber}</p>
                    <p className="text-[10px] text-muted-foreground">Status: {detailsModalOrder.returnRequests[0].status}</p>
                    <p className="text-[10px] text-muted-foreground">Action: {detailsModalOrder.returnRequests[0].action}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No return requests on this order.</p>
                )}
                {detailsModalOrder.refunds && detailsModalOrder.refunds.length > 0 && (
                  <div className="pt-1 border-t mt-1">
                    <p className="font-bold text-indigo-600">Refund #{detailsModalOrder.refunds[0].refundNumber}</p>
                    <p className="text-[10px] font-extrabold">{formatPrice(detailsModalOrder.refunds[0].amount)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setDetailsModalOrder(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* State Machine Update Modal */}
      {showStatusModal && selectedOrder && (() => {
        const ALLOWED_NEXT_MAP: Record<string, string[]> = {
          PENDING_PAYMENT: ['PAID', 'CONFIRMED', 'PROCESSING', 'CANCELLED', 'PAYMENT_FAILED'],
          PAID: ['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
          CONFIRMED: ['PROCESSING', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
          PROCESSING: ['PACKED', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
          PACKED: ['READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
          READY_TO_SHIP: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
          SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
          OUT_FOR_DELIVERY: ['DELIVERED'],
          DELIVERED: ['RETURN_REQUESTED', 'RETURN_APPROVED'],
          RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'CANCELLED'],
          RETURN_APPROVED: ['RETURN_PICKED_UP', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED'],
          RETURN_PICKED_UP: ['RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED'],
          RETURN_RECEIVED: ['REFUND_PENDING', 'REFUNDED', 'RETURN_REJECTED'],
          REFUND_PENDING: ['REFUNDED'],
          RETURN_REJECTED: [],
          REFUNDED: [],
          CANCELLED: [],
          PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
        };

        const allowedNext = ALLOWED_NEXT_MAP[selectedOrder.status] || [];

        const statusConfigList: Array<{
          status: string;
          label: string;
          category: 'fulfillment' | 'delivery' | 'return' | 'terminal';
          description: string;
          badgeColor: string;
          icon: any;
        }> = [
          {
            status: 'CONFIRMED',
            label: 'Confirmed',
            category: 'fulfillment',
            description: 'Order approved & inventory allocated',
            badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            icon: CheckCircle2,
          },
          {
            status: 'PROCESSING',
            label: 'Processing / Picking',
            category: 'fulfillment',
            description: 'Warehouse is picking & assembling items',
            badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
            icon: Clock,
          },
          {
            status: 'PACKED',
            label: 'Packed in Box',
            category: 'fulfillment',
            description: 'Package boxed, sealed & labeled',
            badgeColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
            icon: PackageCheck,
          },
          {
            status: 'READY_TO_SHIP',
            label: 'Ready for Pickup',
            category: 'fulfillment',
            description: 'Manifest generated, awaiting courier pickup',
            badgeColor: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
            icon: Package,
          },
          {
            status: 'SHIPPED',
            label: 'Shipped / In Transit',
            category: 'delivery',
            description: 'Handed over to courier partner & in transit',
            badgeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
            icon: Truck,
          },
          {
            status: 'OUT_FOR_DELIVERY',
            label: 'Out for Delivery',
            category: 'delivery',
            description: 'Courier agent on route to customer doorstep',
            badgeColor: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
            icon: MapPin,
          },
          {
            status: 'DELIVERED',
            label: 'Delivered',
            category: 'delivery',
            description: 'Order successfully delivered to customer',
            badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
            icon: CheckCircle2,
          },
          {
            status: 'RETURN_REQUESTED',
            label: 'Return Requested',
            category: 'return',
            description: 'Customer raised return request',
            badgeColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
            icon: RotateCcw,
          },
          {
            status: 'RETURN_APPROVED',
            label: 'Return Approved',
            category: 'return',
            description: 'Return approved & reverse pickup scheduled',
            badgeColor: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800',
            icon: ShieldCheck,
          },
          {
            status: 'RETURN_PICKED_UP',
            label: 'Return Picked Up',
            category: 'return',
            description: 'Courier collected return package from customer',
            badgeColor: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
            icon: Truck,
          },
          {
            status: 'RETURN_RECEIVED',
            label: 'Return Received & QC',
            category: 'return',
            description: 'Item arrived at warehouse and passed QC',
            badgeColor: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
            icon: PackageCheck,
          },
          {
            status: 'REFUND_PENDING',
            label: 'Refund Pending',
            category: 'return',
            description: 'Refund approved, awaiting disbursement',
            badgeColor: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800',
            icon: CreditCard,
          },
          {
            status: 'REFUNDED',
            label: 'Refunded',
            category: 'return',
            description: 'Full/partial refund completed to customer',
            badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
            icon: RefreshCw,
          },
          {
            status: 'CANCELLED',
            label: 'Cancelled',
            category: 'terminal',
            description: 'Order voided & reserved stock released',
            badgeColor: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
            icon: XCircle,
          },
        ];

        const renderCard = (cfg: (typeof statusConfigList)[number]) => {
          const Icon = cfg.icon;
          const isSelected = Boolean(newStatus) && String(newStatus) === String(cfg.status);
          const isCurrent = Boolean(selectedOrder?.status) && String(selectedOrder.status) === String(cfg.status);
          const isAllowed = isCurrent || allowedNext.includes(cfg.status);

          return (
            <button
              key={cfg.status}
              type="button"
              disabled={!isAllowed}
              onClick={() => isAllowed && setNewStatus(cfg.status as OrderStatus)}
              className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all relative ${
                !isAllowed
                  ? 'opacity-40 cursor-not-allowed bg-muted/20 border-dashed border-border/50'
                  : isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm'
                  : 'border-border/60 hover:border-border hover:bg-muted/40 cursor-pointer'
              }`}
            >
              <div className={`p-2 rounded-xl border ${cfg.badgeColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs truncate">{cfg.label}</p>
                  {isCurrent && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-muted text-muted-foreground rounded uppercase">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {cfg.description}
                </p>
                {!isAllowed && (
                  <span className="text-[9px] text-rose-500 font-semibold mt-0.5 block">
                    🔒 Not available from {selectedOrder.status}
                  </span>
                )}
              </div>
              {isSelected ? (
                <div className="w-2.5 h-2.5 rounded-full bg-primary absolute top-3 right-3 shadow" />
              ) : !isAllowed ? (
                <Lock className="w-3.5 h-3.5 text-muted-foreground/60 absolute top-3 right-3" />
              ) : null}
            </button>
          );
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card rounded-3xl border p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-extrabold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Manage Order Status & Fulfillment
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold bg-muted px-2.5 py-0.5 rounded-md">
                      #{selectedOrder.orderNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Customer: <strong>{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</strong> ({selectedOrder.user?.email})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-semibold">Current State</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdateStatus} className="space-y-5 overflow-y-auto pr-1 flex-1">
                {/* 1. Fulfillment Pipeline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      1. Fulfillment & Delivery Pipeline
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Allowed for active orders
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {statusConfigList
                      .filter((c) => c.category === 'fulfillment' || c.category === 'delivery')
                      .map(renderCard)}
                  </div>
                </div>

                {/* 2. Returns & Reverse Pipeline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-pink-600" />
                      2. Return & Refund Operations
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Active after delivery
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {statusConfigList
                      .filter((c) => c.category === 'return')
                      .map(renderCard)}
                  </div>
                </div>

                {/* 3. Terminal / Cancellation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      3. Order Cancellation
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {statusConfigList
                      .filter((c) => c.category === 'terminal')
                      .map(renderCard)}
                  </div>
                </div>

                {/* 2. Courier & Tracking Details */}
                <div className="border p-4 rounded-2xl bg-muted/20 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    Shipment & Courier Tracking Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Tracking / AWB Number
                      </label>
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. SR-DEL-9812491"
                        className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Courier Partner
                      </label>
                      <div className="h-9 px-3 rounded-xl border bg-background text-xs flex items-center font-semibold text-foreground">
                        {selectedOrder.shipment?.courierProvider || 'Shiprocket Logistics Express'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-[11px] text-muted-foreground">
                    Selected Status: <strong className="text-foreground">{newStatus}</strong>
                  </p>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowStatusModal(false)}
                      className="rounded-xl h-10 px-4 text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="rounded-xl h-10 px-5 text-xs font-bold gap-1.5 shadow-md shadow-primary/10"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Apply Status Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
