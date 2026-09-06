'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Edit2,
  ArrowRight,
  UploadCloud,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Star,
  ExternalLink,
  Flame,
  Zap,
  Share2,
  Check,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import { ProductDto, CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { parseProductSpecs, formatDescriptionWithSpecs } from '@/lib/product-specs';
import { getRegionalHeritage, RegionalHeritageItem } from '@/lib/regional-heritage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [heritageList, setHeritageList] = useState<RegionalHeritageItem[]>([]);
  const [heritageRegion, setHeritageRegion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [togglingHeroId, setTogglingHeroId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Create / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [warranty, setWarranty] = useState('');
  const [washCare, setWashCare] = useState('');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [sku, setSku] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get('/products/admin/all'),
        apiClient.get('/categories/flat'),
      ]);
      setProducts(prodRes.data || (Array.isArray(prodRes) ? prodRes : []));
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    setHeritageList(getRegionalHeritage());
  }, []);

  const handleToggleFeatured = async (p: ProductDto) => {
    setTogglingHeroId(p.id);
    const nextFeatured = !p.isFeatured;
    try {
      // Optimistic update
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isFeatured: nextFeatured } : item)),
      );

      await apiClient.put(`/products/${p.id}`, {
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        basePrice: p.basePrice,
        comparePrice: p.comparePrice,
        isPublished: p.isPublished,
        isFeatured: nextFeatured,
      });
    } catch (err: any) {
      // Revert if error
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isFeatured: p.isFeatured } : item)),
      );
      alert('Failed to update Hero Showcase status: ' + (err.message || 'Error'));
    } finally {
      setTogglingHeroId(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setBasePrice('');
    setComparePrice('');
    setIsPublished(true);
    setIsFeatured(false);
    setImageUrl('');
    setBrand('');
    setMaterial('');
    setCountryOfOrigin('');
    setWarranty('');
    setWashCare('');
    setHeritageRegion('');
    setStockQuantity('50');
    setSku('');
    setShowModal(true);
  };

  const handleOpenEdit = (p: ProductDto) => {
    setEditingProduct(p);
    setTitle(p.title);
    const specs = parseProductSpecs(p.description, p.category?.name);
    setDescription(specs.cleanDescription || p.description);
    setBrand(specs.brand || '');
    setMaterial(specs.material || '');
    setCountryOfOrigin(specs.origin || '');
    setWarranty(specs.warranty || '');
    setWashCare(specs.care || '');
    setHeritageRegion(specs.region || '');
    setCategoryId(p.categoryId);
    setBasePrice(String(p.basePrice));
    setComparePrice(p.comparePrice ? String(p.comparePrice) : '');
    setIsPublished(p.isPublished);
    setIsFeatured(p.isFeatured);
    setImageUrl(p.images?.[0]?.url || '');
    setStockQuantity(String(p.variants?.[0]?.stockQuantity ?? 50));
    setSku(p.variants?.[0]?.sku || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fullDescription = formatDescriptionWithSpecs(description, {
        region: heritageRegion.trim() || undefined,
        brand,
        material,
        origin: countryOfOrigin,
        warranty,
        care: washCare,
      });

      const existingImgs = editingProduct?.images || [];
      const finalImages = imageUrl
        ? existingImgs.length > 0 && imageUrl === existingImgs[0]?.url
          ? existingImgs
          : [
              {
                url: imageUrl,
                publicId: `novastore/manual-${Date.now()}`,
                isPrimary: true,
                sortOrder: 0,
              },
              ...existingImgs.slice(1),
            ]
        : existingImgs;

      const numStock = parseInt(stockQuantity, 10) || 50;
      const finalVariants =
        editingProduct?.variants && editingProduct.variants.length > 0
          ? editingProduct.variants.map((v, i) =>
              i === 0 ? { ...v, stockQuantity: numStock, sku: sku || v.sku } : v,
            )
          : [
              {
                sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
                title: 'Standard',
                price: parseFloat(basePrice),
                stockQuantity: numStock,
                attributes: { size: 'Standard', color: 'Default' },
              },
            ];

      const payload: any = {
        title,
        description: fullDescription,
        categoryId,
        basePrice: parseFloat(basePrice),
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        isPublished,
        isFeatured,
        images: finalImages,
        variants: finalVariants,
      };

      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }

      setShowModal(false);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiClient.delete(`/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (selectedRegion !== 'all') {
      const specs = parseProductSpecs(p.description || '');
      const reg = (specs.region || '').toLowerCase();
      const target = selectedRegion.toLowerCase();
      if (!reg.includes(target) && !(p.description || '').toLowerCase().includes(target)) {
        return false;
      }
    }
    return true;
  });

  const heroFeaturedProducts = products.filter((p) => p.isFeatured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Product Catalog & Deals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, edit, organize inventory, and manage Homepage Hero Showcase drops
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-2xl gap-1.5 font-semibold text-xs h-9">
            <Link href="/" target="_blank">
              <ExternalLink className="w-3.5 h-3.5" /> View Live Store
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-2xl gap-1.5 font-bold text-xs h-9 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Add
          </Button>
          <Button asChild size="sm" className="rounded-2xl gap-1.5 font-bold shadow-md text-xs h-9 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
            <Link href="/admin/products/create">
              <Sparkles className="w-3.5 h-3.5" /> Full Studio Add
            </Link>
          </Button>
        </div>
      </div>

      {/* ⚡ HERO SHOWCASE CONTROL CENTER */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-card to-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Homepage Hero Showcase Drops
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {heroFeaturedProducts.length} Active in Hero Slot
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Whatever products you feature here will instantly display in the interactive Hero Drop Showcase on the customer homepage!
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 <span className="font-semibold text-foreground">Tip:</span> Click the <span className="text-amber-500 font-bold">★ Feature</span> button in the table below to add/remove any item.
          </div>
        </div>

        {/* Active Hero Cards Previews */}
        {heroFeaturedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
            {heroFeaturedProducts.map((hp, idx) => {
              const img = hp.images?.[0]?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
              return (
                <div
                  key={hp.id}
                  className="rounded-2xl border border-indigo-500/30 bg-card p-3 flex items-center gap-3 relative group hover:shadow-md transition-all"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
                    <Image src={img} alt={hp.title} fill className="object-cover" />
                    <span className="absolute top-0.5 left-0.5 bg-indigo-600 text-[9px] font-bold text-white px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{hp.title}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-extrabold text-emerald-600">{formatPrice(hp.basePrice)}</span>
                      {hp.comparePrice && (
                        <span className="text-muted-foreground line-through text-[10px]">
                          {formatPrice(hp.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFeatured(hp)}
                    title="Remove from Hero Showcase"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-muted/40 border border-dashed border-border text-center">
            <p className="text-xs text-muted-foreground">
              No products currently selected for the Hero Showcase. Storefront will display the default curated drops. Select products below to customize!
            </p>
          </div>
        )}
      </div>

      {/* Search & Region Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search products by title or craft..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border bg-card focus:ring-1 focus:ring-primary"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="h-9 px-3 rounded-xl border bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="all">🏛️ All Indian Regions</option>
            {heritageList.map((h) => (
              <option key={h.id} value={h.region}>
                {h.region}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-semibold text-right">
          Showing <strong className="text-foreground">{filteredProducts.length}</strong> of {products.length} products
        </div>
      </div>

      {/* Mobile Product Cards (Optimized for Mobile Phones < sm) */}
      <div className="sm:hidden space-y-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => {
            const img = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
            const isToggling = togglingHeroId === p.id;

            return (
              <div key={p.id} className="p-4 rounded-2xl border bg-card shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/40 shrink-0 border border-border">
                    <Image src={img} alt={p.title} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                          {p.category?.name || 'Unassigned'}
                        </span>
                        {(() => {
                          const r = parseProductSpecs(p.description || '').region;
                          return r ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                              🏛️ {r.split(' ')[0]}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {p.isPublished ? (
                        <Badge variant="success" className="text-[9px] px-1.5 py-0">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Draft</Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">{p.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">{formatPrice(p.basePrice)}</span>
                      {p.comparePrice && (
                        <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.comparePrice)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/80 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(p)}
                    disabled={isToggling}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                      p.isFeatured
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-muted/60 text-muted-foreground border'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${p.isFeatured ? 'fill-current text-amber-300' : ''}`} />
                    <span>{isToggling ? '...' : p.isFeatured ? 'Hero Drop' : 'Add Hero'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="p-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 shadow-2xs"
                      title="Full Edit Studio (All Photos, Variants & Stock)"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit Studio</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 px-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground font-bold text-xs flex items-center gap-1 border"
                      title="Quick Edit"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Quick</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-card rounded-2xl border text-muted-foreground text-xs">
            No products match your search.
          </div>
        )}
      </div>

      {/* Desktop/Tablet Table (Hidden on small phones < sm) */}
      <div className="hidden sm:block rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Base Price</th>
                <th className="p-4">Hero Drop Showcase</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((p) => {
                const img = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
                const isToggling = togglingHeroId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted/40 flex-shrink-0">
                          <Image src={img} alt={p.title} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground line-clamp-1">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-xs text-foreground">{p.category?.name || 'Unassigned'}</div>
                      {(() => {
                        const r = parseProductSpecs(p.description || '').region;
                        return r ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            🏛️ {r.split(' ')[0]}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="p-4 font-extrabold">{formatPrice(p.basePrice)}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(p)}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          p.isFeatured
                            ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${p.isFeatured ? 'fill-current text-amber-300' : ''}`} />
                        {isToggling ? 'Updating...' : p.isFeatured ? '⭐ In Hero Slot' : '☆ Add to Hero'}
                      </button>
                    </td>
                    <td className="p-4">
                      {p.isPublished ? (
                        <Badge variant="success" className="text-[10px]">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click Copy Link */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (typeof navigator !== 'undefined') {
                              const url = `${window.location.origin}/products/${p.slug}`;
                              await navigator.clipboard.writeText(url);
                              setCopiedSlug(p.slug);
                              setTimeout(() => setCopiedSlug(null), 2000);
                            }
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            copiedSlug === p.slug
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'hover:bg-muted text-muted-foreground hover:text-primary'
                          }`}
                          title={copiedSlug === p.slug ? 'Link Copied!' : 'Copy Storefront Link'}
                        >
                          {copiedSlug === p.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Open in Storefront */}
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="View on Storefront"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* Primary Full Edit Studio */}
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-500/30 transition-all shadow-2xs"
                          title="Full Edit Studio (Variants, Multi-Photos, Stock & All Specs)"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit Studio</span>
                        </Link>

                        {/* Quick In-Page Tweak */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border"
                          title="Quick Edit (Fast In-Page Price & Title Tweak)"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-lg font-black text-foreground">
                {editingProduct ? 'Quick Edit Product' : 'Add New Product'}
              </h3>
              {editingProduct && (
                <Link
                  href={`/admin/products/${editingProduct.id}/edit`}
                  className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1 border border-amber-500/30"
                >
                  <span>Open Full Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {editingProduct && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div>
                  <p className="font-extrabold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Want to edit Multi-Photos, Sizes, Colors & Inventory?</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    The Full Studio allows configuring all photo angles, videos, size variants, and live inventory.
                  </p>
                </div>
                <Link
                  href={`/admin/products/${editingProduct.id}/edit`}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all active:scale-95"
                >
                  <span>Open Full Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Product Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Selling Price (₹)</label>
                  <input
                    required
                    type="number"
                    step="1"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">MRP / Compare Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
              </div>

              {/* Brand & Material Specifications Section */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-3">
                <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Brand & Material Specifications
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]">Brand / Company Name</label>
                    <input
                      placeholder="e.g. Roadster, Nike, Apple, or blank"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[11px]">Material / Fabric</label>
                    <input
                      placeholder="e.g. 100% Cotton Denim, Titanium"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]">Country of Origin</label>
                    <input
                      placeholder="e.g. India, Vietnam"
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[11px]">Official Warranty</label>
                    <input
                      placeholder="e.g. 1 Year Brand Warranty"
                      value={warranty}
                      onChange={(e) => setWarranty(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[11px]">Wash & Care Guide</label>
                  <input
                    placeholder="e.g. Machine Wash Cold (30°C)"
                    value={washCare}
                    onChange={(e) => setWashCare(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Available Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Product SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SWD-PROD-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Image URL or Local Upload</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 h-9 px-3 rounded-xl border bg-background text-xs"
                  />
                  <label className="h-9 px-3 rounded-xl border bg-muted/40 hover:bg-muted font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
                    <UploadCloud className="w-3.5 h-3.5 text-primary" />
                    <span>Upload PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            if (evt.target?.result) setImageUrl(evt.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Regional Heritage Hub Selection */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <label className="font-bold text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <span>🏛️</span>
                  <span>Virasat-e-Hind Regional Collection (Optional)</span>
                </label>
                <select
                  value={heritageRegion}
                  onChange={(e) => setHeritageRegion(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs font-semibold"
                >
                  <option value="">None (Standard Pan-India Catalog)</option>
                  {heritageList.map((h) => (
                    <option key={h.id} value={h.region}>
                      {h.region} — {h.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Overview Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background"
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>Published on Storefront</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>Featured in Hero Showcase</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
