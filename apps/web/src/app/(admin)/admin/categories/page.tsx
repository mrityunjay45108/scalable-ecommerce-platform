'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Edit2,
  Layers,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  RefreshCw,
  ExternalLink,
  PackagePlus,
  Eye,
  CheckCircle2,
  Tag,
  MapPin,
  FolderTree,
  ChevronRight,
} from 'lucide-react';
import { CategoryDto, ProductDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getRegionalHeritage,
  saveRegionalHeritageItem,
  deleteRegionalHeritageItem,
  resetRegionalHeritage,
  RegionalHeritageItem,
} from '@/lib/regional-heritage';

const CRAFT_PHOTO_PRESETS = [
  { label: 'Kashmiri Pashmina', url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800' },
  { label: 'Jaipuri Bandhani', url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800' },
  { label: 'Kanchipuram Silk', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800' },
  { label: 'Assam Tea & Weaves', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800' },
  { label: 'Varanasi Banarasi', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800' },
  { label: 'Madhubani Painting', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
];

function AdminCategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'taxonomies' ? 'taxonomies' : 'heritage';
  const [activeTab, setActiveTab] = useState<'heritage' | 'taxonomies'>(initialTab);

  // Store Taxonomies state
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [errorCatMsg, setErrorCatMsg] = useState('');

  // Regional Heritage state
  const [heritageItems, setHeritageItems] = useState<RegionalHeritageItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [editingHeritage, setEditingHeritage] = useState<RegionalHeritageItem | null>(null);
  const [showHeritageModal, setShowHeritageModal] = useState(false);
  const [heritageRegion, setHeritageRegion] = useState('');
  const [heritageTitle, setHeritageTitle] = useState('');
  const [heritageImage, setHeritageImage] = useState('');
  const [heritageHighlight, setHeritageHighlight] = useState('');
  const [heritageSlug, setHeritageSlug] = useState('');
  const [heritageSearchQuery, setHeritageSearchQuery] = useState('');
  const [heritageDesc, setHeritageDesc] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get('/categories/flat');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products/admin/all').catch(() => []);
      setAllProducts(res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
    }
  };

  const loadHeritage = () => {
    setHeritageItems(getRegionalHeritage());
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    loadHeritage();

    const handleUpdate = () => {
      loadHeritage();
    };
    window.addEventListener('regional-heritage-updated', handleUpdate);
    return () => window.removeEventListener('regional-heritage-updated', handleUpdate);
  }, []);

  // Update tab in URL
  const handleTabChange = (tab: 'heritage' | 'taxonomies') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/admin/categories?${params.toString()}`);
  };

  // REGIONAL HERITAGE ACTIONS
  const handleOpenCreateHeritage = () => {
    setEditingHeritage(null);
    setHeritageRegion('');
    setHeritageTitle('');
    setHeritageImage(CRAFT_PHOTO_PRESETS[0].url);
    setHeritageHighlight('');
    setHeritageSlug(categories[0]?.slug || 'apparel-fashion');
    setHeritageSearchQuery('');
    setHeritageDesc('');
    setShowHeritageModal(true);
  };

  const handleOpenEditHeritage = (item: RegionalHeritageItem) => {
    setEditingHeritage(item);
    setHeritageRegion(item.region);
    setHeritageTitle(item.title);
    setHeritageImage(item.image);
    setHeritageHighlight(item.highlight);
    setHeritageSlug(item.slug);
    setHeritageSearchQuery(item.searchQuery || '');
    setHeritageDesc(item.description || '');
    setShowHeritageModal(true);
  };

  const handleSaveHeritage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heritageRegion.trim() || !heritageTitle.trim() || !heritageImage.trim()) {
      alert('Please fill Region, Title and provide a Cover Photo.');
      return;
    }

    const newItem: RegionalHeritageItem = {
      id: editingHeritage?.id || `region-${Date.now()}`,
      region: heritageRegion.trim(),
      title: heritageTitle.trim(),
      image: heritageImage.trim(),
      highlight: heritageHighlight.trim() || 'Pan-India Crafts',
      slug: heritageSlug || 'apparel-fashion',
      searchQuery: heritageSearchQuery.trim() || heritageRegion.split(' ')[0],
      description: heritageDesc.trim() || undefined,
    };

    saveRegionalHeritageItem(newItem);
    setShowHeritageModal(false);
    setStatusFeedback(editingHeritage ? 'Heritage Collection Updated!' : 'New Regional Collection Created!');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const handleDeleteHeritage = (item: RegionalHeritageItem) => {
    if (!confirm(`Are you sure you want to delete the regional collection "${item.region}"?`)) return;
    deleteRegionalHeritageItem(item.id);
    setStatusFeedback(`Deleted "${item.region}"`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const handleResetHeritage = () => {
    if (!confirm('Reset all Virasat-e-Hind regional collections to original defaults (North, West, South, East India)?')) return;
    resetRegionalHeritage();
    setStatusFeedback('Reset to authentic Indian defaults.');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setHeritageImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Count products assigned to a region
  const getProductCountForRegion = (item: RegionalHeritageItem) => {
    const term = item.region.toLowerCase();
    const query = (item.searchQuery || '').toLowerCase();
    return allProducts.filter((p) => {
      const desc = (p.description || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      return desc.includes(term) || (query && (desc.includes(query) || title.includes(query)));
    }).length;
  };

  // STANDARD CATEGORY ACTIONS
  const handleOpenCreateCat = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setParentId('');
    setErrorCatMsg('');
    setShowCatModal(true);
  };

  const handleOpenEditCat = (cat: CategoryDto) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.imageUrl || '');
    setParentId(cat.parentId || '');
    setErrorCatMsg('');
    setShowCatModal(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCat(true);
    setErrorCatMsg('');
    try {
      const payload = {
        name,
        slug: slug || undefined,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        parentId: parentId || null,
      };

      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }

      setShowCatModal(false);
      await fetchCategories();
      setStatusFeedback(editingCategory ? 'Category Updated!' : 'Category Created!');
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err: any) {
      setErrorCatMsg(err.message || 'Failed to save category');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiClient.delete(`/categories/${id}`);
      await fetchCategories();
      setStatusFeedback('Category deleted.');
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Storefront Taxonomies & Indian Heritage Studio</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Category & Heritage Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage regional craft collections (Virasat-e-Hind), upload photos, and organize store navigation taxonomies
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-muted rounded-2xl border">
          <button
            onClick={() => handleTabChange('heritage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'heritage'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Virasat-e-Hind ({heritageItems.length})</span>
          </button>
          <button
            onClick={() => handleTabChange('taxonomies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'taxonomies'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderTree className="w-4 h-4 text-primary" />
            <span>Store Taxonomies ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* Success Status Alert */}
      {statusFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: VIRASAT-E-HIND REGIONAL HERITAGE COLLECTIONS */}
      {/* ============================================================ */}
      {activeTab === 'heritage' && (
        <div className="space-y-6">
          {/* Section Sub-Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <span>🏛️</span>
                <span>Virasat-e-Hind (विरासत-ए-हिंद) — Regional Craft Collections</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Featured on the storefront homepage under &ldquo;Treasures from Every Corner of India&rdquo;.
                Add new regions, replace cover photos, edit craft titles, and directly assign products to each region.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetHeritage}
                className="rounded-xl text-xs font-bold gap-1.5"
                title="Restore original 4 Indian regions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateHeritage}
                className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Regional Collection</span>
              </Button>
            </div>
          </div>

          {/* Regional Heritage Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {heritageItems.map((item) => {
              const count = getProductCountForRegion(item);
              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      {/* Region Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                          {item.region}
                        </span>
                      </div>

                      {/* Quick Photo Change Shortcut */}
                      <button
                        onClick={() => handleOpenEditHeritage(item)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-[10px] font-bold flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                        title="Change Photo"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Edit Photo</span>
                      </button>

                      {/* Craft Title on Image */}
                      <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                        <h3 className="text-sm font-black leading-snug line-clamp-2 drop-shadow">
                          {item.title}
                        </h3>
                        <p className="text-[10px] text-amber-200 font-medium truncate drop-shadow">
                          📍 {item.highlight}
                        </p>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b pb-2.5">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" />
                          <span>Category:</span>
                        </span>
                        <strong className="font-mono text-foreground">{item.slug}</strong>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Assigned Products:</span>
                        <Badge
                          variant={count > 0 ? 'default' : 'secondary'}
                          className="font-bold text-[10px]"
                        >
                          {count} Products
                        </Badge>
                      </div>

                      {item.searchQuery && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Search Keyword:</span>
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {item.searchQuery}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-4 pt-0 space-y-2">
                    {/* PRIMARY ACTION: Add Product to this Region */}
                    <Button
                      asChild
                      className="w-full rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
                    >
                      <Link
                        href={`/admin/products/create?region=${encodeURIComponent(item.region)}&categorySlug=${item.slug}`}
                      >
                        <PackagePlus className="w-4 h-4" />
                        <span>+ Add Product to this Region</span>
                      </Link>
                    </Button>

                    {/* Secondary Control Row */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleOpenEditHeritage(item)}
                        className="p-2 rounded-xl border bg-muted/30 hover:bg-muted text-foreground text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Edit Details & Photo"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <Link
                        href={`/products?categorySlug=${item.slug}&search=${encodeURIComponent(item.searchQuery || item.region.split(' ')[0])}`}
                        target="_blank"
                        className="p-2 rounded-xl border bg-muted/30 hover:bg-muted text-foreground text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="View on Customer Storefront"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Catalog</span>
                      </Link>

                      <button
                        onClick={() => handleDeleteHeritage(item)}
                        className="p-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 text-destructive text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Delete Region"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: STORE TAXONOMIES (Standard Categories CRUD) */}
      {/* ============================================================ */}
      {activeTab === 'taxonomies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-muted/40 border">
            <div>
              <h2 className="text-lg font-bold text-foreground">Catalog Taxonomy Tree</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage category navigation hierarchy, URL slugs, and banner images for department pages
              </p>
            </div>
            <Button onClick={handleOpenCreateCat} className="rounded-2xl gap-2 font-bold shadow-md">
              <Plus className="w-4 h-4" /> Create Category
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-5 rounded-3xl border bg-card shadow-sm space-y-3 relative flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCat(cat)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCat(cat.id)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {cat.description || 'No description provided'}
                  </p>
                  {cat.parent && (
                    <p className="text-[10px] text-primary font-semibold mt-2">
                      Parent: {cat.parent.name}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t text-[11px] text-muted-foreground flex justify-between items-center">
                  <span>
                    Slug: <strong className="font-mono text-foreground">{cat.slug}</strong>
                  </span>
                  <span className="font-semibold">{cat.productsCount || 0} products</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT REGIONAL HERITAGE COLLECTION */}
      {/* ============================================================ */}
      {showHeritageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl border p-6 max-w-lg w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="text-lg font-bold">
                    {editingHeritage ? 'Edit Regional Heritage Collection' : 'Create Regional Heritage Collection'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Customize titles, state crafts, and upload high-res cover photos
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveHeritage} className="space-y-4 text-xs">
              {/* Region Label (English & Hindi) */}
              <div>
                <label className="font-bold block mb-1">
                  Region Name & Hindi Badge *
                </label>
                <input
                  required
                  value={heritageRegion}
                  onChange={(e) => setHeritageRegion(e.target.value)}
                  placeholder="e.g. Central India (मध्य भारत) or North-East India (पूर्वोत्तर भारत)"
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                />
              </div>

              {/* Craft Title */}
              <div>
                <label className="font-bold block mb-1">
                  Signature Craft Showcase Title *
                </label>
                <input
                  required
                  value={heritageTitle}
                  onChange={(e) => setHeritageTitle(e.target.value)}
                  placeholder="e.g. Chanderi Silk & Dhokra Tribal Brass Art"
                  className="w-full h-10 px-3 rounded-xl border bg-background font-semibold"
                />
              </div>

              {/* State Highlights */}
              <div>
                <label className="font-bold block mb-1">
                  States & Highlights *
                </label>
                <input
                  required
                  value={heritageHighlight}
                  onChange={(e) => setHeritageHighlight(e.target.value)}
                  placeholder="e.g. Madhya Pradesh, Chhattisgarh & Vidarbha"
                  className="w-full h-10 px-3 rounded-xl border bg-background"
                />
              </div>

              {/* COVER PHOTO & UPLOAD STUDIO */}
              <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Regional Cover Photo *</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">URL or Local Upload</span>
                </div>

                {/* Direct Image URL */}
                <input
                  required
                  value={heritageImage}
                  onChange={(e) => setHeritageImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-[11px]"
                />

                {/* Upload from Computer */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl text-xs font-bold gap-1.5 w-full h-9"
                  >
                    <UploadCloud className="w-4 h-4 text-primary" />
                    <span>Upload Photo from Computer</span>
                  </Button>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block mb-1.5">
                    Or select an Indian Craft preset photo:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CRAFT_PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setHeritageImage(preset.url)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          heritageImage === preset.url
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                            : 'bg-background hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                {heritageImage && (
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border">
                    <Image
                      src={heritageImage}
                      alt="Preview"
                      fill
                      className="object-cover object-center"
                    />
                    <span className="absolute bottom-1 right-2 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                      Live Photo Preview
                    </span>
                  </div>
                )}
              </div>

              {/* Linked Store Category & Search Keyword */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Target Catalog Category</label>
                  <select
                    value={heritageSlug}
                    onChange={(e) => setHeritageSlug(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Search Term Keyword</label>
                  <input
                    value={heritageSearchQuery}
                    onChange={(e) => setHeritageSearchQuery(e.target.value)}
                    placeholder="e.g. Silk, Kashmir, Brass"
                    className="w-full h-10 px-3 rounded-xl border bg-background font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowHeritageModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {editingHeritage ? 'Update Collection' : 'Create Collection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT STANDARD STORE CATEGORY */}
      {/* ============================================================ */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>

            {errorCatMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorCatMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCat} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Category Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory && !slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border bg-background font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Slug (Optional)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. audio-headphones"
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Parent Category (Optional)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Banner Image URL (Optional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-9 px-3 rounded-xl border bg-background font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCatModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingCat}>
                  {isSavingCat ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Categories & Heritage Studio...</div>}>
      <AdminCategoriesContent />
    </Suspense>
  );
}
