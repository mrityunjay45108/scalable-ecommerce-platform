'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Clock,
  ArrowLeft,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  RotateCcw,
  Receipt,
  HelpCircle,
  Banknote,
  Boxes,
  Eye,
  X,
} from 'lucide-react';
import { OrderDto, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceModal } from '@/components/shop/invoice-modal';

type ReturnReasonType = 'DAMAGED' | 'WRONG_PRODUCT' | 'SIZE_ISSUE' | 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'OTHER';
type ReturnActionType = 'REFUND' | 'REPLACEMENT';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isJustPlaced = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<any | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState<{ [orderItemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState<ReturnReasonType>('DAMAGED');
  const [returnAction, setReturnAction] = useState<ReturnActionType>('REFUND');
  const [customerNote, setCustomerNote] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankUpi, setBankUpi] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await apiClient.get(`/orders/${id}`);
      setOrder(data.data || data);

      // If shipment exists, fetch tracking
      if (data?.shipment?.id || data?.data?.shipment?.id) {
        const shipmentId = data?.shipment?.id || data?.data?.shipment?.id;
        try {
          const trackRes = await apiClient.get(`/shipments/${shipmentId}/tracking`);
          setTrackingData(trackRes);
        } catch {
          // ignore tracking error if not manifested yet
        }
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setIsCancelling(true);
    try {
      await apiClient.post(`/orders/${id}/cancel`);
      await fetchOrder();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenReturnModal = () => {
    // Initialize item selection with 1 qty each
    if (order?.items) {
      const initial: { [key: string]: number } = {};
      order.items.forEach((i: any) => {
        initial[i.id] = i.quantity;
      });
      setSelectedReturnItems(initial);
    }
    setIsReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const items = Object.entries(selectedReturnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (items.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      await apiClient.post('/returns', {
        orderId: order.id,
        reason: returnReason,
        action: returnAction,
        customerNote,
        items,
        bankDetails:
          order.payment?.provider === 'COD' || order.shipment?.isCod
            ? {
                accountNumber: bankAccountNumber || undefined,
                ifscCode: bankIfsc || undefined,
                accountHolderName: bankHolder || undefined,
                upiId: bankUpi || undefined,
              }
            : undefined,
      });

      setIsReturnModalOpen(false);
      await fetchOrder();
      alert('Return request submitted successfully. Our team is reviewing it.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading live order & shipment status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <Button onClick={() => router.push('/orders')}>View All Orders</Button>
      </div>
    );
  }

  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isDelivered = order.status === OrderStatus.DELIVERED;
  const hasActiveReturn = order.returnRequests && order.returnRequests.length > 0;
  const activeReturn = hasActiveReturn ? order.returnRequests[0] : null;
  const hasRefund = order.refunds && order.refunds.length > 0;
  const activeRefund = hasRefund ? order.refunds[0] : null;

  // Standard Order Fulfillment Steps
  const orderSteps = [
    {
      key: 'confirmed',
      label: 'Confirmed',
      done: true,
      desc: 'Order placed & payment verified',
    },
    {
      key: 'packed',
      label: 'Packed',
      done: [
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
      desc: 'Packed at warehouse',
    },
    {
      key: 'shipped',
      label: 'Shipped',
      done: [
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_PICKED_UP',
        'RETURN_RECEIVED',
        'REFUNDED',
      ].includes(order.status),
      desc: order.shipment?.courierProvider
        ? `In Transit via ${order.shipment.courierProvider}`
        : 'Dispatched with courier',
    },
    {
      key: 'out_for_delivery',
      label: 'Out for Delivery',
      done: [
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_PICKED_UP',
        'RETURN_RECEIVED',
        'REFUNDED',
      ].includes(order.status),
      desc: 'Courier driver on the way',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      done: [
        'DELIVERED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_PICKED_UP',
        'RETURN_RECEIVED',
        'REFUNDED',
      ].includes(order.status),
      desc: order.shipment?.deliveredAt ? `Delivered on ${formatDate(order.shipment.deliveredAt)}` : 'Handed over',
    },
  ];

  // Return Lifecycle Steps
  const returnSteps = activeReturn
    ? [
        {
          key: 'requested',
          label: 'Return Requested',
          done: true,
          desc: `Reason: ${activeReturn.reason}`,
        },
        {
          key: 'approved',
          label: 'Approved',
          done: ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED', 'QUALITY_CHECK', 'REFUND_PENDING', 'REPLACEMENT_PENDING', 'COMPLETED', 'REFUNDED'].includes(activeReturn.status),
          desc: activeReturn.pickupAwb ? `AWB: ${activeReturn.pickupAwb}` : 'Under review',
        },
        {
          key: 'pickup',
          label: 'Pickup',
          done: ['PICKED_UP', 'RECEIVED', 'QUALITY_CHECK', 'REFUND_PENDING', 'REPLACEMENT_PENDING', 'COMPLETED', 'REFUNDED'].includes(activeReturn.status),
          desc: 'Driver pickup collected',
        },
        {
          key: 'received',
          label: 'Received',
          done: ['RECEIVED', 'QUALITY_CHECK', 'REFUND_PENDING', 'REPLACEMENT_PENDING', 'COMPLETED', 'REFUNDED'].includes(activeReturn.status),
          desc: 'Hub in-scan completed',
        },
        {
          key: 'qc',
          label: 'Quality Check',
          done: ['QUALITY_CHECK', 'REFUND_PENDING', 'REPLACEMENT_PENDING', 'COMPLETED', 'REFUNDED'].includes(activeReturn.status),
          desc: activeReturn.qcResult || 'QC In Progress',
        },
        {
          key: 'refund_done',
          label: activeReturn.action === 'REPLACEMENT' ? 'Replacement Dispatched' : 'Refund Processed',
          done: ['COMPLETED', 'REFUNDED'].includes(activeReturn.status),
          desc: 'Completed',
        },
      ]
    : [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      {/* Back button */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
      </Link>

      {/* Success Banner */}
      {isJustPlaced && (
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Thank you! Your order has been placed successfully.</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Payment verified. We are preparing your shipment with courier partners now.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsInvoiceOpen(true)}
            size="sm"
            className="rounded-xl font-extrabold bg-[#ff3f6c] hover:bg-[#e0355f] text-white gap-1.5 shadow-md flex-shrink-0"
          >
            <Download className="w-4 h-4" /> Download Invoice
          </Button>
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-mono">{order.orderNumber}</h1>
            {isCancelled ? (
              <Badge variant="destructive">Cancelled</Badge>
            ) : (
              <Badge variant="default" className="bg-primary">{order.status}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
          {order.shipment?.awbNumber && (
            <p className="text-xs font-semibold text-primary mt-1">
              Courier Waybill (AWB): <span className="font-mono">{order.shipment.awbNumber}</span> ({order.shipment.courierProvider})
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Invoice */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInvoiceOpen(true)}
            className="rounded-xl font-bold gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
          >
            <FileText className="w-4 h-4 text-primary" /> Invoice
          </Button>

          {/* Self Service Return CTA */}
          {isDelivered && !hasActiveReturn && (
            <Button
              size="sm"
              onClick={handleOpenReturnModal}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Return / Replacement
            </Button>
          )}

          {/* Cancel Order CTA */}
          {(order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PROCESSING) && (
            <Button
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={handleCancelOrder}
              className="text-xs text-destructive hover:bg-destructive/10 rounded-xl font-bold"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {order && (
        <InvoiceModal
          order={order}
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
        />
      )}

      {/* 1. Standard Fulfillment Stepper */}
      {!isCancelled && (
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Delivery Status & Estimated Arrival
            </h3>
            {order.shipment?.estimatedDelivery && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl">
                Est. Delivery: {formatDate(order.shipment.estimatedDelivery)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {orderSteps.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-2xl bg-muted/20 border">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step.done
                      ? 'bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/20'
                      : 'bg-muted text-muted-foreground border'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <p className={`text-xs font-bold ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Active Return / Replacement Stepper */}
      {hasActiveReturn && activeReturn && (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Return & Replacement Tracker</span>
              <h3 className="text-base font-extrabold text-rose-700 dark:text-rose-400 font-mono">
                #{activeReturn.returnNumber}
              </h3>
            </div>
            <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-500/10 font-bold self-start">
              {activeReturn.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            {returnSteps.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center text-center space-y-1 p-2 rounded-xl bg-card border">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    step.done
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-muted text-muted-foreground border'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <p className="text-[11px] font-bold">{step.label}</p>
                <p className="text-[9px] text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Refund Completed Card */}
      {hasRefund && activeRefund && (
        <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/5 p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Refund Completed</p>
              <h4 className="text-sm font-extrabold font-mono text-foreground">
                Refund #{activeRefund.refundNumber} • {formatPrice(activeRefund.amount)}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Credited to your original payment method / bank account.
              </p>
            </div>
          </div>
          <Badge variant="default" className="bg-indigo-600 font-bold text-[10px]">
            {activeRefund.status}
          </Badge>
        </div>
      )}

      {/* 4. Live Courier Tracking Events */}
      {trackingData?.events && trackingData.events.length > 0 && (
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Live Checkpoint Tracking
          </h3>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {trackingData.events.map((evt: any, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
                <p className="font-bold text-xs">{evt.activity}</p>
                {evt.location && <p className="text-[11px] text-muted-foreground">{evt.location}</p>}
                <p className="text-[10px] text-muted-foreground font-mono">{formatDate(evt.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold">Ordered Items</h3>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b last:border-0">
                <div>
                  <p className="font-semibold text-foreground">{item.productTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.variantTitle} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-4 border-t text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t text-primary">
              <span>Total Amount</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Payment Info */}
        <div className="space-y-6">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> Delivery Address
            </h3>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-bold text-foreground">{order.shippingAddress?.recipientName}</p>
              <p>{order.shippingAddress?.street}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.phone}</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="text-sm font-bold">Payment Summary</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Method: <strong className="text-foreground">{order.payment?.provider || (order.shipment?.isCod ? 'COD' : 'ONLINE')}</strong>
              </p>
              <p>
                Status:{' '}
                <span className="font-semibold text-emerald-600">{order.payment?.status || 'PAID'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Return Request Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base">Request Return / Replacement</h3>
                <p className="text-xs text-muted-foreground">Order #{order.orderNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsReturnModalOpen(false)}
                className="rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              {/* Item selection */}
              <div>
                <label className="font-bold block mb-2">Select Items to Return</label>
                <div className="space-y-2 border p-3 rounded-2xl bg-muted/20">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.productTitle}</p>
                        <p className="text-[10px] text-muted-foreground">{item.variantTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Qty:</span>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={selectedReturnItems[item.id] || 0}
                          onChange={(e) =>
                            setSelectedReturnItems({
                              ...selectedReturnItems,
                              [item.id]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 h-8 px-2 rounded-xl border bg-background text-center font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Action */}
              <div>
                <label className="font-bold block mb-1">Preferred Resolution</label>
                <select
                  value={returnAction}
                  onChange={(e) => setReturnAction(e.target.value as ReturnActionType)}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                >
                  <option value="REFUND">Refund to Original Payment / Bank</option>
                  <option value="REPLACEMENT">Replacement Unit</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="font-bold block mb-1">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReasonType)}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                >
                  <option value="DAMAGED">Damaged in Transit / Broken</option>
                  <option value="WRONG_PRODUCT">Wrong Product Delivered</option>
                  <option value="SIZE_ISSUE">Size / Fit Issue</option>
                  <option value="DEFECTIVE">Defective / Non-Functional</option>
                  <option value="NOT_AS_DESCRIBED">Not as Described on Website</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="font-bold block mb-1">Additional Details</label>
                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Explain the defect or issue in detail..."
                  className="w-full p-3 rounded-xl border bg-background"
                />
              </div>

              {/* Bank Details if COD */}
              {(order.payment?.provider === 'COD' || order.shipment?.isCod) && returnAction === 'REFUND' && (
                <div className="space-y-3 p-4 border rounded-2xl bg-muted/30">
                  <p className="font-bold text-primary flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" /> Bank Account for COD Refund Payout
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      placeholder="Account Holder Name"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      className="h-9 px-3 rounded-xl border bg-background"
                    />
                    <input
                      placeholder="Bank Account Number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="h-9 px-3 rounded-xl border bg-background"
                    />
                    <input
                      placeholder="IFSC Code"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      className="h-9 px-3 rounded-xl border bg-background"
                    />
                    <input
                      placeholder="UPI ID (Optional, e.g. user@okaxis)"
                      value={bankUpi}
                      onChange={(e) => setBankUpi(e.target.value)}
                      className="h-9 px-3 rounded-xl border bg-background"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsReturnModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingReturn} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
                  {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
