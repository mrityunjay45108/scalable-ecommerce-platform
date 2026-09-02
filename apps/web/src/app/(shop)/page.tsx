'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Copy,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProductDto, CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface HeroProduct {
  title: string;
  category: string;
  price: number;
  comparePrice: number;
  imageUrl: string;
  slug: string;
}

const HERO_ITEMS: HeroProduct[] = [
  {
    title: 'Apex Velocity Carbon Running Shoes',
    category: 'Footwear & Athletic',
    price: 2999,
    comparePrice: 4999,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000',
    slug: 'apex-velocity-carbon-running-shoes',
  },
  {
    title: 'Aura Pro Wireless ANC Headphones',
    category: 'Studio Audio',
    price: 3499,
    comparePrice: 5999,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000',
    slug: 'aura-pro-wireless-headphones',
  },
  {
    title: '450 GSM Heavyweight Oversized Hoodie',
    category: 'Streetwear Apparel',
    price: 1899,
    comparePrice: 2999,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000',
    slug: '450-gsm-heavyweight-oversized-hoodie',
  },
];

const CURATED_CATEGORIES: CategoryDto[] = [
  {
    id: 'cat-apparel',
    name: 'Apparel & Fashion',
    slug: 'apparel-fashion',
    description: 'Contemporary streetwear, oversized hoodies, and urban essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
  },
  {
    id: 'cat-electronics',
    name: 'Studio Electronics & Audio',
    slug: 'electronics',
    description: 'Studio monitors, ANC headphones, and precision wireless acoustics.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  },
  {
    id: 'cat-footwear',
    name: 'Footwear & Running',
    slug: 'footwear',
    description: 'Carbon-plated running shoes, urban sneakers, and trail runners.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
  },
  {
    id: 'cat-home',
    name: 'Home & Ergonomics',
    slug: 'home-living',
    description: 'Minimalist desk decor, smart ambient lighting, and aesthetic furniture.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
  },
  {
    id: 'cat-wearables',
    name: 'Smart Watches & Gear',
    slug: 'electronics',
    description: 'Titanium AMOLED smartwatches and biometric fitness trackers.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  },
  {
    id: 'cat-accessories',
    name: 'Bags & Accessories',
    slug: 'apparel-fashion',
    description: 'Cordura backpacks, leather wallets, and everyday travel gear.',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'featured' | string>('all');
  const [categories, setCategories] = useState<CategoryDto[]>(CURATED_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Auto-Sliding Category Carousel
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isCategoryHovered, setIsCategoryHovered] = useState(false);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const container = categoryScrollRef.current;
    const scrollAmount = 340;
    if (direction === 'left') {
      if (container.scrollLeft <= 15) {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    } else {
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 15) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Continuous smooth auto-slide every 3.2 seconds
  useEffect(() => {
    if (isCategoryHovered) return;
    const interval = setInterval(() => {
      scrollCategories('right');
    }, 3200);
    return () => clearInterval(interval);
  }, [isCategoryHovered]);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [featuredRes, allProdRes, categoriesRes] = await Promise.all([
          apiClient.get('/products/featured').catch(() => ({ data: [] })),
          apiClient.get('/products?limit=50').catch(() => ({ data: [] })),
          apiClient.get('/categories').catch(() => []),
        ]);

        const fList = Array.isArray(featuredRes) ? featuredRes : featuredRes.data || [];
        const aList = Array.isArray(allProdRes) ? allProdRes : allProdRes.data || [];
        setFeaturedProducts(fList);
        setAllProducts(aList.length > 0 ? aList : fList);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      } catch {
        // graceful fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Compute products shown in the catalog section based on tab
  const displayedProducts = React.useMemo(() => {
    if (activeCatalogTab === 'featured') {
      const feat = allProducts.filter((p) => p.isFeatured);
      return feat.length > 0 ? feat : featuredProducts;
    }
    if (activeCatalogTab === 'all') {
      return allProducts;
    }
    return allProducts.filter(
      (p) => p.categoryId === activeCatalogTab || p.category?.slug === activeCatalogTab,
    );
  }, [activeCatalogTab, allProducts, featuredProducts]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText('WELCOME20');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitted(true);
    setNewsletterEmail('');
    setTimeout(() => setNewsletterSubmitted(false), 4000);
  };

  // Dynamically populate from real Admin-featured products / deals if available
  const heroProducts: HeroProduct[] =
    featuredProducts.length > 0
      ? featuredProducts.slice(0, 4).map((p) => ({
          title: p.title,
          category: p.category?.name || 'Featured Drop',
          price: p.basePrice,
          comparePrice: p.comparePrice || Math.round(p.basePrice * 1.4),
          imageUrl:
            p.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000',
          slug: p.slug,
        }))
      : HERO_ITEMS;

  const currentHero = heroProducts[selectedHeroIndex % heroProducts.length] || heroProducts[0] || HERO_ITEMS[0];

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      {/* 1. CLEAN & ELEGANT HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-950 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-4 border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="container mx-auto px-6 sm:px-10 py-12 sm:py-16 lg:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Headline & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>New Season Collection 2026</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
                Engineered for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300">
                  Comfort & Performance
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed font-normal">
                Discover a curated collection of studio acoustics, athletic footwear, and luxury streetwear crafted with precision.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Button asChild size="lg" className="rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold px-7 text-sm">
                  <Link href="/products">
                    Shop Collection
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white font-medium px-6 text-sm">
                  <Link href={`/products/${currentHero.slug}`}>
                    View Details
                  </Link>
                </Button>
              </div>

              {/* Minimal Trust Indicator */}
              <div className="pt-4 flex items-center gap-6 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-slate-200 font-bold">4.9 / 5.0</span>
                  <span className="text-slate-400 font-normal">(15,000+ Reviews)</span>
                </div>
                <span>•</span>
                <span className="text-slate-300">⚡ Free 48h Delivery across India</span>
              </div>
            </div>

            {/* Right: Featured Showcase Card */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-4 shadow-2xl space-y-4">
                {/* Main Product Image Frame */}
                <Link
                  href={`/products/${currentHero.slug}`}
                  className="block relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 group cursor-pointer border border-white/5"
                >
                  <Image
                    src={currentHero.imageUrl}
                    alt={currentHero.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                  {/* Floating Top Badges */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-md">
                      -{Math.round(((currentHero.comparePrice - currentHero.price) / currentHero.comparePrice) * 100)}% OFF
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 border border-white/10 text-amber-400 backdrop-blur shadow-sm">
                      <Star className="w-3 h-3 fill-current" />
                      <span>4.9</span>
                    </span>
                  </div>

                  {/* Bottom Quick Look overlay on hover */}
                  <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg">
                      View Drop <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>

                {/* Product Info Section */}
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      {currentHero.category}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400">
                      ✓ In Stock (Express Dispatch)
                    </span>
                  </div>

                  <Link href={`/products/${currentHero.slug}`}>
                    <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors truncate">
                      {currentHero.title}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-white">
                        {formatPrice(currentHero.price)}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(currentHero.comparePrice)}
                      </span>
                    </div>

                    <Link
                      href={`/products/${currentHero.slug}`}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Shop Now <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Interactive Visual Thumbnail Switcher */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  {heroProducts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setSelectedHeroIndex(idx)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all text-left ${
                        selectedHeroIndex === idx
                          ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/50 shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-slate-950 border border-white/5">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="truncate min-w-0">
                        <p className={`text-[11px] font-bold truncate ${selectedHeroIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                          {item.category.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-semibold truncate">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MINIMALIST VALUE PROPOSITIONS STRIP */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 border-y border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Free Delivery</h4>
              <p className="text-xs text-muted-foreground">On all orders over ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">100% Authentic</h4>
              <p className="text-xs text-muted-foreground">Directly from verified brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">7-Day Easy Returns</h4>
              <p className="text-xs text-muted-foreground">Hassle-free doorstep pickup</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">COD & Secure UPI</h4>
              <p className="text-xs text-muted-foreground">Pay safely your way</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. POPULAR CATEGORIES (CONTINUOUS SMOOTH MARQUEE SLIDER) */}
      <section className="container mx-auto px-4 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Shop by Category</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore our curated product departments</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Sliding • Hover to Pause
            </span>
            <Link href="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Continuous Infinite Smooth Marquee Track */}
        <div className="relative overflow-hidden rounded-2xl py-2 group">
          <div className="animate-marquee-continuous flex gap-4 sm:gap-6 py-1">
            {[...categories, ...categories].map((cat, idx) => {
              const fallbackImgs = [
                'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
                'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
              ];
              const imgSrc = cat.imageUrl || fallbackImgs[idx % fallbackImgs.length];

              return (
                <Link
                  key={`${cat.id || cat.slug}-${idx}`}
                  href={`/products?categorySlug=${cat.slug}`}
                  className="w-[260px] sm:w-[320px] md:w-[350px] flex-shrink-0 group/card relative overflow-hidden rounded-2xl border bg-card aspect-[16/10] flex items-end p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <Image
                    src={imgSrc}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 80vw, 350px"
                    className="object-cover group-hover/card:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                  <div className="relative z-10 text-white space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-md backdrop-blur">
                        Department
                      </span>
                      <span className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover/card:bg-primary group-hover/card:scale-110 transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <h3 className="text-lg font-bold group-hover/card:text-primary transition-colors truncate">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1">{cat.description || 'Explore collection'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. CLEAN PROMO BANNER */}
      <section className="container mx-auto px-4">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-indigo-700 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Enjoy 20% Off Your First Order
            </h3>
            <p className="text-xs sm:text-sm text-white/90">
              Use code <span className="font-mono font-bold bg-white text-primary px-2 py-0.5 rounded">WELCOME20</span> at checkout on orders over ₹999.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              suppressHydrationWarning
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              className="rounded-xl font-semibold text-xs px-4"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Code
                </>
              )}
            </Button>
            <Button asChild size="sm" className="rounded-xl bg-white text-primary hover:bg-slate-100 font-semibold text-xs px-5 shadow-sm">
              <Link href="/products">Shop Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 5. COMPLETE PRODUCTS CATALOG WITH ADMIN PICKS & CATEGORY TABS */}
      <section className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Explore Our Products</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {displayedProducts.length} Products
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse all store gear or switch to Admin Featured Drops
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCatalogTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCatalogTab === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              }`}
            >
              🔥 All Products ({allProducts.length})
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCatalogTab('featured')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCatalogTab === 'featured'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Admin Featured Picks ({allProducts.filter((p) => p.isFeatured).length})
            </button>
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat.id}
                type="button"
                suppressHydrationWarning
                onClick={() => setActiveCatalogTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeCatalogTab === cat.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-3 h-80 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-2xl bg-muted/20 space-y-3">
            <p className="text-xs text-muted-foreground">No products found for this filter.</p>
            <Button size="sm" variant="outline" onClick={() => setActiveCatalogTab('all')} className="text-xs rounded-xl">
              Show All Products
            </Button>
          </div>
        )}
      </section>

      {/* 6. CLEAN NEWSLETTER */}
      <section className="container mx-auto px-4">
        <div className="rounded-2xl border bg-card p-8 sm:p-10 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Stay in the Loop
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Subscribe to get exclusive access to product drops and special promotions.
            </p>
          </div>

          {newsletterSubmitted ? (
            <p className="text-xs font-bold text-emerald-600">
              ✓ Thank you for subscribing! Check your inbox for updates.
            </p>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
              <input
                type="email"
                required
                suppressHydrationWarning
                placeholder="Enter your email..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 h-10 px-3.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="submit" suppressHydrationWarning size="sm" className="rounded-xl font-semibold h-10 px-5 text-xs">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}


