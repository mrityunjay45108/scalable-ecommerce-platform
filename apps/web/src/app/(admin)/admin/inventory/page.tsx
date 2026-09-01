'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Minus, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminInventoryPage() {
  const [lowStockVariants, setLowStockVariants] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick adjust modal
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [qtyChange, setQtyChange] = useState(10);
  const [reason, setReason] = useState('Warehouse Restock');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const [lowStockRes, prodRes] = await Promise.all([
        apiClient.get('/inventory/low-stock?threshold=15'),
        apiClient.get('/products/admin/all'),
      ]);
      setLowStockVariants(Array.isArray(lowStockRes) ? lowStockRes : []);
      setAllProducts(prodRes.data || (Array.isArray(prodRes) ? prodRes : []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    setIsAdjusting(true);
    try {
      await apiClient.post('/inventory/adjust', {
        variantId: selectedVariant.id,
        quantityChange: Number(qtyChange),
        reason,
      });
      setSelectedVariant(null);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Stock & Inventory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time warehouse reservations and safety stock alerts</p>
        </div>
        <Button variant="outline" onClick={fetchInventory} className="rounded-2xl gap-2 font-semibold">
          <RefreshCw className="w-4 h-4" /> Refresh Status
        </Button>
      </div>

      {/* Low stock alerts banner */}
      {lowStockVariants.length > 0 && (
        <div className="rounded-3xl bg-amber-500/10 border border-amber-500/20 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Low Stock Warnings ({lowStockVariants.length} SKUs below threshold)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockVariants.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">{v.product?.title}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{v.sku} ({v.title})</p>
                  <p className="text-xs font-black text-amber-600 mt-1">Only {v.stockQuantity} units left</p>
                </div>
                <Button size="sm" onClick={() => setSelectedVariant(v)} className="rounded-xl text-xs font-bold">
                  Restock
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products Variant Inventory Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-sm font-bold">All SKU Quantities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">SKU Code</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Variant Title</th>
                <th className="p-4">Physical Stock</th>
                <th className="p-4">Reserved (TTL)</th>
                <th className="p-4">Available</th>
                <th className="p-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allProducts.flatMap((p) =>
                (p.variants || []).map((v: any) => (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary">{v.sku}</td>
                    <td className="p-4 font-semibold text-foreground">{p.title}</td>
                    <td className="p-4 text-muted-foreground">{v.title}</td>
                    <td className="p-4 font-bold">{v.stockQuantity}</td>
                    <td className="p-4 text-amber-600 font-semibold">{v.reservedStock || 0}</td>
                    <td className="p-4 font-black">
                      {Math.max(0, v.stockQuantity - (v.reservedStock || 0))}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedVariant({ ...v, product: { title: p.title } })}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold">Adjust Variant Stock</h3>
              <p className="text-xs text-muted-foreground">{selectedVariant.product?.title} • {selectedVariant.sku}</p>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-muted/40 flex justify-between items-center">
                <span>Current Stock:</span>
                <strong className="text-sm">{selectedVariant.stockQuantity} units</strong>
              </div>

              <div>
                <label className="font-semibold block mb-1">Quantity Adjustment (+ to add, - to subtract)</label>
                <input
                  required
                  type="number"
                  value={qtyChange}
                  onChange={(e) => setQtyChange(Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm rounded-xl border bg-background font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Adjustment</label>
                <input
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setSelectedVariant(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdjusting}>
                  {isAdjusting ? 'Saving...' : 'Apply Stock Change'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
