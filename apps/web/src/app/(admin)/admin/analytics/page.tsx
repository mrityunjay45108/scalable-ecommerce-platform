'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Award,
  Layers,
  PieChart,
  UserCheck,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [range, setRange] = useState<'TODAY' | '7_DAYS' | '30_DAYS' | '90_DAYS'>('30_DAYS');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get(`/admin/analytics/dashboard?range=${range}`);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  if (isLoading && !metrics) {
    return (
      <div className="space-y-8 animate-pulse">
        <h1 className="text-2xl font-bold">Analytics & Financial Performance</h1>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-card border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">E-Commerce Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time business intelligence, category sales, cohort retention, and fulfillment velocity
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-card rounded-2xl border shadow-sm">
          <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          {[
            { id: 'TODAY', label: 'Today' },
            { id: '7_DAYS', label: '7 Days' },
            { id: '30_DAYS', label: '30 Days' },
            { id: '90_DAYS', label: '90 Days' },
          ].map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={range === item.id ? 'default' : 'ghost'}
              onClick={() => setRange(item.id as any)}
              className="rounded-xl text-xs font-bold h-8 px-3"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Period Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-foreground">{formatPrice(metrics?.totalRevenue || 0)}</h2>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Processed volume
          </p>
        </div>

        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Orders Placed</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground">{metrics?.totalOrders || 0}</h2>
          <p className="text-[11px] text-muted-foreground">{metrics?.pendingOrdersCount || 0} awaiting payment</p>
        </div>

        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Average Order Value</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-foreground">{formatPrice(metrics?.averageOrderValue || 0)}</h2>
          <p className="text-[11px] text-muted-foreground">Across converted checkouts</p>
        </div>

        <div className="p-5 rounded-3xl border bg-card shadow-sm space-y-2">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>New vs Returning</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-muted-foreground block">New</span>
              <span className="text-base font-black text-foreground">{metrics?.newCustomersCount || 0}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <span className="text-xs text-muted-foreground block">Repeat</span>
              <span className="text-base font-black text-foreground">{metrics?.returningCustomersCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Distribution Chart */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm">Sales Velocity & Daily Volume</h3>
        <div className="grid grid-cols-7 gap-3 pt-8 items-end h-56">
          {metrics?.salesByDay?.map((day: any) => {
            const heightPercent = Math.max(15, Math.min(100, (day.revenue / (metrics.totalRevenue || 1)) * 300));
            return (
              <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[48px] rounded-t-2xl bg-primary/80 hover:bg-primary transition-all relative group shadow-sm"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    {formatPrice(day.revenue)} ({day.orders} orders)
                  </div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{day.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Top Categories & Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Category Revenue Attribution
          </h3>

          <div className="space-y-3 text-xs">
            {metrics?.topCategories?.length > 0 ? (
              metrics.topCategories.map((c: any) => (
                <div key={c.name} className="p-3.5 rounded-2xl bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.volume} units sold</p>
                  </div>
                  <span className="font-extrabold text-primary text-sm">{formatPrice(c.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">No category transactions in range.</p>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" /> Order Status Breakdown
          </h3>

          <div className="space-y-2.5 text-xs">
            {metrics?.orderStatusDistribution &&
              Object.entries(metrics.orderStatusDistribution).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between p-3 rounded-2xl border bg-background">
                  <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">{status}</span>
                  <Badge variant="secondary" className="font-extrabold text-xs">
                    {count} orders
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Performing SKUs Leaderboard */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Best Performing Products
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Product Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Units Sold</th>
                <th className="p-4 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {metrics?.topSellingProducts?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No product transactions in selected period.
                  </td>
                </tr>
              ) : (
                metrics?.topSellingProducts?.map((p: any, idx: number) => (
                  <tr key={p.productId} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-black text-muted-foreground">#{idx + 1}</td>
                    <td className="p-4 font-bold text-foreground">{p.title}</td>
                    <td className="p-4 text-muted-foreground">{p.categoryName}</td>
                    <td className="p-4 font-semibold">{p.totalSold} units</td>
                    <td className="p-4 text-right font-extrabold text-primary">{formatPrice(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
