'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ProductDto, CategoryDto, PaginationMeta } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Debounced search term
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const currentSort = searchParams.get('sortBy') || 'createdAt';
  const currentOrder = searchParams.get('sortOrder') || 'desc';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentCategory = searchParams.get('categorySlug') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentRating = searchParams.get('rating') || '';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';

  // Synchronize local search with URL param
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounce search input to URL query
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentParam = searchParams.get('search') || '';
      if (searchTerm !== currentParam) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        } else {
          params.delete('search');
        }
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, pathname, router, searchParams]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        apiClient.get(`/products?${searchParams.toString()}`),
        apiClient.get('/categories').catch(() => []),
      ]);

      if (productsRes && productsRes.data) {
        setProducts(productsRes.data);
        setMeta(productsRes.meta);
      } else if (Array.isArray(productsRes)) {
        setProducts(productsRes);
      }

      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
    } catch (err) {
      console.error('Failed to load products', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [searchParams]);

  const handleSortChange = (value: string) => {
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
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    router.push('/products');
  };

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    if (key === 'search') setSearchTerm('');
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    initialSearch || currentCategory || currentMinPrice || currentMaxPrice || currentRating || inStockOnly,
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header, Search & Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
            Product Catalog
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {meta?.total !== undefined ? `Showing ${products.length} of ${meta.total} styles` : 'Browse all styles'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Debounced Search Bar */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              placeholder="Search by brand, style, color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border bg-card focus:ring-1 focus:ring-primary shadow-xs"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={
                currentSort === 'price'
                  ? currentOrder === 'asc'
                    ? 'price_asc'
                    : 'price_desc'
                  : currentSort === 'popularity'
                  ? 'popularity'
                  : currentSort === 'rating'
                  ? 'rating'
                  : 'newest'
              }
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Sort products"
              className="h-9 px-3 rounded-xl border bg-card text-xs font-bold focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
            >
              <option value="newest">Sort by: Recommended</option>
              <option value="popularity">Sort by: Popularity</option>
              <option value="price_asc">Sort by: Price (Low to High)</option>
              <option value="price_desc">Sort by: Price (High to Low)</option>
              <option value="rating">Sort by: Customer Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-muted-foreground">Active Filters:</span>
          {initialSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Search: "{initialSearch}"
              <button onClick={() => removeFilter('search')} className="hover:text-primary/70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {currentCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Category: {currentCategory}
              <button onClick={() => removeFilter('categorySlug')} className="hover:text-primary/70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
              Price: ₹{currentMinPrice || '0'} - ₹{currentMaxPrice || '∞'}
              <button onClick={() => { removeFilter('minPrice'); removeFilter('maxPrice'); }} className="hover:text-primary/70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {currentRating && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Rating: {currentRating}★+
              <button onClick={() => removeFilter('rating')} className="hover:text-primary/70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              In Stock Only
              <button onClick={() => removeFilter('inStockOnly')} className="hover:text-primary/70"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-xs text-rose-600 font-black hover:underline ml-2 uppercase tracking-wide"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Filter */}
        <FilterSidebar categories={categories} />

        {/* Product Grid & Pagination */}
        <div className="flex-1 w-full space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl border bg-card p-4 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : hasError ? (
            <div className="text-center py-20 border rounded-3xl bg-destructive/5 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
              <h3 className="text-base font-bold">Failed to load products</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                An error occurred while fetching the product catalog. Please try again.
              </p>
              <Button onClick={fetchCatalog} size="sm" variant="outline" className="gap-1.5 rounded-xl font-bold">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded-xl gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            pageNum === currentPage
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= meta.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="rounded-xl gap-1 text-xs"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-4">
              <Search className="w-8 h-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold">No products found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We couldn't find any products matching your selected search or filter criteria.
                </p>
              </div>
              <Button onClick={handleClearFilters} size="sm" className="rounded-xl font-bold">
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8">Loading catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
