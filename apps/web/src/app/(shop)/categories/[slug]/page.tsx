'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductDto, CategoryDto, PaginationMeta } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { ArrowLeft, ChevronRight, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CategoryProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [category, setCategory] = useState<CategoryDto | null>(null);
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const loadCategoryAndProducts = async () => {
      setIsLoading(true);
      try {
        const [catData, catList, prodData] = await Promise.all([
          apiClient.get<CategoryDto>(`/categories/${slug}`),
          apiClient.get<CategoryDto[]>('/categories').catch(() => []),
          apiClient.get<{ data: ProductDto[]; meta: PaginationMeta }>(`/products?categorySlug=${slug}`),
        ]);

        setCategory(catData);
        setAllCategories(Array.isArray(catList) ? catList : []);
        if (prodData && prodData.data) {
          setProducts(prodData.data);
          setMeta(prodData.meta);
        } else if (Array.isArray(prodData)) {
          setProducts(prodData);
        }
      } catch (err) {
        console.error('Failed to load category products', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategoryAndProducts();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-muted/40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">Category Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested category could not be located.</p>
        <Button onClick={() => router.push('/products')}>Browse All Products</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/products" className="hover:text-foreground">Catalog</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-foreground">{category.name}</span>
      </nav>

      {/* Category Header Banner */}
      <div className="rounded-3xl border bg-card p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>Category Collection</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              {category.description}
            </p>
          )}
          <p className="text-[11px] font-semibold text-muted-foreground pt-1">
            {meta?.total !== undefined ? `${meta.total} products in this collection` : ''}
          </p>
        </div>

        {/* Subcategories pills if any */}
        {category.children && category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 z-10">
            {category.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/categories/${sub.slug}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border bg-background hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid and Filters */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <FilterSidebar categories={allCategories} />

        <div className="flex-1 w-full">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border rounded-2xl bg-muted/10 space-y-3">
              <Search className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="text-base font-semibold">No products found in this category</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items have been published in this category yet. Check back soon!
              </p>
              <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Browse other categories</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
