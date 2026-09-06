'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Star,
  Filter,
  RotateCcw,
  Tag,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';

interface FilterSidebarProps {
  categories: Array<{ id: string; name: string; slug: string; _count?: { products: number } }>;
}

const POPULAR_BRANDS = [
  'SWADESH Luxe',
  'Fabindia',
  'Roadster',
  'Kalki Fashion',
  'Khadi India',
  'Biba',
  'TATA Taneira',
  'Boat',
  'Noise',
  'Forest Essentials',
];

const PRICE_TIERS = [
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 to ₹1,000', min: '500', max: '1000' },
  { label: '₹1,000 to ₹2,500', min: '1000', max: '2500' },
  { label: '₹2,500 to ₹5,000', min: '2500', max: '5000' },
  { label: '₹5,000 & Above', min: '5000', max: '' },
];

const DISCOUNT_RANGES = [
  { label: '10% and above', val: '10' },
  { label: '20% and above', val: '20' },
  { label: '30% and above', val: '30' },
  { label: '40% and above', val: '40' },
  { label: '50% and above', val: '50' },
  { label: '70% and above', val: '70' },
];

const REGIONAL_CRAFTS = [
  { label: 'North India (Pashmina & Brass)', query: 'North' },
  { label: 'West India (Bandhani & Mirrorwork)', query: 'West' },
  { label: 'South India (Kanchipuram Silk)', query: 'South' },
  { label: 'East India (Tussar & Madhubani)', query: 'East' },
];

