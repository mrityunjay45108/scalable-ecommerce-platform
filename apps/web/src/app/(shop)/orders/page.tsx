'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ArrowRight, Clock, CheckCircle, Truck, XCircle, FileText, RotateCcw, Receipt } from 'lucide-react';
import { OrderDto, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceModal } from '@/components/shop/invoice-modal';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callback=/orders');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await apiClient.get('/orders');
        setOrders(res.data || (Array.isArray(res) ? res : []));
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading]);

  const getStatusBadge = (order: any) => {
    if (order.status === OrderStatus.DELIVERED) {
      return <Badge variant="success">Delivered</Badge>;
    }
    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.OUT_FOR_DELIVERY) {
      return <Badge variant="default" className="bg-sky-600">In Transit</Badge>;
    }
    if (order.status === OrderStatus.RETURN_REQUESTED || order.status === OrderStatus.RETURN_APPROVED) {
      return <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-500/10">Return Active</Badge>;
    }
    if (order.status === OrderStatus.REFUNDED) {
      return <Badge variant="default" className="bg-indigo-600">Refunded</Badge>;
    }
    if (order.status === OrderStatus.PROCESSING || order.status === OrderStatus.PACKED) {
      return <Badge variant="default" className="bg-indigo-600">Processing</Badge>;
    }
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PAYMENT_FAILED) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="warning">Pending Payment</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl border bg-card animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Order History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live tracking, shipment status, returns & invoices</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-4">
          <Package className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold">No orders found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            You have not placed any orders yet. Discover our collection today.
          </p>
          <Link href="/products">
            <Button size="sm" className="rounded-full px-6">Shop Catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const hasReturn = order.returnRequests && order.returnRequests.length > 0;
            const hasRefund = order.refunds && order.refunds.length > 0;

            return (
              <div
                key={order.id}
                className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                  <div>
                    <span className="text-xs font-bold text-primary font-mono">{order.orderNumber}</span>
                    <p className="text-[11px] text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order)}
                    <span className="font-extrabold text-sm">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-2">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground line-clamp-1">
                        {item.quantity}x {item.productTitle} ({item.variantTitle})
                      </span>
                      <span className="text-muted-foreground">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Shipment AWB snippet */}
                {order.shipment?.awbNumber && (
                  <div className="flex items-center gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">
                      Courier: <strong>{order.shipment.courierProvider}</strong> • AWB:{' '}
                      <span className="font-mono font-bold text-foreground">{order.shipment.awbNumber}</span>
                    </span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                  <span className="text-[11px] text-muted-foreground">
                    Payment: <strong className="text-foreground">{order.payment?.provider || (order.shipment?.isCod ? 'COD' : 'ONLINE')}</strong> ({order.payment?.status || 'PAID'})
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceOrder(order)}
                      className="rounded-xl gap-1 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <FileText className="w-3.5 h-3.5" /> Invoice
                    </Button>

                    <Link href={`/orders/${order.id}`}>
                      <Button variant="default" size="sm" className="rounded-xl gap-1 text-xs font-semibold">
                        <Truck className="w-3.5 h-3.5 mr-0.5" /> Track & Manage <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
