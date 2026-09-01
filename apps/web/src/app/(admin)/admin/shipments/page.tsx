'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  FileText,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  MapPin,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [trackingModalShipment, setTrackingModalShipment] = useState<any | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchShipments = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/shipments/admin/all');
      setShipments(data.data || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleOpenTracking = async (shipment: any) => {
    setSelectedShipment(shipment);
    setTrackingModalShipment(shipment);
    try {
      const data = await apiClient.get(`/shipments/${shipment.id}/tracking`);
      setTrackingData(data);
    } catch (err) {
      console.error('Failed to fetch tracking data:', err);
      setTrackingData(null);
    }
  };

  const handleDownloadLabel = async (shipmentId: string) => {
    try {
      const data = await apiClient.post(`/shipments/${shipmentId}/label`, {});
      if (data.labelUrl) {
        window.open(data.labelUrl, '_blank');
      } else {
        alert('Label URL generated successfully');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate shipping label');
    }
  };

  const handleCancelShipment = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to cancel this courier shipment?')) return;
    setIsActionLoading(true);
    try {
      await apiClient.post(`/shipments/${shipmentId}/cancel`, { reason: 'Admin cancellation' });
      await fetchShipments();
      alert('Shipment cancelled successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel shipment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.awbNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.courierProvider?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Shipments & Reverse Logistics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Courier provider manifests, AWB management, live checkpoint tracking, and label generation
          </p>
        </div>
        <Button onClick={fetchShipments} variant="outline" size="sm" className="rounded-xl flex items-center gap-2">
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
            placeholder="Search AWB Number, Order Number, Courier..."
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
          <option value="ALL">All Shipment Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="MANIFESTED">MANIFESTED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Shipments Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">AWB Number</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Courier</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4">Weight</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading shipments...
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No shipments found.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary">{s.awbNumber || 'Unassigned'}</td>
                    <td className="p-4 font-mono font-semibold">{s.order?.orderNumber}</td>
                    <td className="p-4 font-bold uppercase">{s.courierProvider}</td>
                    <td className="p-4">
                      <span className="font-semibold">{s.isCod ? 'COD' : 'PREPAID'}</span>
                      {s.isCod && s.codAmount && (
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {formatPrice(s.codAmount)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          s.status === 'DELIVERED'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                            : s.status === 'CANCELLED'
                            ? 'border-rose-500 text-rose-600 bg-rose-500/10'
                            : 'border-blue-500 text-blue-600 bg-blue-500/10'
                        }`}
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{s.weight ? `${s.weight} kg` : 'N/A'}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(s.createdAt)}</td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenTracking(s)}
                        className="rounded-xl text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Track
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadLabel(s.id)}
                        className="rounded-xl text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Label
                      </Button>
                      {s.status !== 'CANCELLED' && s.status !== 'DELIVERED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelShipment(s.id)}
                          className="rounded-xl text-xs text-rose-500 hover:bg-rose-500/10"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Cancel
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

      {/* Live Tracking Modal */}
      {trackingModalShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base">Courier Live Tracking</h3>
                <p className="text-xs text-muted-foreground font-mono">AWB: {trackingModalShipment.awbNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTrackingModalShipment(null)}
                className="rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs bg-muted/40 p-3 rounded-2xl">
                <div>
                  <p className="font-semibold text-muted-foreground">Carrier</p>
                  <p className="font-bold">{trackingModalShipment.courierProvider}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Current Status</p>
                  <Badge variant="default" className="text-[10px] font-bold">
                    {trackingModalShipment.status}
                  </Badge>
                </div>
              </div>

              {/* Checkpoint Events */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {trackingData?.events && trackingData.events.length > 0 ? (
                  trackingData.events.map((evt: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
                      <p className="font-bold text-xs">{evt.activity}</p>
                      {evt.location && <p className="text-[11px] text-muted-foreground">{evt.location}</p>}
                      <p className="text-[10px] text-muted-foreground font-mono">{formatDate(evt.timestamp)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Shipment created. Awaiting first courier hub in-scan checkpoint.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setTrackingModalShipment(null)} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
