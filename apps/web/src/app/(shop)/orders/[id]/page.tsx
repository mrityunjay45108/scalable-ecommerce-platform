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
} from 'lucide-react';
import { OrderDto, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isJustPlaced = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await apiClient.get(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      console.error(err);
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading order details...</p>
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

  // Stepper milestones
  const steps = [
    { key: 'placed', label: 'Order Placed', icon: Clock, done: true },
    {
      key: 'processing',
      label: 'Processing',
      icon: Package,
      done: ([OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED] as OrderStatus[]).includes(order.status),
    },
    {
      key: 'shipped',
      label: 'Shipped',
      icon: Truck,
      done: ([OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED] as OrderStatus[]).includes(order.status),
    },
    {
      key: 'delivered',
      label: 'Delivered',
      icon: CheckCircle2,
      done: order.status === OrderStatus.DELIVERED,
    },
  ];

  const isCancelled = order.status === OrderStatus.CANCELLED;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      {/* Back button */}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
      </Link>

      {/* Success Banner if redirected from checkout */}
      {isJustPlaced && (
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-6 flex items-center gap-4 text-emerald-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Thank you! Your order has been placed.</h3>
            <p className="text-xs text-emerald-700">
              Confirmation sent. We are preparing your shipment now.
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black">{order.orderNumber}</h1>
            {isCancelled ? (
              <Badge variant="destructive">Cancelled</Badge>
            ) : (
              <Badge variant="default" className="bg-primary">{order.status}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
          {order.trackingNumber && (
            <p className="text-xs font-semibold text-primary mt-1">
              Tracking #: <span className="font-mono">{order.trackingNumber}</span>
            </p>
          )}
        </div>

        {order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PROCESSING ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isCancelling}
            onClick={handleCancelOrder}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        ) : null}
      </div>

      {/* Visual Tracking Stepper */}
      {!isCancelled && (
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <h3 className="text-sm font-bold mb-6">Shipment Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-2 relative z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all shadow-sm ${
                      step.done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Items */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold">Ordered Items</h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs pb-2 border-b last:border-0">
                <div>
                  <p className="font-semibold text-foreground">{item.productTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{item.variantTitle} × {item.quantity}</p>
                </div>
                <span className="font-bold">{formatPrice(item.totalPrice)}</span>
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
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t text-primary">
              <span>Total Paid</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment info */}
        <div className="space-y-6">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" /> Delivery Address
            </h3>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-bold text-foreground">{order.shippingAddress?.recipientName}</p>
              <p>{order.shippingAddress?.street}</p>
              <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</p>
              <p>{order.shippingAddress?.phone}</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-2">
            <h3 className="text-sm font-bold">Payment Summary</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Method: <strong className="text-foreground">{order.payment?.provider || 'N/A'}</strong></p>
              <p>Status: <span className="font-semibold text-emerald-600">{order.payment?.status || 'PAID'}</span></p>
              {order.payment?.transactionId && (
                <p className="font-mono text-[10px]">Txn ID: {order.payment.transactionId}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
