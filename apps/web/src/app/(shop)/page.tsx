'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Zap, Shield, Gift } from 'lucide-react';
import { ProductDto, CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          apiClient.get('/products/featured').catch(() => ({ data: [] })),
          apiClient.get('/categories').catch(() => []),
        ]);

        setFeaturedProducts(Array.isArray(productsRes) ? productsRes : productsRes.data || []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next-Generation E-Commerce Experience</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">Peak Performance</span> & Style
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
              Explore curated audio equipment, performance sportswear, and smart living essentials designed with relentless craftsmanship.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="rounded-full bg-indigo-500 hover:bg-indigo-600 font-semibold px-8">
                <Link href="/products">
                  Shop Collection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-white">
                <Link href="/products?categorySlug=electronics">
                  Explore Electronics
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Popular Categories</h2>
            <p className="text-sm text-muted-foreground">Browse through our specialized product domains</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((cat) => (
            <Link
              key={cat.id}
              href={`/products?categorySlug=${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border bg-card aspect-[16/9] flex items-end p-6 hover:shadow-lg transition-all"
            >
              <Image
                src={cat.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'}
                alt={cat.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 text-white space-y-1">
                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-1">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="container mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-r from-primary to-indigo-700 text-primary-foreground p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-full px-3 py-0.5 text-xs font-bold">
              <Gift className="w-3.5 h-3.5" /> Limited Launch Promotion
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Enjoy 20% Off Your First Order
            </h3>
            <p className="text-sm text-primary-foreground/90">
              Use promo code <span className="font-mono font-bold bg-white text-primary px-2 py-0.5 rounded">WELCOME20</span> at checkout on orders over ₹999.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="rounded-full font-bold px-8 shadow-md">
            <Link href="/products">
              Redeem Now
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trending Essentials</h2>
            <p className="text-sm text-muted-foreground">Hand-picked gear verified for highest durability and user rating</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            Browse All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-3 h-80 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-2xl bg-muted/20">
            <p className="text-sm text-muted-foreground">No featured products available at this time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
