'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ImagePlus,
  Video,
  Star,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  IndianRupee,
} from 'lucide-react';
import { CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  altText: string;
  isPrimary: boolean;
}

interface VariantForm {
  sku: string;
  title: string;
  size: string;
  color: string;
  price: number;
  stockQuantity: number;
}

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SHOE_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];
const POPULAR_COLORS = ['Black', 'White', 'Navy Blue', 'Olive Green', 'Crimson Red', 'Charcoal Grey', 'Beige'];

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  // Product fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('1499');
  const [comparePrice, setComparePrice] = useState('2499');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Multiple Media (Images & Videos)
  const [mediaList, setMediaList] = useState<MediaItem[]>([
    {
      id: 'media-1',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      type: 'image',
      altText: 'Main Product Image',
      isPrimary: true,
    },
    {
      id: 'media-2',
      url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
      type: 'image',
      altText: 'Side Angle View',
      isPrimary: false,
    },
  ]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');

  // Variants (Sizes & Colors)
  const [variants, setVariants] = useState<VariantForm[]>([
    { sku: 'PROD-BLK-M', title: 'Black / M', size: 'M', color: 'Black', price: 1499, stockQuantity: 25 },
    { sku: 'PROD-BLK-L', title: 'Black / L', size: 'L', color: 'Black', price: 1499, stockQuantity: 30 },
    { sku: 'PROD-BLU-M', title: 'Navy Blue / M', size: 'M', color: 'Navy Blue', price: 1499, stockQuantity: 15 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.get('/categories/flat');
        const list = Array.isArray(res) ? res : [];
        setCategories(list);
        if (list.length > 0) {
          setCategoryId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCats(false);
      }
    };
    loadCategories();
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  // Media Handlers
  const handleAddMedia = () => {
    if (!newMediaUrl.trim()) return;
    const isVideo =
      newMediaType === 'video' ||
      newMediaUrl.includes('.mp4') ||
      newMediaUrl.includes('youtube.com') ||
      newMediaUrl.includes('youtu.be');

    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      url: newMediaUrl.trim(),
      type: isVideo ? 'video' : 'image',
      altText: title || 'Product Media',
      isPrimary: mediaList.length === 0,
    };

    setMediaList([...mediaList, newItem]);
    setNewMediaUrl('');
  };

  const handleRemoveMedia = (id: string) => {
    const updated = mediaList.filter((m) => m.id !== id);
    if (updated.length > 0 && !updated.some((m) => m.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setMediaList(updated);
  };

  const handleSetPrimary = (id: string) => {
    setMediaList(
      mediaList.map((m) => ({
        ...m,
        isPrimary: m.id === id,
      })),
    );
  };

  // Quick Size Addition
  const handleQuickAddSize = (size: string) => {
    const defaultPrice = parseFloat(basePrice) || 1499;
    const code = (slug || 'SKU').toUpperCase().slice(0, 8);
    const existing = variants.find((v) => v.size === size);
    if (existing) return;

    setVariants([
      ...variants,
      {
        sku: `${code}-${size.replace(/\s+/g, '')}`,
        title: `${size}`,
        size,
        color: 'Default',
        price: defaultPrice,
        stockQuantity: 20,
      },
    ]);
  };

  const handleAddCustomVariant = () => {
    const num = variants.length + 1;
    const defaultPrice = parseFloat(basePrice) || 1499;
    const code = (slug || 'SKU').toUpperCase().slice(0, 8);
    setVariants([
      ...variants,
      {
        sku: `${code}-VAR-${num}`,
        title: `Size M / Variant ${num}`,
        size: 'M',
        color: 'Standard',
        price: defaultPrice,
        stockQuantity: 25,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, field: keyof VariantForm, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    // Auto update title if size or color changed
    if (field === 'size' || field === 'color') {
      const s = field === 'size' ? value : updated[index].size;
      const c = field === 'color' ? value : updated[index].color;
      updated[index].title = c && c !== 'Default' ? `${c} / ${s}` : `${s}`;
    }
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const calculateDiscount = () => {
    const base = parseFloat(basePrice);
    const comp = parseFloat(comparePrice);
    if (comp > base && base > 0) {
      return Math.round(((comp - base) / comp) * 100);
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setErrorMsg('Please select a valid category');
      return;
    }
    if (mediaList.length === 0) {
      setErrorMsg('Please add at least 1 product image');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        title,
        slug: slug || undefined,
        description,
        categoryId,
        basePrice: parseFloat(basePrice),
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        isPublished,
        isFeatured,
        images: mediaList.map((m, idx) => ({
          url: m.url,
          publicId: `novastore/${m.type}-${Date.now()}-${idx}`,
          altText: m.type === 'video' ? 'video' : m.altText || title,
          isPrimary: m.isPrimary,
          sortOrder: idx,
        })),
        variants: variants.map((v) => ({
          sku: v.sku,
          title: v.title,
          price: Number(v.price),
          stockQuantity: parseInt(String(v.stockQuantity), 10) || 0,
          attributes: {
            size: v.size,
            color: v.color,
          },
        })),
      };

      await apiClient.post('/products', payload);
      router.push('/admin/products');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product. Please check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountPercent = calculateDiscount();
  const primaryMedia = mediaList.find((m) => m.isPrimary) || mediaList[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>
          <h1 className="text-3xl font-black tracking-tight">Create & Publish Product</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add multiple photos, product videos, Indian sizes, colors, and ₹ INR pricing
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLUMNS: Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basic Info */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> 1. Product Details
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Puma Velocity Nitro 3 Running Shoes"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isLoadingCats}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">URL Slug (Auto)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-muted/40 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed product features, material, wash care, warranty, and specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* 2. Indian Pricing (₹ INR) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-primary" /> 2. Indian Pricing (₹ INR)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Selling Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="1499"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 rounded-xl border bg-background font-bold text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">MRP / Compare Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="2499"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 rounded-xl border bg-background text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Discount Preview</label>
                <div className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <span>{discountPercent > 0 ? `${discountPercent}% OFF` : 'No Discount'}</span>
                  {discountPercent > 0 && (
                    <span className="text-[10px]">
                      Save {formatPrice((parseFloat(comparePrice) || 0) - (parseFloat(basePrice) || 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. MULTI-MEDIA STUDIO (PHOTOS & VIDEOS) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" /> 3. Product Photos & Video Studio
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">
                {mediaList.length} media items attached
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Add multiple angles (Front, Back, Side, Lifestyle) and Product Video URL.
            </p>

            {/* Add Media Input Bar */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <select
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as any)}
                className="h-10 px-3 rounded-xl border bg-background text-xs font-bold sm:w-32"
              >
                <option value="image">📸 Photo</option>
                <option value="video">🎥 Video</option>
              </select>

              <input
                type="text"
                placeholder={
                  newMediaType === 'video'
                    ? 'Paste Video URL (MP4 / YouTube / Cloudinary)'
                    : 'Paste Image URL (Unsplash, Cloudinary, etc.)'
                }
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border bg-background text-xs"
              />

              <Button
                type="button"
                onClick={handleAddMedia}
                disabled={!newMediaUrl.trim()}
                className="rounded-xl font-bold gap-1 text-xs"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            {/* Media Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {mediaList.map((m, idx) => (
                <div
                  key={m.id}
                  className={`relative rounded-2xl border overflow-hidden group aspect-square bg-muted/40 transition-all ${
                    m.isPrimary ? 'ring-2 ring-primary border-primary shadow-sm' : 'hover:border-primary/50'
                  }`}
                >
                  {m.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-2 text-center">
                      <Video className="w-8 h-8 text-primary animate-pulse mb-1" />
                      <span className="text-[10px] font-bold">Product Video</span>
                    </div>
                  ) : (
                    <Image src={m.url} alt={m.altText} fill className="object-cover" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    {m.isPrimary && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary font-extrabold">
                        Primary
                      </Badge>
                    )}
                    {m.type === 'video' && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white font-extrabold">
                        Video
                      </Badge>
                    )}
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                    {!m.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(m.id)}
                        className="text-[10px] bg-primary px-2 py-1 rounded-lg font-bold hover:bg-primary/90"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(m.id)}
                      className="text-[10px] bg-destructive px-2 py-1 rounded-lg font-bold hover:bg-destructive/90 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. VARIANTS (SIZES, COLORS & STOCK) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> 4. Sizes, Colors & Inventory
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomVariant}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </Button>
            </div>

            {/* Quick Add Size Presets */}
            <div className="space-y-2 text-xs bg-muted/20 p-3.5 rounded-2xl border">
              <p className="font-bold text-muted-foreground">⚡ Quick Add Indian Sizes:</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-muted-foreground self-center mr-1">Apparel:</span>
                {APPAREL_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleQuickAddSize(sz)}
                    className="px-2.5 py-1 rounded-lg border bg-background hover:bg-primary/10 hover:border-primary text-xs font-bold"
                  >
                    + {sz}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground self-center mr-1">Footwear:</span>
                {SHOE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleQuickAddSize(sz)}
                    className="px-2.5 py-1 rounded-lg border bg-background hover:bg-primary/10 hover:border-primary text-xs font-bold"
                  >
                    + {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Variants Table */}
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border bg-background grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-0.5">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => handleUpdateVariant(i, 'sku', e.target.value.toUpperCase())}
                      className="w-full h-8 px-2 rounded-lg border bg-background font-mono text-[11px] uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-0.5">
                      Size
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. M, UK 8"
                      value={v.size}
                      onChange={(e) => handleUpdateVariant(i, 'size', e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border bg-background font-bold text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-0.5">
                      Color
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Black"
                      value={v.color}
                      onChange={(e) => handleUpdateVariant(i, 'color', e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-0.5">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={v.price}
                      onChange={(e) => handleUpdateVariant(i, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2 rounded-lg border bg-background font-bold text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-0.5">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={v.stockQuantity}
                      onChange={(e) => handleUpdateVariant(i, 'stockQuantity', parseInt(e.target.value) || 0)}
                      className="w-full h-8 px-2 rounded-lg border bg-background font-bold text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1 text-right pt-3 sm:pt-0">
                    <button
                      type="button"
                      disabled={variants.length <= 1}
                      onClick={() => handleRemoveVariant(i)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Customer Preview & Publish Control */}
        <div className="space-y-6">
          {/* Publish Action Card */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-bold text-sm">Publishing Options</h3>

            <div className="space-y-3 text-xs border-y py-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold">Publish to Online Store</span>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold">Featured on Homepage</span>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full rounded-2xl font-bold shadow-lg h-12"
            >
              {isSubmitting ? 'Publishing Product...' : 'Publish Product to Store 🚀'}
            </Button>

            {/* LIVE CUSTOMER VIEW PREVIEW CARD */}
            <div className="space-y-2 pt-3">
              <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Customer View Preview:
              </p>

              <div className="rounded-2xl border bg-background p-3 space-y-2.5 shadow-sm">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted">
                  {primaryMedia ? (
                    <Image
                      src={primaryMedia.url}
                      alt={title || 'Product'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <Badge className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px]">
                      -{discountPercent}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-xs truncate">{title || 'Product Title Preview'}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="font-extrabold text-sm text-foreground">
                      {formatPrice(parseFloat(basePrice) || 0)}
                    </span>
                    {parseFloat(comparePrice) > parseFloat(basePrice) && (
                      <span className="text-[11px] text-muted-foreground line-through">
                        {formatPrice(parseFloat(comparePrice))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {variants.slice(0, 4).map((v, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground border"
                      >
                        {v.size}
                      </span>
                    ))}
                    {variants.length > 4 && (
                      <span className="text-[9px] text-muted-foreground self-center">
                        +{variants.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