export function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentCategory = searchParams.get('categorySlug') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentRating = searchParams.get('rating') || '';
  const currentDiscount = searchParams.get('discount') || '';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const currentSort = searchParams.get('sortBy') || 'createdAt';
  const currentOrder = searchParams.get('sortOrder') || 'desc';

  // Local filter states
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);

  // Mobile Filter & Sort Drawer states
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'category' | 'brand' | 'price' | 'discount' | 'craft' | 'rating'>('category');

  useEffect(() => {
    setMinPriceInput(currentMinPrice);
  }, [currentMinPrice]);

  useEffect(() => {
    setMaxPriceInput(currentMaxPrice);
  }, [currentMaxPrice]);

  // Count of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count++;
    if (currentSearch) count++;
    if (currentMinPrice || currentMaxPrice) count++;
    if (currentDiscount) count++;
    if (currentRating) count++;
    if (inStockOnly) count++;
    return count;
  }, [currentCategory, currentSearch, currentMinPrice, currentMaxPrice, currentDiscount, currentRating, inStockOnly]);

  const updateFilter = (key: string, value: string | boolean | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '' || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPriceInput.trim()) {
      params.set('minPrice', minPriceInput.trim());
    } else {
      params.delete('minPrice');
    }
    if (maxPriceInput.trim()) {
      params.set('maxPrice', maxPriceInput.trim());
    } else {
      params.delete('maxPrice');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePricePreset = (min: string, max: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set('minPrice', min);
    else params.delete('minPrice');
    if (max) params.set('maxPrice', max);
    else params.delete('maxPrice');
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'price_asc') {
      params.set('sortBy', 'price');
      params.set('sortOrder', 'asc');
    } else if (value === 'price_desc') {
      params.set('sortBy', 'price');
      params.set('sortOrder', 'desc');
    } else if (value === 'popularity') {
      params.set('sortBy', 'popularity');
      params.set('sortOrder', 'desc');
    } else if (value === 'rating') {
      params.set('sortBy', 'rating');
      params.set('sortOrder', 'desc');
    } else {
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    setIsMobileSortOpen(false);
  };

  const handleReset = () => {
    router.push('/products');
    setIsMobileFilterOpen(false);
  };

  // Filtered categories and brands by internal search
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const filteredBrands = POPULAR_BRANDS.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  return (
    <>
      {/* ======================================================== */}
      {/* 1. CLASSY MYNTRA DESKTOP SIDEBAR (Visible on lg screens) */}
      {/* ======================================================== */}
      <aside className="hidden lg:block w-64 rounded-md border border-border/60 bg-card p-4 space-y-5 flex-shrink-0 shadow-xs">
        {/* Header: FILTERS & CLEAR ALL */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-widest text-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            <span>FILTERS</span>
            {activeFilterCount > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-rose-600 hover:text-rose-700 font-extrabold uppercase tracking-wide cursor-pointer transition-colors"
            >
              CLEAR ALL
            </button>
          )}
        </div>

        {/* 1. CATEGORIES (with Search & Custom Checkboxes) */}
        <div className="space-y-2.5">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Categories
          </h4>
          {categories.length > 6 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 text-[11px] rounded border bg-muted/30 focus:ring-1 focus:ring-primary"
              />
              <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-2" />
            </div>
          )}
          <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
            <label className="flex items-center gap-2.5 cursor-pointer py-0.5 group">
              <input
                type="radio"
                name="category-desktop"
                checked={!currentCategory}
                onChange={() => updateFilter('categorySlug', null)}
                className="h-3.5 w-3.5 text-rose-600 focus:ring-rose-500"
              />
              <span className={`text-xs ${!currentCategory ? 'font-black text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                All Categories
              </span>
            </label>
            {filteredCategories.map((cat) => {
              const isChecked = currentCategory === cat.slug;
              return (
                <label key={cat.id} className="flex items-center justify-between cursor-pointer py-0.5 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="radio"
                      name="category-desktop"
                      checked={isChecked}
                      onChange={() => updateFilter('categorySlug', isChecked ? null : cat.slug)}
                      className="h-3.5 w-3.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span className={`text-xs truncate ${isChecked ? 'font-black text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {cat.name}
                    </span>
                  </div>
                  {cat._count?.products !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-mono">({cat._count.products})</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. BRAND (Classy Myntra Style) */}
        <div className="space-y-2.5 pt-4 border-t">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Brand
          </h4>
          <div className="space-y-1.5 text-xs max-h-44 overflow-y-auto pr-1">
            {filteredBrands.map((bName) => {
              const isChecked = currentSearch.toLowerCase() === bName.toLowerCase();
              return (
                <label key={bName} className="flex items-center gap-2.5 cursor-pointer py-0.5 group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => updateFilter('search', isChecked ? null : bName)}
                    className="h-3.5 w-3.5 rounded-xs text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className={`text-xs truncate ${isChecked ? 'font-black text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {bName}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 3. PRICE (Checkbox Brackets + Custom Input) */}
        <div className="space-y-2.5 pt-4 border-t">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Price (₹)
          </h4>
          <div className="space-y-1.5 text-xs">
            {PRICE_TIERS.map((tier, idx) => {
              const isChecked = currentMinPrice === tier.min && currentMaxPrice === tier.max;
              return (
                <label key={idx} className="flex items-center justify-between cursor-pointer py-0.5 group">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => (isChecked ? handlePricePreset('', '') : handlePricePreset(tier.min, tier.max))}
                      className="h-3.5 w-3.5 rounded-xs text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className={`text-xs ${isChecked ? 'font-black text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {tier.label}
                    </span>
                  </div>
                  {isChecked && <span className="text-[10px] font-bold text-rose-600">✓</span>}
                </label>
              );
            })}
          </div>

          {/* Custom Min / Max Inputs */}
          <form onSubmit={handleApplyPrice} className="space-y-1.5 pt-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                placeholder="₹ Min"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                className="w-full h-7 px-2 text-[11px] rounded border bg-background font-mono focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground text-xs font-bold">-</span>
              <input
                type="number"
                min="0"
                placeholder="₹ Max"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                className="w-full h-7 px-2 text-[11px] rounded border bg-background font-mono focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full h-6 rounded text-[10px] font-bold uppercase tracking-wider border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
            >
              Apply Price
            </button>
          </form>
        </div>

        {/* 4. DISCOUNT RANGE (Exact Myntra Radio Format) */}
        <div className="space-y-2.5 pt-4 border-t">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1">
            <Tag className="w-3 h-3 text-orange-500" />
            <span>Discount Range</span>
          </h4>
          <div className="space-y-1.5 text-xs">
            {DISCOUNT_RANGES.map((d) => {
              const isChecked = currentDiscount === d.val;
              return (
                <label key={d.val} className="flex items-center gap-2.5 cursor-pointer py-0.5 group">
                  <input
                    type="radio"
                    name="discount-range-desktop"
                    checked={isChecked}
                    onChange={() => updateFilter('discount', isChecked ? null : d.val)}
                    className="h-3.5 w-3.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span className={`text-xs ${isChecked ? 'font-black text-orange-600 dark:text-orange-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {d.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 5. VIRASAT-E-HIND REGIONAL CRAFTS */}
        <div className="space-y-2.5 pt-4 border-t">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <span>🏛️</span>
            <span>Virasat-e-Hind Crafts</span>
          </h4>
          <div className="space-y-1.5 text-xs">
            {REGIONAL_CRAFTS.map((reg) => {
              const isChecked = currentSearch.toLowerCase() === reg.query.toLowerCase();
              return (
                <label key={reg.query} className="flex items-center gap-2.5 cursor-pointer py-0.5 group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => updateFilter('search', isChecked ? null : reg.query)}
                    className="h-3.5 w-3.5 rounded-xs text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className={`text-xs ${isChecked ? 'font-black text-amber-800 dark:text-amber-300' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {reg.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 6. CUSTOMER RATING */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Customer Rating
          </h4>
          <div className="space-y-1.5">
            {[4, 3, 2].map((stars) => {
              const isChecked = currentRating === String(stars);
              return (
                <label key={stars} className="flex items-center justify-between cursor-pointer py-0.5 group">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="rating-desktop"
                      checked={isChecked}
                      onChange={() => updateFilter('rating', isChecked ? null : String(stars))}
                      className="h-3.5 w-3.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < stars ? 'fill-current' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={`text-[11px] ${isChecked ? 'font-black text-foreground' : 'text-muted-foreground'}`}>
                    {stars}★ & Up
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 7. IN STOCK ONLY */}
        <div className="pt-3 border-t">
          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => updateFilter('inStockOnly', e.target.checked)}
              className="h-3.5 w-3.5 rounded-xs text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span className="font-black text-foreground text-xs">In Stock Only</span>
          </label>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. ICONIC MYNTRA MOBILE STICKY BOTTOM BAR (< lg screens) */}
      {/* ======================================================== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-border shadow-2xl flex items-center h-12">
        {/* Left Half: SORT */}
        <button
          onClick={() => setIsMobileSortOpen(true)}
          className="flex-1 h-full flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-foreground hover:bg-muted/40 transition-colors border-r"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <span>SORT</span>
        </button>

        {/* Right Half: FILTER */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex-1 h-full flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-foreground hover:bg-muted/40 transition-colors relative"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span>FILTER</span>
          {activeFilterCount > 0 && (
            <span className="h-4 px-1.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. MYNTRA MOBILE 2-COLUMN FULL-SCREEN FILTER DRAWER */}
      {/* ======================================================== */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 h-12 border-b bg-card">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wider text-foreground">FILTERS</span>
              {activeFilterCount > 0 && (
                <span className="h-5 px-2 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="p-1.5 rounded-full hover:bg-muted text-foreground"
              aria-label="Close Filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Column Filter Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Tabs Column (35% Width) */}
            <div className="w-[36%] bg-muted/40 border-r overflow-y-auto divide-y divide-border/50 text-xs">
              {[
                { id: 'category', label: 'Categories', hasActive: Boolean(currentCategory) },
                { id: 'brand', label: 'Brand', hasActive: Boolean(currentSearch && POPULAR_BRANDS.some((b) => b.toLowerCase() === currentSearch.toLowerCase())) },
                { id: 'price', label: 'Price', hasActive: Boolean(currentMinPrice || currentMaxPrice) },
                { id: 'discount', label: 'Discount', hasActive: Boolean(currentDiscount) },
                { id: 'craft', label: 'Virasat Craft', hasActive: Boolean(currentSearch && REGIONAL_CRAFTS.some((r) => r.query.toLowerCase() === currentSearch.toLowerCase())) },
                { id: 'rating', label: 'Rating', hasActive: Boolean(currentRating) },
              ].map((tab) => {
                const isSelected = mobileActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMobileActiveTab(tab.id as any)}
                    className={`w-full p-3.5 text-left font-bold transition-all relative flex items-center justify-between ${
                      isSelected
                        ? 'bg-background text-foreground font-black border-l-4 border-rose-600'
                        : 'text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    {tab.hasActive && (
                      <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Options Column (65% Width) */}
            <div className="flex-1 p-4 overflow-y-auto bg-background space-y-3">
              {/* Category Tab */}
              {mobileActiveTab === 'category' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="radio"
                      name="mobile-cat"
                      checked={!currentCategory}
                      onChange={() => updateFilter('categorySlug', null)}
                      className="h-4 w-4 text-rose-600"
                    />
                    <span className="text-xs font-bold text-foreground">All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center justify-between py-1 cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="mobile-cat"
                          checked={currentCategory === cat.slug}
                          onChange={() => updateFilter('categorySlug', cat.slug)}
                          className="h-4 w-4 text-rose-600"
                        />
                        <span className="text-xs text-foreground truncate">{cat.name}</span>
                      </div>
                      {cat._count?.products !== undefined && (
                        <span className="text-[10px] text-muted-foreground">({cat._count.products})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Brand Tab */}
              {mobileActiveTab === 'brand' && (
                <div className="space-y-2">
                  {POPULAR_BRANDS.map((bName) => {
                    const isChecked = currentSearch.toLowerCase() === bName.toLowerCase();
                    return (
                      <label key={bName} className="flex items-center gap-3 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => updateFilter('search', isChecked ? null : bName)}
                          className="h-4 w-4 text-rose-600 rounded-xs"
                        />
                        <span className="text-xs text-foreground">{bName}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Price Tab */}
              {mobileActiveTab === 'price' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {PRICE_TIERS.map((tier, idx) => {
                      const isChecked = currentMinPrice === tier.min && currentMaxPrice === tier.max;
                      return (
                        <label key={idx} className="flex items-center gap-3 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => (isChecked ? handlePricePreset('', '') : handlePricePreset(tier.min, tier.max))}
                            className="h-4 w-4 text-rose-600 rounded-xs"
                          />
                          <span className="text-xs text-foreground">{tier.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Discount Tab */}
              {mobileActiveTab === 'discount' && (
                <div className="space-y-2">
                  {DISCOUNT_RANGES.map((d) => (
                    <label key={d.val} className="flex items-center gap-3 py-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mobile-discount"
                        checked={currentDiscount === d.val}
                        onChange={() => updateFilter('discount', currentDiscount === d.val ? null : d.val)}
                        className="h-4 w-4 text-rose-600"
                      />
                      <span className="text-xs text-foreground">{d.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Virasat Craft Tab */}
              {mobileActiveTab === 'craft' && (
                <div className="space-y-2">
                  {REGIONAL_CRAFTS.map((reg) => {
                    const isChecked = currentSearch.toLowerCase() === reg.query.toLowerCase();
                    return (
                      <label key={reg.query} className="flex items-center gap-3 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => updateFilter('search', isChecked ? null : reg.query)}
                          className="h-4 w-4 text-amber-600 rounded-xs"
                        />
                        <span className="text-xs text-foreground">{reg.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Rating Tab */}
              {mobileActiveTab === 'rating' && (
                <div className="space-y-2">
                  {[4, 3, 2].map((stars) => (
                    <label key={stars} className="flex items-center gap-3 py-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mobile-rating"
                        checked={currentRating === String(stars)}
                        onChange={() => updateFilter('rating', currentRating === String(stars) ? null : String(stars))}
                        className="h-4 w-4 text-rose-600"
                      />
                      <span className="text-xs text-foreground">{stars}★ & Above</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Strip: CLEAR ALL & APPLY */}
          <div className="h-14 border-t bg-card px-4 flex items-center justify-between gap-4">
            <button
              onClick={handleReset}
              className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              CLEAR ALL
            </button>
            <Button
              onClick={() => setIsMobileFilterOpen(false)}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider h-10 rounded-lg shadow-md"
            >
              APPLY FILTERS
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MYNTRA MOBILE SLIDE-UP SORT SHEET */}
      {/* ======================================================== */}
      {isMobileSortOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end animate-in fade-in duration-200">
          <div className="w-full bg-card rounded-t-3xl border-t p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-black text-sm uppercase tracking-wider text-foreground">
                SORT BY
              </span>
              <button onClick={() => setIsMobileSortOpen(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { val: 'newest', label: 'Recommended' },
                { val: 'newest', label: "What's New" },
                { val: 'popularity', label: 'Popularity' },
                { val: 'price_asc', label: 'Price: Low to High' },
                { val: 'price_desc', label: 'Price: High to Low' },
                { val: 'rating', label: 'Customer Rating' },
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSortSelect(opt.val)}
                  className="w-full py-2.5 text-left text-xs font-bold text-foreground flex items-center justify-between hover:text-rose-600 transition-colors"
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
