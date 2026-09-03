'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Eye,
  Layers,
  Zap,
  Tag,
} from 'lucide-react';
import { BrandDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PRESET_BRANDS = [
  { name: 'ROADSTER', offer: 'UNDER ₹799', imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', query: 'Roadster' },
  { name: 'NIKE', offer: 'MIN. 40% OFF', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', query: 'Nike' },
  { name: 'HIGHLANDER', offer: 'FLAT 60% OFF', imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', query: 'Highlander' },
  { name: "LEVI'S", offer: 'MIN. 50% OFF', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', query: "Levi's" },
  { name: 'PUMA', offer: 'FROM ₹899', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400', query: 'Puma' },
  { name: 'ZARA', offer: 'NEW SEASON', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', query: 'Zara' },
  { name: 'HRX', offer: 'UNDER ₹699', imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', query: 'HRX' },
  { name: 'ADIDAS', offer: 'MIN. 45% OFF', imageUrl: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=400', query: 'Adidas' },
  { name: 'NOVA TECH', offer: 'FLAT 50% OFF', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', query: 'Nova' },
];

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDto | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [offer, setOffer] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/brands/admin');
      setBrands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load brands', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpenCreate = () => {
    setEditingBrand(null);
    setName('');
    setOffer('');
    setImageUrl('');
    setQuery('');
    setOrder(brands.length + 1);
    setIsActive(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (brand: BrandDto) => {
    setEditingBrand(brand);
    setName(brand.name);
    setOffer(brand.offer);
    setImageUrl(brand.imageUrl);
    setQuery(brand.query);
    setOrder(brand.order || 0);
    setIsActive(brand.isActive);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleApplyPreset = (preset: typeof PRESET_BRANDS[0]) => {
    setName(preset.name);
    setOffer(preset.offer);
    setImageUrl(preset.imageUrl);
    setQuery(preset.query);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !offer.trim() || !imageUrl.trim()) {
      setErrorMsg('Please fill in Brand Name, Offer Tag, and Image URL');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        name: name.trim(),
        offer: offer.trim(),
        imageUrl: imageUrl.trim(),
        query: (query.trim() || name.trim()),
        order: Number(order) || 0,
        isActive,
      };

      if (editingBrand) {
        await apiClient.put(`/brands/${editingBrand.id}`, payload);
      } else {
        await apiClient.post('/brands', payload);
      }

      setShowModal(false);
      await fetchBrands();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, brandName: string) => {
    if (!confirm(`Are you sure you want to remove '${brandName}' from Brand Spotlights?`)) return;
    try {
      await apiClient.delete(`/brands/${id}`);
      await fetchBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to delete brand');
    }
  };

  const handleToggleStatus = async (brand: BrandDto) => {
    try {
      await apiClient.put(`/brands/${brand.id}`, {
        isActive: !brand.isActive,
      });
      await fetchBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to update brand status');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Award className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
              Medal Worthy Brand Spotlights
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage homepage &quot;MEDAL WORTHY BRANDS TO BAG&quot; tiles, discount tags, links, and display order
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2"
          >
            <Plus className="w-4 h-4" /> Add Brand Spotlight
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold text-xs gap-1.5">
            <Link href="/" target="_blank">
              <Eye className="w-4 h-4 text-muted-foreground" /> View on Storefront
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Brand Spotlights
          </span>
          <p className="text-2xl font-black text-foreground">{brands.length}</p>
          <p className="text-[10px] text-muted-foreground">Configured in database</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
            Active on Homepage
          </span>
          <p className="text-2xl font-black text-emerald-600">
            {brands.filter((b) => b.isActive).length}
          </p>
          <p className="text-[10px] text-muted-foreground">Currently visible to customers</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
            Default Myntra Grid
          </span>
          <p className="text-2xl font-black text-foreground">8 Tiles</p>
          <p className="text-[10px] text-muted-foreground">Optimized for desktop & mobile</p>
        </div>
      </div>

      {/* 3. Live Brands Grid / Visual Preview */}
      <div className="rounded-3xl border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Live Homepage Spotlight Preview
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any brand tile or action to edit name, offer badge, or image URL
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5">
            {brands.filter((b) => b.isActive).length} Live
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse border" />
            ))}
          </div>
        ) : brands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className={`relative group rounded-2xl border p-3 text-center space-y-2.5 transition-all flex flex-col items-center justify-between ${
                  brand.isActive
                    ? 'bg-card border-border hover:shadow-xl hover:border-primary/50'
                    : 'bg-muted/20 border-dashed border-muted-foreground/30 opacity-60'
                }`}
              >
                {/* Circular Image Frame */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-border/80 group-hover:border-primary transition-colors bg-muted/30 shadow-xs">
                  <Image
                    src={brand.imageUrl}
                    alt={brand.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {!brand.isActive && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      Hidden
                    </div>
                  )}
                </div>

                {/* Brand Name & Offer */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate w-full">
                    {brand.name}
                  </h3>
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {brand.offer}
                  </p>
                </div>

                {/* Quick Action Overlay / Buttons */}
                <div className="flex items-center gap-1.5 pt-1 border-t w-full justify-center">
                  <button
                    onClick={() => handleOpenEdit(brand)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Brand Spotlight"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(brand)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      brand.isActive ? 'hover:bg-amber-50 text-emerald-600 hover:text-amber-600' : 'hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600'
                    }`}
                    title={brand.isActive ? 'Hide from homepage' : 'Show on homepage'}
                  >
                    {brand.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id, brand.name)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                    title="Delete Brand Spotlight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-2xl space-y-3">
            <p className="text-xs text-muted-foreground">No brand spotlights found.</p>
            <Button size="sm" onClick={handleOpenCreate} className="text-xs rounded-xl">
              + Add First Brand Spotlight
            </Button>
          </div>
        )}
      </div>

      {/* 4. Detailed Management Table */}
      <div className="rounded-3xl border bg-card overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-foreground">
              All Brand Spotlight Entries
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure search targets, filter queries, display order, and live status
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {brands.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">Brand Logo</th>
                <th className="py-3.5 px-4">Brand Name</th>
                <th className="py-3.5 px-4">Offer Badge</th>
                <th className="py-3.5 px-4">Search Query / Target</th>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border bg-muted shadow-xs">
                      <Image
                        src={brand.imageUrl}
                        alt={brand.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 font-black uppercase text-foreground">
                    {brand.name}
                  </td>
                  <td className="py-3 px-4 font-black text-rose-600">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-[11px]">
                      {brand.offer}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                    /products?search={encodeURIComponent(brand.query)}
                  </td>
                  <td className="py-3 px-4 font-bold text-muted-foreground">
                    #{brand.order}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        brand.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border'
                      }`}
                    >
                      {brand.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(brand)}
                        className="h-7 text-[11px] font-bold rounded-lg px-2.5"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(brand.id, brand.name)}
                        className="h-7 text-[11px] font-bold rounded-lg px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-foreground">
                  {editingBrand ? 'Edit Brand Spotlight' : 'Create New Brand Spotlight'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure brand card displayed in &quot;MEDAL WORTHY BRANDS TO BAG&quot;
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick 1-Click Brand Presets (For fast testing) */}
            {!editingBrand && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  ⚡ 1-Click Popular Brand Presets
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_BRANDS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-lg bg-card border hover:border-primary text-[10px] font-bold hover:text-primary transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ROADSTER, NIKE"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Offer Tag */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Offer Badge Tag *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UNDER ₹799, MIN. 40% OFF"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Brand Logo / Lifestyle Image URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Search Query / Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Search Query Keyword
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nike or Roadster"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Order Index */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Display Order (#)
                  </label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-foreground">
                  Active (Display immediately on Storefront Homepage)
                </span>
              </label>

              {/* Live Mini Preview */}
              {name && imageUrl && (
                <div className="p-3 rounded-2xl bg-muted/20 border flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border bg-card shrink-0">
                    <Image
                      src={imageUrl}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Storefront Preview:</span>
                    <h4 className="text-xs font-black uppercase text-foreground">{name}</h4>
                    <p className="text-[10px] font-black text-rose-600">{offer || 'SPECIAL OFFER'}</p>
                  </div>
                </div>
              )}

              {/* Footer Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="rounded-xl text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-5"
                >
                  {isSaving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
