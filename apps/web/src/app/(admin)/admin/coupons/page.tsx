'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, Edit2, Users, Power, PowerOff, CheckCircle2, X } from 'lucide-react';
import { DiscountType } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2027-12-31');
  const [isSaving, setIsSaving] = useState(false);

  // View Usages Modal
  const [selectedCouponUsages, setSelectedCouponUsages] = useState<any[] | null>(null);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');

  const fetchCoupons = async () => {
    try {
      const data = await apiClient.get('/coupons/admin/all');
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCouponId(null);
    setCode('');
    setDiscountType(DiscountType.PERCENTAGE);
    setDiscountValue('');
    setMinOrderValue('');
    setMaxDiscount('');
    setUsageLimit('');
    setPerUserLimit('1');
    setStartDate(new Date().toISOString().split('T')[0]);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingCouponId(c.id);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(String(c.discountValue));
    setMinOrderValue(c.minOrderValue ? String(c.minOrderValue) : '');
    setMaxDiscount(c.maxDiscount ? String(c.maxDiscount) : '');
    setUsageLimit(c.usageLimit ? String(c.usageLimit) : '');
    setPerUserLimit(c.perUserLimit ? String(c.perUserLimit) : '1');
    setStartDate(new Date(c.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(c.endDate).toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };

      if (editingCouponId) {
        await apiClient.put(`/coupons/admin/${editingCouponId}`, payload);
      } else {
        await apiClient.post('/coupons/admin', payload);
      }
      setShowModal(false);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to save coupon');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await apiClient.patch(`/coupons/admin/${id}/toggle`);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await apiClient.delete(`/coupons/admin/${id}`);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const viewUsages = async (coupon: any) => {
    setSelectedCouponCode(coupon.code);
    try {
      const usages = await apiClient.get(`/coupons/admin/${coupon.id}/usages`);
      setSelectedCouponUsages(usages);
    } catch (err: any) {
      alert(err.message || 'Failed to load coupon redemptions');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Coupons & Promotions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create discount promo codes, usage limits, and per-user validation rules
          </p>
        </div>
        <Button onClick={openCreateModal} className="rounded-2xl gap-2 font-bold shadow-md">
          <Plus className="w-4 h-4" /> Create Promo Code
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className={`p-5 rounded-3xl border bg-card shadow-sm space-y-3 relative flex flex-col justify-between transition-all ${
              !c.isActive ? 'opacity-60 bg-muted/20' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-base text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                  {c.code}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(c.id)}
                    title={c.isActive ? 'Disable Coupon' : 'Enable Coupon'}
                    className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                  >
                    {c.isActive ? <Power className="w-4 h-4 text-emerald-600" /> : <PowerOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(c)}
                    title="Edit Coupon"
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    title="Delete Coupon"
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs font-bold text-foreground mt-3">
                {c.discountType === DiscountType.PERCENTAGE
                  ? `${c.discountValue}% OFF`
                  : c.discountType === DiscountType.FREE_SHIPPING
                  ? 'FREE SHIPPING'
                  : `${formatPrice(c.discountValue)} FLAT OFF`}
              </p>

              <div className="text-[11px] text-muted-foreground space-y-0.5 mt-2">
                <p>Min Spend: {c.minOrderValue ? formatPrice(c.minOrderValue) : 'None'}</p>
                <p>Max Discount: {c.maxDiscount ? formatPrice(c.maxDiscount) : 'No Limit'}</p>
                <p>Total Usage: {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : 'redemptions'}</p>
                <p>Per-User Limit: {c.perUserLimit || 1} use</p>
                <p>Validity: {formatDate(c.startDate)} - {formatDate(c.endDate)}</p>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center text-xs">
              <Badge variant={c.isActive ? 'success' : 'secondary'} className="text-[10px]">
                {c.isActive ? 'Active' : 'Disabled'}
              </Badge>
              <button
                onClick={() => viewUsages(c)}
                className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <Users className="w-3 h-3" /> {c._count?.usages || 0} Uses
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">{editingCouponId ? 'Edit Coupon' : 'Create Promo Code'}</h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Coupon Code (Uppercase)</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER50"
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full h-9 px-2 rounded-xl border bg-background"
                  >
                    <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                    <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount ($)</option>
                    <option value={DiscountType.FREE_SHIPPING}>Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Discount Value</label>
                  <input
                    required
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Min Order Value ($)</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Max Cap ($)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl border bg-background"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingCouponId ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemptions / Usages Modal */}
      {selectedCouponUsages && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Redemptions for {selectedCouponCode}</h3>
              <button onClick={() => setSelectedCouponUsages(null)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedCouponUsages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No users have redeemed this code yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedCouponUsages.map((u) => (
                  <div key={u.id} className="p-3 rounded-2xl border bg-muted/20 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{u.user?.firstName} {u.user?.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">{u.user?.email}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(u.usedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
