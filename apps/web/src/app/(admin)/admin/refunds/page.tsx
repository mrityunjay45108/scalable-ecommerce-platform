'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    completedAmount: 0,
    completedCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/refunds/admin/all');
      setRefunds(data.data || (Array.isArray(data) ? data : []));
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch refunds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleProcessRefund = async (id: string) => {
    if (!confirm('Execute refund payout via payment gateway/bank?')) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/refunds/admin/${id}/process`, {});
      await fetchRefunds();
      alert('Refund processed successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const matchesSearch =
      search === '' ||
      r.refundNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.gatewayRefundId?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Refunds & Gateway Payouts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor automated payment gateway reversals, COD bank payouts, and audit transactions
          </p>
        </div>
        <Button onClick={fetchRefunds} variant="outline" size="sm" className="rounded-xl flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{formatPrice(summary.completedAmount)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.completedCount} processed refunds</p>
        </div>

        <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{formatPrice(summary.pendingAmount)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.pendingCount} pending requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Refund #, Order #, Gateway Reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-2xl border bg-card text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 rounded-2xl border bg-card text-xs font-semibold"
        >
          <option value="ALL">All Refund Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {/* Refunds Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Refund #</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Gateway Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading refunds...
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No refunds found.
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{r.refundNumber}</td>
                    <td className="p-4 font-mono font-semibold">{r.order?.orderNumber}</td>
                    <td className="p-4">
                      <p className="font-semibold">
                        {r.order?.user?.firstName} {r.order?.user?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.order?.user?.email}</p>
                    </td>
                    <td className="p-4 font-black">{formatPrice(r.amount)}</td>
                    <td className="p-4 text-muted-foreground">{r.reason}</td>
                    <td className="p-4 font-mono text-[11px] text-primary">{r.gatewayRefundId || 'Pending'}</td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          r.status === 'COMPLETED'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                            : r.status === 'FAILED'
                            ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                            : 'border-amber-500 text-amber-600 bg-amber-500/10'
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="p-4 text-right">
                      {r.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcessRefund(r.id)}
                          disabled={isActionLoading}
                          className="rounded-xl text-xs"
                        >
                          Retry Payout
                        </Button>
                      )}
                    </td>
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
