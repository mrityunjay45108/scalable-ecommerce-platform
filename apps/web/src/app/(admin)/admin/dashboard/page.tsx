'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { AdminDashboardMetrics, OrderStatus } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await apiClient.get('/admin/analytics/dashboard');
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="space-y-8 animate-pulse">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-card border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time financial performance and fulfillment operations</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black">{formatPrice(metrics.totalRevenue)}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> AOV: {formatPrice(metrics.averageOrderValue)}
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black">{metrics.totalOrders}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.pendingOrdersCount} pending payment
            </p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Customers</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black">{metrics.totalCustomers}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Verified purchaser accounts</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock SKUs</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black">{metrics.lowStockProductsCount}</h3>
            <Link href="/admin/inventory" className="text-[11px] text-amber-600 hover:underline font-semibold mt-0.5 block">
              Review Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* Sales Velocity Chart */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm">Revenue Trends (Past 7 Days)</h3>
        <div className="grid grid-cols-7 gap-2 pt-6 items-end h-48">
          {metrics.salesByDay.map((day) => {
            const heightPercent = Math.max(15, Math.min(100, (day.revenue / (metrics.totalRevenue || 1)) * 300));
            return (
              <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[40px] rounded-t-xl bg-primary/80 hover:bg-primary transition-all relative group"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    {formatPrice(day.revenue)}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">{day.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">
              View All Orders
            </Link>
          </div>

          <div className="divide-y text-xs">
            {metrics.recentOrders.map((order: any) => (
              <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-foreground">{order.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{order.customerName} ({order.customerEmail})</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold">{formatPrice(order.totalAmount)}</p>
                  <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm">Best Sellers</h3>
          <div className="space-y-3 text-xs">
            {metrics.topSellingProducts.length > 0 ? (
              metrics.topSellingProducts.map((p) => (
                <div key={p.productId} className="flex justify-between items-center p-3 rounded-2xl bg-muted/20">
                  <div className="max-w-[150px]">
                    <p className="font-bold line-clamp-1">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{p.totalSold} sold</p>
                  </div>
                  <span className="font-extrabold text-primary">{formatPrice(p.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">No sales data recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
