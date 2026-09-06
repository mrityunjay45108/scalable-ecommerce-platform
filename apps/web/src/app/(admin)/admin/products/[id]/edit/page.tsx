'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Play,
  Tag,
  Building2,
  Globe2,
  ExternalLink,
  Save,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { CategoryDto, ProductDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { formatDescriptionWithSpecs, parseProductSpecs } from '@/lib/product-specs';
import { getRegionalHeritage, RegionalHeritageItem } from '@/lib/regional-heritage';
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
  id?: string;
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
const ANGLE_PRESETS = ['Front View (Hero)', 'Back View', 'Side Profile', 'Detail & Texture', 'Model Lifestyle'];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [heritageList, setHeritageList] = useState<RegionalHeritageItem[]>([]);
  const [heritageRegion, setHeritageRegion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. General Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // 2. Specifications
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [fit, setFit] = useState('');
  const [washCare, setWashCare] = useState('');
  const [warranty, setWarranty] = useState('');
  const [customSpecs, setCustomSpecs] = useState<{ id: string; key: string; value: string }[]>([]);

  // 3. Multi-Photo Studio
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // 4. Video Showcase
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');

  // 5. Variants Matrix
  const [variants, setVariants] = useState<VariantForm[]>([]);

  // Load product details and categories
  useEffect(() => {
    setHeritageList(getRegionalHeritage());
    if (!productId) return;

    const loadData = async () => {
      try {
        const [prodData, catData] = await Promise.all([
          apiClient.get<ProductDto>(`/products/admin/item/${productId}`),
          apiClient.get<CategoryDto[]>('/categories/flat'),
        ]);

        const cats = Array.isArray(catData) ? catData : [];
        setCategories(cats);

        if (prodData) {
          setTitle(prodData.title || '');
          setSlug(prodData.slug || '');
          setCategoryId(prodData.categoryId || (cats[0]?.id ?? ''));
          setBasePrice(String(prodData.basePrice || ''));
          setComparePrice(prodData.comparePrice ? String(prodData.comparePrice) : '');
          setIsPublished(Boolean(prodData.isPublished));
          setIsFeatured(Boolean(prodData.isFeatured));

          // Parse specifications from description
          const specs = parseProductSpecs(prodData.description || '', prodData.category?.name);
          setDescription(specs.cleanDescription || prodData.description || '');
          if (specs.region) setHeritageRegion(specs.region);
          setBrand(specs.brand || '');
          setMaterial(specs.material || '');
          setCountryOfOrigin(specs.origin || '');
          setFit(specs.fit || '');
          setWashCare(specs.care || '');
          setWarranty(specs.warranty || '');
          setCustomSpecs(
            specs.customSpecs?.map((cs, i) => ({
              id: `cs-${i}-${Date.now()}`,
              key: cs.key,
              value: cs.value,
            })) || [],
          );

          // Populate images
          if (prodData.images && prodData.images.length > 0) {
            const photoList: MediaItem[] = [];
            let foundVideo = '';

            prodData.images.forEach((img, idx) => {
              const isVid =
                img.altText === 'video' ||
                img.url.endsWith('.mp4') ||
                img.url.includes('youtube.com') ||
                img.url.includes('youtu.be') ||
                img.url.includes('vimeo.com');

              if (isVid && !foundVideo) {
                foundVideo = img.url;
              } else {
                photoList.push({
                  id: img.id || `media-${idx}`,
                  url: img.url,
                  type: 'image',
                  altText: img.altText || (idx === 0 ? 'Front View (Hero)' : `Angle ${idx + 1}`),
                  isPrimary: Boolean(img.isPrimary),
                });
              }
            });

            // Ensure at least one image is primary if list not empty
            if (photoList.length > 0 && !photoList.some((m) => m.isPrimary)) {
              photoList[0].isPrimary = true;
            }

            setMediaList(photoList);
            if (foundVideo) {
              setVideoUrl(foundVideo);
              setVideoInput(foundVideo);
            }
          }

          // Populate variants
          if (prodData.variants && prodData.variants.length > 0) {
            setVariants(
              prodData.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                title: v.title || 'Standard',
                size: (v.attributes?.size as string) || 'Standard',
                color: (v.attributes?.color as string) || 'Default',
                price: Number(v.price) || Number(prodData.basePrice) || 0,
                stockQuantity: v.stockQuantity ?? 20,
              })),
            );
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load product details');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadData();
  }, [productId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Image Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultUrl = event.target.result as string;
          const defaultLabel =
            mediaList.length === 0 && index === 0
              ? 'Front View (Hero)'
              : index === 1
              ? 'Back View'
              : index === 2
              ? 'Side Profile'
              : 'Detail & Texture';

          setMediaList((prev) => [
            ...prev,
            {
              id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              url: resultUrl,
              type: 'image',
              altText: defaultLabel,
              isPrimary: prev.length === 0 && index === 0,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      url: newImageUrl.trim(),
      type: 'image',
      altText: mediaList.length === 0 ? 'Front View (Hero)' : `Product Angle ${mediaList.length + 1}`,
      isPrimary: mediaList.length === 0,
    };
    setMediaList([...mediaList, newItem]);
    setNewImageUrl('');
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

  const handleMoveMedia = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= mediaList.length) return;
    const items = [...mediaList];
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    setMediaList(items);
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setMediaList(mediaList.map((m) => (m.id === id ? { ...m, altText: label } : m)));
  };

  // Video Handler
  const handleSetVideo = () => {
    if (!videoInput.trim()) return;
    setVideoUrl(videoInput.trim());
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setVideoInput('');
  };

  // Pricing Handlers
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const num = parseFloat(val) || 0;
    if (variants.length > 0) {
      setVariants(variants.map((v) => ({ ...v, price: num })));
    }
  };

  // Custom Specs Handlers
  const handleAddCustomSpec = () => {
    setCustomSpecs([
      ...customSpecs,
      { id: `cs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, key: '', value: '' },
    ]);
  };

  const handleRemoveCustomSpec = (id: string) => {
    setCustomSpecs(customSpecs.filter((cs) => cs.id !== id));
  };

  const handleUpdateCustomSpec = (id: string, field: 'key' | 'value', val: string) => {
    setCustomSpecs(customSpecs.map((cs) => (cs.id === id ? { ...cs, [field]: val } : cs)));
  };

  // Variants Handlers
  const handleQuickAddSize = (size: string) => {
    const defaultPrice = parseFloat(basePrice) || 0;
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
    const defaultPrice = parseFloat(basePrice) || 0;
    const code = (slug || 'SKU').toUpperCase().slice(0, 8);
    setVariants([
      ...variants,
      {
        sku: `${code}-VAR-${num}`,
        title: `Variant ${num}`,
        size: 'Standard',
        color: 'Default',
        price: defaultPrice,
        stockQuantity: 25,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, field: keyof VariantForm, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'size' || field === 'color') {
      const s = field === 'size' ? value : updated[index].size;
      const c = field === 'color' ? value : updated[index].color;
      updated[index].title = c && c !== 'Default' ? `${c} / ${s}` : `${s}`;
    }
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
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

  // Submit / Save Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a product title');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select a valid category');
      return;
    }
    if (!basePrice || parseFloat(basePrice) < 0) {
      setErrorMsg('Please enter a valid Selling Price');
      return;
    }
    if (mediaList.length === 0) {
      setErrorMsg('Please add at least 1 product image');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const combinedImages = [
        ...mediaList.map((m, idx) => ({
          url: m.url,
          publicId: `novastore/photo-${Date.now()}-${idx}`,
          altText: m.altText || title,
          isPrimary: m.isPrimary,
          sortOrder: idx,
        })),
        ...(videoUrl
          ? [
              {
                url: videoUrl,
                publicId: `novastore/video-${Date.now()}`,
                altText: 'video',
                isPrimary: false,
                sortOrder: mediaList.length,
              },
            ]
          : []),
      ];

      const fullDescription = formatDescriptionWithSpecs(description, {
        region: heritageRegion.trim() || undefined,
        brand: brand.trim() || undefined,
        material: material.trim() || undefined,
        origin: countryOfOrigin.trim() || undefined,
        fit: fit.trim() || undefined,
        care: washCare.trim() || undefined,
        warranty: warranty.trim() || undefined,
        customSpecs: customSpecs.filter((cs) => cs.key.trim() && cs.value.trim()),
      });

      const numericBasePrice = parseFloat(basePrice) || 0;
      const code = (slug || 'SKU').toUpperCase().slice(0, 8);

      const finalVariants =
        variants.length > 0
          ? variants.map((v) => ({
              sku: v.sku || `${code}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
              title: v.title || 'Standard',
              price: Number(v.price) > 0 ? Number(v.price) : numericBasePrice,
              stockQuantity: parseInt(String(v.stockQuantity), 10) || 20,
              attributes: {
                size: v.size || 'Standard',
                color: v.color || 'Default',
              },
            }))
          : [
              {
                sku: `${code}-STD`,
                title: 'Standard',
                price: numericBasePrice,
                stockQuantity: 25,
                attributes: {
                  size: 'Standard',
                  color: 'Default',
                },
              },
            ];

      const payload = {
        title: title.trim(),
        slug: slug || undefined,
        description: fullDescription,
        categoryId,
        basePrice: numericBasePrice,
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        isPublished,
        isFeatured,
        images: combinedImages,
        variants: finalVariants,
      };

      await apiClient.put(`/products/${productId}`, payload);
      setSuccessMsg('Product updated successfully!');
      setTimeout(() => {
        router.push('/admin/products');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    try {
      await apiClient.delete(`/products/${productId}`);
      router.push('/admin/products');
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const primaryMedia = mediaList.find((m) => m.isPrimary) || mediaList[0];
  const discountPercent = calculateDiscount();

  if (isLoadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Loading product details for editing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            href="/admin/products"
            className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Edit Product Studio
            </h1>
            {isPublished ? (
              <Badge variant="success" className="text-[10px]">Published</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Draft</Badge>
            )}
            {isFeatured && (
              <Badge className="bg-amber-500 text-white text-[10px] font-extrabold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Hero Showcase
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Update photos, variants, inventory, pricing, brand specifications, and visibility.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {slug && (
            <Link
              href={`/products/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on Store
            </Link>
          )}

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="rounded-xl font-bold text-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
            className="rounded-xl font-bold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Main Product Setup */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. GENERAL INFORMATION */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
              <Layers className="w-4 h-4 text-primary" /> 1. General Information
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slim Fit Denim Jeans / Apex Velocity Shoes"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border bg-background text-sm font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold">URL Slug (Handle)</label>
                    <button
                      type="button"
                      onClick={() => setAutoSlug(!autoSlug)}
                      className={`text-[10px] font-bold ${autoSlug ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {autoSlug ? '✓ Auto-Sync' : 'Manual'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="product-url-slug"
                    value={slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      setSlug(e.target.value);
                    }}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Overview Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed product features, highlights, and overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background leading-relaxed font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 🏛️ VIRASAT-E-HIND REGIONAL HERITAGE COLLECTION */}
          <div className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h2 className="text-base font-black text-foreground">
                    Virasat-e-Hind Regional Heritage (विरासत-ए-हिंद)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tag this product to an authentic Indian regional craft collection (North, West, South, East India, etc.)
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                Regional Craft Hub
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block font-bold mb-1">Assign to Regional Heritage Collection</label>
                <select
                  value={heritageRegion}
                  onChange={(e) => setHeritageRegion(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold text-xs"
                >
                  <option value="">None (Standard Pan-India Catalog)</option>
                  {heritageList.map((h) => (
                    <option key={h.id} value={h.region}>
                      {h.region} — {h.title}
                    </option>
                  ))}
                </select>
              </div>

              {heritageRegion ? (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tagged to {heritageRegion}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Customers browsing this region will discover this product.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeritageRegion('')}
                    className="text-[10px] font-bold text-destructive hover:underline ml-2"
                  >
                    Clear Tag
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-muted/40 border text-[11px] text-muted-foreground flex items-center">
                  <span>Select a region to showcase this item under Virasat-e-Hind on the homepage.</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. BRAND, MATERIALS & SPECIFICATIONS */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> 2. Brand, Materials & Product Specifications
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add brand name, material specs, or custom specifications.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Optional
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold">Brand / Company Name</label>
                    {brand && (
                      <button
                        type="button"
                        onClick={() => setBrand('')}
                        className="text-[10px] text-destructive hover:underline font-semibold"
                      >
                        Clear Brand
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Roadster, Nike, Apple, Puma, or leave blank"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {['Roadster', 'Nike', 'Apple', "Levi's", 'Puma', 'Zara', 'SWADESH Luxe'].map((bName) => (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => setBrand(bName)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                          brand === bName
                            ? 'bg-primary text-white border-primary'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {bName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Material / Fabric / Composition</label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Breathable Cotton Denim, Titanium Alloy, etc."
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {['100% Cotton Denim', 'French Terry Cotton', 'Engineered Mesh & Carbon', 'Aluminum & Titanium'].map(
                      (mName) => (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => setMaterial(mName)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                            material === mName
                              ? 'bg-primary text-white border-primary'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {mName}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Country of Origin / Made In</label>
                  <input
                    type="text"
                    placeholder="e.g. India, Vietnam, USA, Germany"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Fit / Silhouette / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Relaxed Fit, Slim Fit, Ergonomic Over-Ear"
                    value={fit}
                    onChange={(e) => setFit(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Wash & Care Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Machine Wash Cold (30°C), Do Not Bleach"
                    value={washCare}
                    onChange={(e) => setWashCare(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Official Warranty & Guarantee</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Year Brand Warranty, 6 Months Replacement"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Custom Key-Value Specs */}
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Custom Specifications & Key-Value Details
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Add custom attributes (e.g. Bluetooth Version, Pattern, Occasion, Closure, Weight).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomSpec}
                    className="rounded-xl font-bold text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Spec
                  </Button>
                </div>

                {customSpecs.length > 0 && (
                  <div className="space-y-2">
                    {customSpecs.map((cs) => (
                      <div key={cs.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Specification Key (e.g. Pattern, Bluetooth)"
                          value={cs.key}
                          onChange={(e) => handleUpdateCustomSpec(cs.id, 'key', e.target.value)}
                          className="w-1/3 h-8 px-2.5 rounded-lg border bg-background text-xs font-bold"
                        />
                        <input
                          type="text"
                          placeholder="Specification Value (e.g. Solid Washed, v5.3)"
                          value={cs.value}
                          onChange={(e) => handleUpdateCustomSpec(cs.id, 'value', e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded-lg border bg-background text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSpec(cs.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. INDIAN PRICING (₹ INR) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" /> 3. Indian Pricing (₹ INR)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set selling price and MRP compare price.
              </p>
            </div>

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
                    placeholder="e.g. 1499"
                    value={basePrice}
                    onChange={(e) => handleBasePriceChange(e.target.value)}
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
                    placeholder="e.g. 2499"
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

          {/* 4. MULTI-PHOTO STUDIO */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-primary" /> 4. Product Photos Studio (Multi-Photo)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload multiple photos from your device or paste web URLs. Set cover photo and angle tags.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mediaList.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaList([])}
                    className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2.5 font-bold"
                  >
                    Clear All
                  </Button>
                )}
                <Badge variant="secondary" className="font-bold text-xs">
                  {mediaList.length} {mediaList.length === 1 ? 'Photo' : 'Photos'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Upload from Device</p>
                  <p className="text-[10px] text-muted-foreground">Select 1 or more photos (PNG, JPG, WebP)</p>
                </div>

                <div className="border rounded-2xl p-4 bg-muted/20 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      Or Add Image URL (Cloudinary / Unsplash):
                    </label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border bg-background text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={!newImageUrl.trim()}
                    size="sm"
                    className="rounded-xl font-bold text-xs gap-1 self-end"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Image
                  </Button>
                </div>
              </div>
            </div>

            {mediaList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {mediaList.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`relative rounded-2xl border bg-background p-2.5 space-y-2 group transition-all shadow-xs ${
                      m.isPrimary ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted/40">
                      <Image src={m.url} alt={m.altText} fill className="object-cover" />

                      <div className="absolute top-2 left-2 flex gap-1 z-10">
                        {m.isPrimary ? (
                          <Badge className="text-[9px] px-2 py-0.5 bg-primary text-primary-foreground font-extrabold shadow-sm">
                            ⭐ Cover Photo
                          </Badge>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-black/60 text-white font-bold backdrop-blur">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(m.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-destructive text-white backdrop-blur transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-muted-foreground">Angle / View:</label>
                      <select
                        value={m.altText}
                        onChange={(e) => handleUpdateLabel(m.id, e.target.value)}
                        className="w-full h-7 px-2 text-[11px] font-semibold rounded-lg border bg-background"
                      >
                        {ANGLE_PRESETS.map((angle) => (
                          <option key={angle} value={angle}>
                            {angle}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveMedia(idx, 'left')}
                          className="p-1 rounded-md border bg-muted/40 hover:bg-muted disabled:opacity-30"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === mediaList.length - 1}
                          onClick={() => handleMoveMedia(idx, 'right')}
                          className="p-1 rounded-md border bg-muted/40 hover:bg-muted disabled:opacity-30"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!m.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(m.id)}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Make Cover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed rounded-2xl text-muted-foreground text-xs">
                <ImagePlus className="w-8 h-8 mx-auto opacity-40 mb-1" />
                <p className="font-bold">No product photos added yet</p>
                <p className="text-[10px]">Add at least 1 photo for storefront display.</p>
              </div>
            )}
          </div>

          {/* 5. VIDEO SHOWCASE */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" /> 5. Product Video Preview (Optional)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach an official video walkthrough (YouTube, MP4, Vimeo, Cloudinary).
                </p>
              </div>
              {videoUrl && (
                <Badge className="bg-amber-500 text-white text-[10px] font-bold">Video Active</Badge>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://res.cloudinary.com/.../video.mp4"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl border bg-background font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={handleSetVideo}
                  disabled={!videoInput.trim()}
                  size="sm"
                  className="rounded-xl font-bold"
                >
                  Apply Video
                </Button>
                {videoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveVideo}
                    className="rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                )}
              </div>

              {videoUrl && (
                <div className="p-3 rounded-2xl border bg-muted/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{videoUrl}</p>
                      <p className="text-[10px] text-muted-foreground">Attached to product details</p>
                    </div>
                  </div>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    Open Link &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 6. VARIANTS & INVENTORY MATRIX */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> 6. Variants & Inventory Matrix
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure apparel sizes, shoe sizes, colors, and stock per variant.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomVariant}
                className="rounded-xl font-bold text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Variant
              </Button>
            </div>

            {/* Quick Size Preset Pills */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground">Quick Add Apparel Sizes:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {APPAREL_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleQuickAddSize(size)}
                      className="px-2.5 py-1 rounded-lg border bg-muted/30 hover:bg-muted font-bold text-xs transition-colors"
                    >
                      + {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-muted-foreground">Quick Add Shoe Sizes:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SHOE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleQuickAddSize(size)}
                      className="px-2.5 py-1 rounded-lg border bg-muted/30 hover:bg-muted font-bold text-xs transition-colors"
                    >
                      + {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Variants Table */}
            {variants.length > 0 ? (
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b font-bold text-muted-foreground">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Variant Name</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Color</th>
                      <th className="p-3">Price (₹)</th>
                      <th className="p-3">Stock Qty</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {variants.map((v, index) => (
                      <tr key={v.sku || index} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => handleUpdateVariant(index, 'sku', e.target.value)}
                            className="w-24 h-7 px-2 rounded-lg border bg-background font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.title}
                            onChange={(e) => handleUpdateVariant(index, 'title', e.target.value)}
                            className="w-28 h-7 px-2 rounded-lg border bg-background font-semibold"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.size}
                            onChange={(e) => handleUpdateVariant(index, 'size', e.target.value)}
                            className="w-20 h-7 px-2 rounded-lg border bg-background"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => handleUpdateVariant(index, 'color', e.target.value)}
                            className="w-20 h-7 px-2 rounded-lg border bg-background"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleUpdateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 px-2 rounded-lg border bg-background font-bold"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={v.stockQuantity}
                            onChange={(e) =>
                              handleUpdateVariant(index, 'stockQuantity', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-16 h-7 px-2 rounded-lg border bg-background font-bold text-center"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center border rounded-2xl bg-muted/10 text-muted-foreground text-xs">
                <p className="font-semibold">Single default variant will be maintained automatically.</p>
                <p className="text-[10px]">Click any size above to generate multi-size SKU matrix.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Publishing Controls & Customer View Preview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Publishing Options */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground">Publishing Options</h3>

            <div className="space-y-3 text-xs">
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
                <span className="font-semibold">Featured in Hero Showcase</span>
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
              className="w-full rounded-2xl font-bold shadow-lg h-12 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save All Changes
                </>
              )}
            </Button>
          </div>

          {/* Customer View Preview */}
          <div className="space-y-2">
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
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground p-4 text-center space-y-1.5 bg-muted/40">
                    <ImagePlus className="w-10 h-10 opacity-30 text-muted-foreground" />
                    <span className="font-bold text-foreground/70">No Photo Added Yet</span>
                    <span className="text-[10px] text-muted-foreground">
                      Upload or paste image URL in Section 4
                    </span>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discountPercent > 0 && (
                    <Badge className="bg-rose-600 text-white font-extrabold text-[10px]">
                      -{discountPercent}%
                    </Badge>
                  )}
                  {videoUrl && (
                    <Badge className="bg-amber-500 text-white font-extrabold text-[9px] flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" /> Video
                    </Badge>
                  )}
                </div>

                {/* Photos counter */}
                {mediaList.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    1 / {mediaList.length + (videoUrl ? 1 : 0)}
                  </div>
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

                {variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {variants.slice(0, 5).map((v) => (
                      <span
                        key={v.sku}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/60 border text-muted-foreground"
                      >
                        {v.size}
                      </span>
                    ))}
                    {variants.length > 5 && (
                      <span className="text-[9px] font-bold text-muted-foreground">
                        +{variants.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
