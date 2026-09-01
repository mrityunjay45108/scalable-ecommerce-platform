'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderDto, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Truck } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.PROCESSING);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get('/orders/admin/all');
      setOrders(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenStatus = (order: OrderDto) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.trackingNumber || '');
    setShowStatusModal(true);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Order Management</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Track fulfillment, assign tracking codes, and manage lifecycle</p>
      </div>

      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4">Total</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-mono font-bold text-primary">{o.orderNumber}</td>
                  <td className="p-4">
                    <p className="font-semibold">{o.user?.firstName} {o.user?.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">{o.user?.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{formatDate(o.createdAt)}</td>
                  <td className="p-4 font-extrabold">{formatPrice(o.totalAmount)}</td>
                  <td className="p-4">
                    <span className="font-semibold">{o.payment?.provider || 'N/A'}</span>
                    <span className="block text-[10px] text-emerald-600 font-bold">{o.payment?.status}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant="default" className="text-[10px]">{o.status}</Badge>
                  </td>
                  <td className="p-4 text-right space-x-2">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Update Order Status</h3>
              <p className="text-xs text-muted-foreground font-mono">{selectedOrder.orderNumber}</p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Fulfillment Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                >
                  <option value={OrderStatus.PENDING_PAYMENT}>Pending Payment</option>
                  <option value={OrderStatus.PROCESSING}>Processing / In Packaging</option>
                  <option value={OrderStatus.SHIPPED}>Shipped</option>
                  <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                  <option value={OrderStatus.DELIVERED}>Delivered</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                  <option value={OrderStatus.REFUNDED}>Refunded</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tracking Code (Optional)</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. TRK-USPS-981249"
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Save Status'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
