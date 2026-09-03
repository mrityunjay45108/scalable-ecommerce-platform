'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Filter, RotateCcw, Tag } from 'lucide-react';
import { Button } from '../ui/button';

interface FilterSidebarProps {
  categories: Array<{ id: string; name: string; slug: string; _count?: { products: number } }>;
}

export function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('categorySlug') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentRating = searchParams.get('rating') || '';
  const currentDiscount = searchParams.get('discount') || '';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';

  const [minPriceInput, setMinPriceInput] = useState(currentMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(currentMaxPrice);

  useEffect(() => {
    setMinPriceInput(currentMinPrice);
  }, [currentMinPrice]);

  useEffect(() => {
    setMaxPriceInput(currentMaxPrice);
  }, [currentMaxPrice]);

  const updateFilter = (key: string, value: string | boolean | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '' || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
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
    router.push(`/products?${params.toString()}`);
  };

  const handlePricePreset = (min: string, max: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set('minPrice', min);
    else params.delete('minPrice');
    if (max) params.set('maxPrice', max);
    else params.delete('maxPrice');
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  };

  const handleReset = () => {
    router.push('/products');
  };

  return (
    <aside className="w-full lg:w-64 space-y-6 rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-1.5 font-black text-sm uppercase tracking-wider">
          <Filter className="w-4 h-4 text-primary" />
          <span>FILTERS</span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-rose-600 hover:underline font-extrabold flex items-center gap-1 uppercase tracking-wide"
        >
          <RotateCcw className="w-3 h-3" /> CLEAR ALL
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Categories
        </h4>
        <div className="space-y-1 text-sm max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => updateFilter('categorySlug', null)}
            className={`block w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              !currentCategory ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateFilter('categorySlug', cat.slug)}
              className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                currentCategory === cat.slug
                  ? 'bg-primary/10 text-primary font-black'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{cat.name}</span>
              {cat._count?.products !== undefined && (
                <span className="text-[10px] opacity-70 font-mono">({cat._count.products})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Presets & Range */}
      <div className="space-y-2.5 pt-3 border-t">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Price Range (₹)
        </h4>

        {/* Quick Presets */}
        <div className="space-y-1 text-xs">
          {[
            { label: 'Under ₹500', min: '', max: '500' },
            { label: '₹500 - ₹1,000', min: '500', max: '1000' },
            { label: '₹1,000 - ₹2,500', min: '1000', max: '2500' },
            { label: '₹2,500 & Above', min: '2500', max: '' },
          ].map((tier, idx) => {
            const isActive = currentMinPrice === tier.min && currentMaxPrice === tier.max;
            return (
              <button
                key={idx}
                onClick={() => (isActive ? handlePricePreset('', '') : handlePricePreset(tier.min, tier.max))}
                className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-xl transition-colors font-medium ${
                  isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tier.label}</span>
                {isActive && <span className="text-primary font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max Input Form */}
        <form onSubmit={handleApplyPrice} className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="₹ Min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-xl border bg-background font-mono focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="₹ Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-xl border bg-background font-mono focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="w-full rounded-xl text-xs font-bold h-7">
            Apply Custom Price
          </Button>
        </form>
      </div>

      {/* Myntra Discount Filter */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-orange-500" /> Discount Range
        </h4>
        <div className="space-y-1 text-xs">
          {[
            { label: '10% and above', val: '10' },
            { label: '30% and above', val: '30' },
            { label: '50% and above', val: '50' },
            { label: '70% and above', val: '70' },
          ].map((d) => {
            const isSelected = currentDiscount === d.val;
            return (
              <button
                key={d.val}
                onClick={() => updateFilter('discount', isSelected ? null : d.val)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl transition-colors font-medium ${
                  isSelected ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{d.label}</span>
                {isSelected && <span className="font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer Rating */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Customer Rating
        </h4>
        <div className="space-y-1">
          {[4, 3, 2].map((stars) => (
            <button
              key={stars}
              onClick={() => updateFilter('rating', currentRating === String(stars) ? null : String(stars))}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                currentRating === String(stars) ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < stars ? 'fill-current' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold">& Up</span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="pt-3 border-t">
        <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateFilter('inStockOnly', e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
          />
          <span className="font-bold text-foreground">In Stock Only</span>
        </label>
      </div>
    </aside>
  );
}
