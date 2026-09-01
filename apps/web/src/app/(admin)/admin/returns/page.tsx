'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Truck,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showQcModal, setShowQcModal] = useState(false);
  const [qcResult, setQcResult] = useState('PASSED_RESTOCKABLE');
  const [qcNotes, setQcNotes] = useState('');
  const [restockItems, setRestockItems] = useState(true);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [replacementTracking, setReplacementTracking] = useState('');

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/returns/admin/all');
      setReturns(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Failed to fetch admin returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleApproveReturn = async (id: string) => {
    if (!confirm('Approve return request and generate reverse pickup AWB?')) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/returns/admin/${id}/approve`, {});
      await fetchReturns();
      alert('Return approved and reverse pickup scheduled');
    } catch (err: any) {
      alert(err.message || 'Failed to approve return');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn || !rejectionReason.trim()) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/returns/admin/${selectedReturn.id}/reject`, {
        rejectionReason,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      await fetchReturns();
    } catch (err: any) {
      alert(err.message || 'Failed to reject return');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkReceived = async (id: string) => {
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/returns/admin/${id}/receive`, {});
      await fetchReturns();
      alert('Package marked as received at hub');
    } catch (err: any) {
      alert(err.message || 'Failed to mark return received');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePerformQc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/returns/admin/${selectedReturn.id}/quality-check`, {
        qcResult,
        qcNotes,
        restockItems,
      });
      setShowQcModal(false);
      setQcNotes('');
      await fetchReturns();
      alert('Quality check recorded and inventory updated if applicable');
    } catch (err: any) {
      alert(err.message || 'Failed to record QC');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleProcessReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/returns/admin/${selectedReturn.id}/replacement`, {
        trackingNumber: replacementTracking,
      });
      setShowReplacementModal(false);
      setReplacementTracking('');
      await fetchReturns();
      alert('Replacement outbound dispatch completed');
    } catch (err: any) {
      alert(err.message || 'Failed to process replacement');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetryPickup = async (id: string) => {
    setIsActionLoading(true);
    try {
      await apiClient.post(`/returns/${id}/retry-pickup`, {});
      await fetchReturns();
      alert('Reverse courier pickup rescheduled');
    } catch (err: any) {
      alert(err.message || 'Failed to retry pickup');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      search === '' ||
      r.returnNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.pickupAwb?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Returns & Replacements QC</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer return requests, reverse logistics AWBs, hub intake, and quality inspection
          </p>
        </div>
        <Button onClick={fetchReturns} variant="outline" size="sm" className="rounded-xl flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Return #, Order #, Reverse AWB, Customer..."
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
          <option value="ALL">All Return Statuses</option>
          <option value="REQUESTED">REQUESTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PICKUP_SCHEDULED">PICKUP_SCHEDULED</option>
          <option value="PICKED_UP">PICKED_UP</option>
          <option value="RECEIVED">RECEIVED</option>
          <option value="REFUND_PENDING">REFUND_PENDING</option>
          <option value="REPLACEMENT_PENDING">REPLACEMENT_PENDING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Return #</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Action</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reverse AWB</th>
                <th className="p-4">QC Result</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading returns...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No returns found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-rose-600">{r.returnNumber}</td>
                    <td className="p-4 font-mono font-semibold">{r.order?.orderNumber}</td>
                    <td className="p-4">
                      <p className="font-semibold">
                        {r.user?.firstName} {r.user?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.user?.email}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${
                          r.action === 'REPLACEMENT'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-muted-foreground">{r.reason}</td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          r.status === 'COMPLETED' || r.status === 'REFUNDED'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                            : r.status === 'REJECTED'
                            ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                            : 'border-amber-500 text-amber-600 bg-amber-500/10'
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-primary">{r.pickupAwb || 'Unassigned'}</td>
                    <td className="p-4">
                      <span className="text-[11px] font-semibold">{r.qcResult || 'PENDING'}</span>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* Action buttons based on state */}
                      {(r.status === 'REQUESTED' || r.status === 'UNDER_REVIEW') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveReturn(r.id)}
                            disabled={isActionLoading}
                            className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReturn(r);
                              setShowRejectModal(true);
                            }}
                            className="rounded-xl text-xs text-rose-600"
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {(r.status === 'APPROVED' || r.status === 'PICKUP_SCHEDULED' || r.status === 'PICKED_UP') && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMarkReceived(r.id)}
                            disabled={isActionLoading}
                            className="rounded-xl text-xs"
                          >
                            Mark Received
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetryPickup(r.id)}
                            className="rounded-xl text-xs text-blue-600"
                          >
                            Retry Pickup
                          </Button>
                        </>
                      )}

                      {r.status === 'RECEIVED' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(r);
                            setShowQcModal(true);
                          }}
                          className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700"
                        >
                          Perform QC
                        </Button>
                      )}

                      {r.status === 'REPLACEMENT_PENDING' && r.action === 'REPLACEMENT' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(r);
                            setShowReplacementModal(true);
                          }}
                          className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          Dispatch Replacement
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

      {/* Reject Modal */}
      {showRejectModal && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Reject Return Request</h3>
              <p className="text-xs text-muted-foreground font-mono">{selectedReturn.returnNumber}</p>
            </div>
            <form onSubmit={handleRejectReturn} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Mandatory Rejection Justification</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Returned outside 14-day policy window or tampered seal..."
                  className="w-full p-3 rounded-xl border bg-background text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading} className="bg-rose-600 hover:bg-rose-700">
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC Modal */}
      {showQcModal && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Perform Quality Check</h3>
              <p className="text-xs text-muted-foreground font-mono">{selectedReturn.returnNumber}</p>
            </div>
            <form onSubmit={handlePerformQc} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">QC Evaluation Result</label>
                <select
                  value={qcResult}
                  onChange={(e) => setQcResult(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                >
                  <option value="PASSED_RESTOCKABLE">Passed - Restockable into Inventory</option>
                  <option value="PASSED_DAMAGED_NO_RESTOCK">Passed - Damaged (Do Not Restock)</option>
                  <option value="FAILED_FRAUD_OR_MISMATCH">Failed - Fraud / Item Mismatch</option>
                </select>
              </div>

              {qcResult === 'PASSED_RESTOCKABLE' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="restockCheck"
                    checked={restockItems}
                    onChange={(e) => setRestockItems(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="restockCheck" className="font-semibold">
                    Auto-increment product stock quantity in database
                  </label>
                </div>
              )}

              <div>
                <label className="font-semibold block mb-1">Inspector Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="e.g. Tags intact, product unused in original packaging"
                  className="w-full p-3 rounded-xl border bg-background text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowQcModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading}>
                  Submit QC Result
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replacement Dispatch Modal */}
      {showReplacementModal && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Dispatch Replacement Order</h3>
              <p className="text-xs text-muted-foreground font-mono">{selectedReturn.returnNumber}</p>
            </div>
            <form onSubmit={handleProcessReplacement} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Outbound Replacement AWB / Tracking</label>
                <input
                  value={replacementTracking}
                  onChange={(e) => setReplacementTracking(e.target.value)}
                  placeholder="e.g. EXP-REP-948194-IN"
                  className="w-full h-10 px-3 rounded-xl border bg-background font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowReplacementModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading} className="bg-blue-600 hover:bg-blue-700">
                  Confirm Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
