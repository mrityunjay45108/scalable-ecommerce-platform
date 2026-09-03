'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Edit2,
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
} from 'lucide-react';
import { ProductDto, CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { parseProductSpecs, formatDescriptionWithSpecs } from '@/lib/product-specs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    setImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800');
    setBrand('');
    setMaterial('');
    setCountryOfOrigin('');
    setWarranty('');
    setWashCare('');
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
    setCategoryId(p.categoryId);
    setBasePrice(String(p.basePrice));
    setComparePrice(p.comparePrice ? String(p.comparePrice) : '');
    setIsPublished(p.isPublished);
    setIsFeatured(p.isFeatured);
    setImageUrl(p.images?.[0]?.url || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fullDescription = formatDescriptionWithSpecs(description, {
        brand,
        material,
        origin: countryOfOrigin,
        warranty,
        care: washCare,
      });

      const payload: any = {
        title,
        description: fullDescription,
        categoryId,
        basePrice: parseFloat(basePrice),
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        isPublished,
        isFeatured,
        images: imageUrl
          ? [
              {
                url: imageUrl,
                publicId: 'novastore/manual-upload',
                isPrimary: true,
                sortOrder: 0,
              },
            ]
          : [],
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

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-2xl gap-2 font-semibold text-xs">
            <Link href="/" target="_blank">
              <ExternalLink className="w-3.5 h-3.5" /> View Live Store
            </Link>
          </Button>
          <Button asChild className="rounded-2xl gap-2 font-bold shadow-md">
            <Link href="/admin/products/create">
              <Plus className="w-4 h-4" /> Add New Product
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

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border bg-card focus:ring-1 focus:ring-primary"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
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
                    <td className="p-4 font-semibold">{p.category?.name || 'Unassigned'}</td>
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

                        {/* Edit Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
            <h3 className="text-lg font-bold">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>

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

              <div>
                <label className="font-semibold block mb-1">Image URL (Cloudinary / Unsplash)</label>
                <input
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
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
