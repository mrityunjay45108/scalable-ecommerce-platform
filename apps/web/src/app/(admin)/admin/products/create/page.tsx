'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Play,
  Zap,
  Tag,
} from 'lucide-react';
import { CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { formatDescriptionWithSpecs } from '@/lib/product-specs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe2, ShieldCheck as ShieldIcon } from 'lucide-react';

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
const ANGLE_PRESETS = ['Front View (Hero)', 'Back View', 'Side Profile', 'Detail & Texture', 'Model Lifestyle'];

export default function CreateProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  // Product fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Brand & Material Specifications (100% Optional)
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [fit, setFit] = useState('');
  const [washCare, setWashCare] = useState('');
  const [warranty, setWarranty] = useState('');

  // Custom Specification Fields (Dynamic Key-Value pairs)
  const [customSpecs, setCustomSpecs] = useState<{ id: string; key: string; value: string }[]>([]);

  // Multiple Photos (Images)
  const [mediaList, setMediaList] = useState<MediaItem[]>([
    {
      id: 'media-1',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      type: 'image',
      altText: 'Front View (Hero)',
      isPrimary: true,
    },
    {
      id: 'media-2',
      url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
      type: 'image',
      altText: 'Side Profile',
      isPrimary: false,
    },
    {
      id: 'media-3',
      url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
      type: 'image',
      altText: 'Detail View',
      isPrimary: false,
    },
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Dedicated Product Video (YouTube, MP4, Vimeo, Cloudinary)
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');

  // Variants (Sizes & Colors)
  const [variants, setVariants] = useState<VariantForm[]>([]);

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

  // MULTI-IMAGE HANDLERS
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
    const updated = [...mediaList];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setMediaList(updated);
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setMediaList(
      mediaList.map((m) => (m.id === id ? { ...m, altText: label } : m)),
    );
  };

  // VIDEO HANDLERS
  const handleAttachVideo = () => {
    if (!videoInput.trim()) return;
    setVideoUrl(videoInput.trim());
    setVideoInput('');
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
  };

  // Quick Preset Sample Packs
  const handleApplyPreset = (preset: 'sneakers' | 'hoodie' | 'watch') => {
    if (preset === 'sneakers') {
      setTitle('Puma Nitro Velocity 3 Running Shoes');
      setSlug('puma-nitro-velocity-3-running-shoes');
      setDescription('Engineered for daily distance runners with dual-layer NITRO foam cushioning, engineered mono-mesh upper, and PUMAGRIP rubber outsole.');
      setBasePrice('2999');
      setComparePrice('4999');
      setMediaList([
        {
          id: 'p-1',
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
          type: 'image',
          altText: 'Front View (Hero)',
          isPrimary: true,
        },
        {
          id: 'p-2',
          url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
          type: 'image',
          altText: 'Side Profile Angle',
          isPrimary: false,
        },
        {
          id: 'p-3',
          url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
          type: 'image',
          altText: 'Sole & Grip Detail',
          isPrimary: false,
        },
      ]);
      setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    } else if (preset === 'hoodie') {
      setTitle('450 GSM Heavyweight Oversized Hoodie');
      setSlug('450-gsm-heavyweight-oversized-hoodie');
      setDescription('100% French Terry luxury heavyweight cotton hoodie with custom drop-shoulder boxy fit and ribbed kangaroo pocket.');
      setBasePrice('1899');
      setComparePrice('2999');
      setMediaList([
        {
          id: 'h-1',
          url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
          type: 'image',
          altText: 'Front View (Hero)',
          isPrimary: true,
        },
        {
          id: 'h-2',
          url: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800',
          type: 'image',
          altText: 'Back View & Fit',
          isPrimary: false,
        },
        {
          id: 'h-3',
          url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800',
          type: 'image',
          altText: 'Fabric & Stitching Detail',
          isPrimary: false,
        },
      ]);
      setVideoUrl('');
    }
  };

  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const numPrice = parseFloat(val) || 0;
    if (variants.length > 0) {
      setVariants(variants.map((v) => ({ ...v, price: numPrice })));
    }
  };

  // Custom Specs Handlers
  const handleAddCustomSpec = () => {
    setCustomSpecs([...customSpecs, { id: `cs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, key: '', value: '' }]);
  };

  const handleRemoveCustomSpec = (id: string) => {
    setCustomSpecs(customSpecs.filter((cs) => cs.id !== id));
  };

  const handleUpdateCustomSpec = (id: string, field: 'key' | 'value', val: string) => {
    setCustomSpecs(customSpecs.map((cs) => (cs.id === id ? { ...cs, [field]: val } : cs)));
  };

  // Quick Size Addition
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

    try {
      // Assemble images list + attached video if present
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

      // Auto-generate default variant if none specified
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
          <h1 className="text-3xl font-black tracking-tight text-foreground">Create & Publish Product</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach multiple photos, video preview, Brand details, Material specs, and ₹ INR pricing
          </p>
        </div>

        {/* 1-Click Sample Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">⚡ Quick Presets:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyPreset('sneakers')}
            className="rounded-xl text-xs font-bold"
          >
            👟 Sneakers Preset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyPreset('hoodie')}
            className="rounded-xl text-xs font-bold"
          >
            👕 Hoodie Preset
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2 border border-destructive/20">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Main Form (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. General Info */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
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
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-semibold focus:ring-1 focus:ring-primary"
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
                  rows={3}
                  required
                  placeholder="Detailed product features and overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* 🏢 2. BRAND, MATERIAL & PRODUCT SPECIFICATIONS (100% OPTIONAL) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> 2. Brand, Materials & Product Specifications
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optional. Add brand name, material specs, or custom product specifications.
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Optional
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Brand & Manufacturer */}
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
                  {/* Quick Brand presets */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {['Roadster', 'Nike', 'Apple', "Levi's", 'Puma', 'Zara', 'NovaStore'].map((bName) => (
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
                  {/* Quick Material Presets */}
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

              {/* Country of Origin & Fit/Style */}
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

              {/* Wash Care & Warranty */}
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

              {/* ➕ CUSTOM SPECIFICATION FIELDS BUILDER */}
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Custom Specifications & Key-Value Details
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Add any custom fields (e.g. Weight, Battery Capacity, Storage, Dimensions, Processor, etc.)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomSpec}
                    className="rounded-xl text-xs font-bold gap-1 h-8"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Field
                  </Button>
                </div>

                {customSpecs.length > 0 && (
                  <div className="space-y-2">
                    {customSpecs.map((cs) => (
                      <div key={cs.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Field Name (e.g. Weight, Battery, Color)"
                          value={cs.key}
                          onChange={(e) => handleUpdateCustomSpec(cs.id, 'key', e.target.value)}
                          className="flex-1 h-9 px-3 rounded-xl border bg-background text-xs font-bold"
                        />
                        <span className="text-muted-foreground font-bold">:</span>
                        <input
                          type="text"
                          placeholder="Specification Value (e.g. 250g, 5000 mAh, Midnight Red)"
                          value={cs.value}
                          onChange={(e) => handleUpdateCustomSpec(cs.id, 'value', e.target.value)}
                          className="flex-1 h-9 px-3 rounded-xl border bg-background text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSpec(cs.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove Field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Indian Pricing (₹ INR) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" /> 3. Indian Pricing (₹ INR)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set your product selling price. All variant prices will automatically stay synced in real-time.
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
                    placeholder="e.g. 89 or 1499"
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
                    placeholder="e.g. 199 or 2499"
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

          {/* 3. MULTI-PHOTO STUDIO (2, 3, 5+ PHOTOS) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-primary" /> 3. Product Photos Studio (2-5+ Photos)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload multiple photos from your device or paste web URLs. Set cover photo and angle tags.
                </p>
              </div>
              <Badge variant="secondary" className="font-bold text-xs">
                {mediaList.length} {mediaList.length === 1 ? 'Photo' : 'Photos'}
              </Badge>
            </div>

            {/* Upload Area & URL Input */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Local Multi-File Picker */}
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
                  <p className="text-[10px] text-muted-foreground">Select 2, 3 or more photos at once (PNG, JPG, WebP)</p>
                </div>

                {/* Paste URL */}
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

            {/* Photos Gallery Strip with Reordering & Angle Tagging */}
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {mediaList.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`relative rounded-2xl border bg-background p-2.5 space-y-2 group transition-all shadow-xs ${
                      m.isPrimary ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                    }`}
                  >
                    {/* Image Preview Container */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted/40">
                      <Image src={m.url} alt={m.altText} fill className="object-cover" />

                      {/* Primary / Cover Badge */}
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

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(m.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-destructive text-white backdrop-blur transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Angle Tag Selector */}
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

                    {/* Action Bar: Reorder & Make Cover */}
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
                <p className="text-[10px]">Add at least 2 or 3 photos for optimal customer engagement.</p>
              </div>
            )}
          </div>

          {/* 4. DEDICATED PRODUCT VIDEO STUDIO */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-500" /> 4. Product Video Studio (Reels / Teaser / Demo)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach a YouTube video, MP4 link, or video reel to show 360° product fit and details.
                </p>
              </div>
              {videoUrl && (
                <Badge className="bg-amber-500 text-white font-extrabold text-[10px]">
                  🎥 Video Attached
                </Badge>
              )}
            </div>

            {/* Video URL Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Paste Video URL (e.g. https://www.youtube.com/watch?v=... or https://cdn.../demo.mp4)"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border bg-background text-xs font-mono"
              />
              <Button
                type="button"
                onClick={handleAttachVideo}
                disabled={!videoInput.trim()}
                className="rounded-xl font-bold gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="w-4 h-4" /> Attach Video
              </Button>
            </div>

            {/* Live Video Preview Box */}
            {videoUrl ? (
              <div className="p-4 rounded-2xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground truncate max-w-sm">{videoUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="text-xs font-bold text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Video
                  </button>
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-md">
                  {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                      title="Product Video Live Preview"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed bg-muted/10 text-center text-xs text-muted-foreground">
                <p className="font-semibold">No video attached yet (Optional)</p>
                <p className="text-[10px]">Products with short demo videos convert 2.4x higher on the storefront.</p>
              </div>
            )}
          </div>

          {/* 5. VARIANTS (SIZES, COLORS & STOCK) */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> 5. Sizes, Colors & Inventory
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

        {/* RIGHT COLUMN: Live Customer Preview & Publish Control (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
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

                  {/* Multiple Photos Indicator */}
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
