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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🙏</span>
            <h1 className="text-3xl font-extrabold tracking-tight">Order History | आपके ऑर्डर्स</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            🇮🇳 SWADESH Luxe • 29,000+ Pin Codes Serviced | Live Tracking, GST Invoices & 7-Day Sahaj Wapsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/917324882119?text=${encodeURIComponent('Namaste SWADESH Luxe! I need assistance with my recent orders.')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="rounded-2xl gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 24×7 Concierge Care
            </Button>
          </a>
        </div>
      </div>

      {/* Trust Assurance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 border text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">🇮🇳</span>
          <div>
            <p className="font-bold text-[11px]">100% Shuddh Swadeshi</p>
            <p className="text-[10px] text-muted-foreground">Certified Indian Creators</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">👑</span>
          <div>
            <p className="font-bold text-[11px]">॥ अतिथिदेवो भवः ॥</p>
            <p className="text-[10px] text-muted-foreground">Honored Guest Care</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">🔄</span>
          <div>
            <p className="font-bold text-[11px]">7-Day Sahaj Wapsi</p>
            <p className="text-[10px] text-muted-foreground">Free Doorstep Pickup</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <div>
            <p className="font-bold text-[11px]">Express Shipping</p>
            <p className="text-[10px] text-muted-foreground">Pan-India Network</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-4">
          <Package className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold">No orders placed yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Discover authentic Indian handlooms, festive couture, and Make in India innovations.
          </p>
          <Link href="/products">
            <Button size="sm" className="rounded-full px-6 bg-primary font-bold">Explore Catalog (उत्पाद देखें)</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const hasReturn = order.returnRequests && order.returnRequests.length > 0;
            const hasRefund = order.refunds && order.refunds.length > 0;
            const isCod = order.payment?.provider === 'COD' || order.shipment?.isCod;
            const encodedOrderMsg = encodeURIComponent(`Namaste SWADESH Luxe! I need assistance with Order #${order.orderNumber} (Amount: ₹${order.totalAmount}).`);

            return (
              <div
                key={order.id}
                className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Desi Flag Ribbon */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 opacity-60" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary font-mono">{order.orderNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        🇮🇳 स्वदेशी ऑर्डर
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Placed on {formatDate(order.createdAt)}</p>
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
                  <div className="flex items-center justify-between gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        कूरियर: <strong>{order.shipment.courierProvider}</strong> • AWB:{' '}
                        <span className="font-mono font-bold text-foreground">{order.shipment.awbNumber}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      लाइव ट्रैकिंग सक्रिय
                    </span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      भुगतान प्रकार:{' '}
                      <strong className="text-foreground">
                        {isCod ? 'Cash on Delivery (घर पर नकद)' : (order.payment?.provider || 'ONLINE UPI / CARDS')}
                      </strong>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/917324882119?text=${encodedOrderMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10"
                      >
                        व्हाट्सएप सहायता
                      </Button>
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceOrder(order)}
                      className="rounded-xl gap-1 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/10"
                    >
                      <FileText className="w-3.5 h-3.5" /> GST Invoice
                    </Button>

                    <Link href={`/orders/${order.id}`}>
                      <Button variant="default" size="sm" className="rounded-xl gap-1 text-xs font-semibold shadow-xs">
                        <Truck className="w-3.5 h-3.5 mr-0.5" /> Track & Details <ArrowRight className="w-3.5 h-3.5" />
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
