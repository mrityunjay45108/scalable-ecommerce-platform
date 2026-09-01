'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  CheckCheck,
  X,
} from 'lucide-react';

export default function AdminCodPage() {
  const [codList, setCodList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    collectedAmount: 0,
    collectedCount: 0,
    settledAmount: 0,
    settledCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [collectedBy, setCollectedBy] = useState('');
  const [courierReference, setCourierReference] = useState('');

  const fetchCodTransactions = async () => {
    setIsLoading(true);
    try {
      const data: any = await apiClient.get('/payments/admin/cod/all');
      setCodList(data.data || (Array.isArray(data) ? data : []));
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch COD transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodTransactions();
  }, []);

  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/payments/admin/cod/${selectedTx.orderId}/collect`, {
        collectedBy,
        courierReference,
      });
      setShowConfirmModal(false);
      setCollectedBy('');
      setCourierReference('');
      await fetchCodTransactions();
      alert('Cash collection recorded successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to confirm cash collection');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSettle = async (orderId: string) => {
    if (!confirm('Reconcile and settle this COD transaction into bank account?')) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/payments/admin/cod/${orderId}/settle`, {
        notes: 'Reconciled via Admin Console',
      });
      await fetchCodTransactions();
      alert('COD transaction marked as SETTLED');
    } catch (err: any) {
      alert(err.message || 'Failed to settle COD transaction');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredList = codList.filter((tx) => {
    const matchesSearch =
      search === '' ||
      tx.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      tx.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      tx.courierReference?.toLowerCase().includes(search.toLowerCase()) ||
      tx.collectedBy?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Cash on Delivery (COD) Reconciliation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit courier driver cash collections, receipt generation, and bank deposits
          </p>
        </div>
        <Button onClick={fetchCodTransactions} variant="outline" size="sm" className="rounded-xl flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Collected in Hand</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{formatPrice(summary.collectedAmount)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.collectedCount} orders collected</p>
        </div>

        <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled & Deposited</span>
            <CheckCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600">{formatPrice(summary.settledAmount)}</p>
          <p className="text-[11px] text-muted-foreground">{summary.settledCount} reconciled settlements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Receipt #, Order #, Courier Run Sheet, Driver..."
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
          <option value="ALL">All COD Statuses</option>
          <option value="COD_PENDING">COD_PENDING</option>
          <option value="COD_COLLECTED">COD_COLLECTED</option>
          <option value="COD_SETTLED">COD_SETTLED</option>
          <option value="COD_FAILED">COD_FAILED</option>
        </select>
      </div>

      {/* COD Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Receipt #</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Collected By</th>
                <th className="p-4">Courier Ref / Run Sheet</th>
                <th className="p-4">Status</th>
                <th className="p-4">Collected Date</th>
                <th className="p-4">Settled Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading COD transactions...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No COD transactions found.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary">{tx.receiptNumber || 'Pending Receipt'}</td>
                    <td className="p-4 font-mono font-semibold">{tx.order?.orderNumber}</td>
                    <td className="p-4 font-black">{formatPrice(tx.amount)}</td>
                    <td className="p-4 font-semibold text-muted-foreground">{tx.collectedBy || 'Awaiting Delivery'}</td>
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">
                      {tx.courierReference || 'N/A'}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          tx.status === 'COD_SETTLED'
                            ? 'border-indigo-500 text-indigo-600 bg-indigo-500/10'
                            : tx.status === 'COD_COLLECTED'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                            : 'border-amber-500 text-amber-600 bg-amber-500/10'
                        }`}
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{tx.collectedAt ? formatDate(tx.collectedAt) : '-'}</td>
                    <td className="p-4 text-muted-foreground">{tx.settledAt ? formatDate(tx.settledAt) : '-'}</td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {tx.status === 'COD_PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTx(tx);
                            setShowConfirmModal(true);
                          }}
                          className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          Confirm Cash
                        </Button>
                      )}
                      {tx.status === 'COD_COLLECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSettle(tx.orderId)}
                          disabled={isActionLoading}
                          className="rounded-xl text-xs text-indigo-600 border-indigo-200"
                        >
                          Settle Payout
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

      {/* Confirm Collection Modal */}
      {showConfirmModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Confirm Cash Collection</h3>
              <p className="text-xs text-muted-foreground font-mono">Order: {selectedTx.order?.orderNumber}</p>
            </div>
            <form onSubmit={handleConfirmCollection} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Courier Executive / Driver Name</label>
                <input
                  required
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (Express Driver)"
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Run Sheet / Waybill Reference</label>
                <input
                  required
                  value={courierReference}
                  onChange={(e) => setCourierReference(e.target.value)}
                  placeholder="e.g. RS-DEL-98124"
                  className="w-full h-10 px-3 rounded-xl border bg-background font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  Confirm & Generate Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
