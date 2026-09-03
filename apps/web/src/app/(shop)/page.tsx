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
  Clock,
  Tag,
  Zap,
  Flame,
  Award,
} from 'lucide-react';
import { ProductDto, CategoryDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

// MYNTRA HIGH-FASHION CAMPAIGN BANNERS
const HERO_SLIDES = [
  {
    tag: 'BIG FASHION FESTIVAL',
    tagColor: 'bg-rose-600 text-white',
    title: '50 - 80% OFF',
    subtitle: 'ON 10,000+ TOP FASHION & LIFESTYLE STYLES',
    description: 'Featuring Roadster, Nike, Highlander, Levi\'s, Zara & more.',
    ctaText: 'EXPLORE DEALS',
    ctaLink: '/products',
    bgGradient: 'from-rose-950 via-slate-950 to-slate-900',
    accentColor: 'text-rose-400',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
  },
  {
    tag: 'STREETWEAR & CASUALS',
    tagColor: 'bg-orange-500 text-white',
    title: 'STARTING AT ₹399',
    subtitle: 'TRENDING OVERSIZED TEES, HOODIES & CARGOES',
    description: 'Heavyweight cotton, relaxed drop-shoulder fits, and urban essentials.',
    ctaText: 'SHOP TRENDS',
    ctaLink: '/products?categorySlug=apparel-fashion',
    bgGradient: 'from-orange-950 via-slate-950 to-slate-900',
    accentColor: 'text-orange-400',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200',
  },
  {
    tag: 'PREMIUM FOOTWEAR',
    tagColor: 'bg-indigo-600 text-white',
    title: 'MIN. 40% OFF',
    subtitle: 'CARBON RUNNERS, RETRO SNEAKERS & HIGH-TOPS',
    description: 'Explosive propulsion, cushioned strides, and street-ready style.',
    ctaText: 'DISCOVER SNEAKERS',
    ctaLink: '/products?categorySlug=footwear',
    bgGradient: 'from-indigo-950 via-slate-950 to-slate-900',
    accentColor: 'text-indigo-400',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
  },
  {
    tag: 'STUDIO ACOUSTICS & TECH',
    tagColor: 'bg-emerald-600 text-white',
    title: 'UP TO 60% OFF',
    subtitle: 'ANC HEADPHONES, WIRELESS EARBUDS & SMART GEAR',
    description: 'Precision acoustics, 40-hour battery life, and spatial audio.',
    ctaText: 'SHOP TECH',
    ctaLink: '/products?categorySlug=electronics',
    bgGradient: 'from-emerald-950 via-slate-950 to-slate-900',
    accentColor: 'text-emerald-400',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
  },
];

// TOP SPOTLIGHT BRANDS (MYNTRA STYLE)
const SPOTLIGHT_BRANDS = [
  { name: 'ROADSTER', offer: 'UNDER ₹799', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', query: 'Roadster' },
  { name: 'NIKE', offer: 'MIN. 40% OFF', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', query: 'Nike' },
  { name: 'HIGHLANDER', offer: 'FLAT 60% OFF', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', query: 'Highlander' },
  { name: "LEVI'S", offer: 'MIN. 50% OFF', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', query: "Levi's" },
  { name: 'PUMA', offer: 'FROM ₹899', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400', query: 'Puma' },
  { name: 'ZARA', offer: 'NEW SEASON', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', query: 'Zara' },
  { name: 'HRX', offer: 'UNDER ₹699', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', query: 'HRX' },
  { name: 'NOVA TECH', offer: 'FLAT 50% OFF', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', query: 'Nova' },
];

// CATEGORIES TO BAG (MYNTRA VISUAL TILES)
const CATEGORIES_TO_BAG = [
  { title: "Men's Casual Wear", offer: 'Min. 40% Off', slug: 'apparel-fashion', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600' },
  { title: "Women's Western & Ethnic", offer: '50 - 70% Off', slug: 'apparel-fashion', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600' },
  { title: 'Sneakers & Sports Shoes', offer: 'From ₹699', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
  { title: 'Oversized Hoodies & Tees', offer: 'Under ₹599', slug: 'apparel-fashion', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600' },
  { title: 'Watches & Smart Gear', offer: 'Up to 60% Off', slug: 'electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' },
  { title: 'Studio Audio & Acoustics', offer: 'From ₹1,499', slug: 'electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600' },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'featured' | 'deals' | string>('all');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Live Flash Sale Countdown Timer (Simulated 8 hour ticking clock)
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 8, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotating Hero Campaign Slider every 4.5 seconds
  useEffect(() => {
    if (isHeroHovered) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isHeroHovered]);

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

  // Computed displayed products for catalog tabs
  const displayedProducts = React.useMemo(() => {
    if (activeCatalogTab === 'featured') {
      const feat = allProducts.filter((p) => p.isFeatured);
      return feat.length > 0 ? feat : featuredProducts;
    }
    if (activeCatalogTab === 'deals') {
      return allProducts.filter((p) => p.comparePrice && p.comparePrice > p.basePrice);
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

  const currentSlide = HERO_SLIDES[heroIndex];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. MYNTRA HERO FESTIVAL CAMPAIGN SLIDER */}
      <section
        className="relative overflow-hidden mx-3 sm:mx-6 lg:mx-8 mt-3 rounded-3xl border border-border shadow-xl"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        <div className={`relative bg-gradient-to-r ${currentSlide.bgGradient} text-white min-h-[420px] sm:min-h-[480px] flex items-center transition-all duration-700`}>
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/60 pointer-events-none" />

          <div className="container mx-auto px-6 sm:px-12 py-10 sm:py-14 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left: Text & Badges */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md ${currentSlide.tagColor}`}>
                    {currentSlide.tag}
                  </span>
                  <span className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-200 border border-white/10 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Live Fashion Event
                  </span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
                    {currentSlide.title}
                  </h1>
                  <h2 className={`text-lg sm:text-2xl font-black uppercase tracking-wider ${currentSlide.accentColor}`}>
                    {currentSlide.subtitle}
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed font-medium">
                  {currentSlide.description}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <Button asChild size="lg" className="rounded-full bg-white hover:bg-slate-100 text-slate-900 font-black px-8 text-sm shadow-xl hover:scale-105 transition-transform">
                    <Link href={currentSlide.ctaLink}>
                      {currentSlide.ctaText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-black/40 hover:bg-black/60 text-white font-bold px-6 text-sm backdrop-blur">
                    <Link href="/products">
                      View All Styles
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right: High-Impact Visual Frame */}
              <div className="lg:col-span-5 relative">
                <Link
                  href={currentSlide.ctaLink}
                  className="block relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl group cursor-pointer"
                >
                  <Image
                    src={currentSlide.imageUrl}
                    alt={currentSlide.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 right-3 bg-white text-slate-900 text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    Explore Drop <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Slider Navigation Arrows */}
          <button
            onClick={() => setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all z-20 backdrop-blur"
            aria-label="Previous Banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all z-20 backdrop-blur"
            aria-label="Next Banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  heroIndex === i ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. ⚡ CRAZY DEALS OF THE DAY WITH COUNTDOWN (MYNTRA SIGNATURE) */}
      <section className="container mx-auto px-4">
        <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-card p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
                <Flame className="w-6 h-6 animate-bounce" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  CRAZY DEALS OF THE DAY
                </h2>
                <p className="text-xs text-muted-foreground font-semibold">
                  Handpicked trending styles at lowest price drops
                </p>
              </div>
            </div>

            {/* Countdown Clock Box */}
            <div className="flex items-center gap-2 bg-card border border-rose-500/40 px-3.5 py-2 rounded-2xl shadow-xs">
              <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Ends in:</span>
              <div className="flex items-center gap-1 font-mono font-black text-xs text-rose-600">
                <span className="bg-rose-500/15 px-2 py-0.5 rounded-md">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-rose-500/15 px-2 py-0.5 rounded-md">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-rose-500/15 px-2 py-0.5 rounded-md">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>
          </div>

          {/* Flash Deals Horizontal Carousel / Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(featuredProducts.length > 0 ? featuredProducts.slice(0, 4) : allProducts.slice(0, 4)).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. 🏷️ MEDAL WORTHY BRANDS TO BAG (MYNTRA SIGNATURE) */}
      <section className="container mx-auto px-4 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-foreground flex items-center justify-center gap-2">
            <Award className="w-6 h-6 text-amber-500" /> MEDAL WORTHY BRANDS TO BAG
          </h2>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
            Shop Top Global & Indian Brands with Verified Warranty
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {SPOTLIGHT_BRANDS.map((brand, idx) => (
            <Link
              key={idx}
              href={`/products?search=${encodeURIComponent(brand.query)}`}
              className="group rounded-2xl border border-border bg-card p-3 text-center space-y-2.5 transition-all hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 flex flex-col items-center justify-between"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-border/80 group-hover:border-primary transition-colors bg-muted/30 shadow-xs">
                <Image
                  src={brand.image}
                  alt={brand.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate w-full">
                  {brand.name}
                </h3>
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {brand.offer}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. 🛍️ CATEGORIES TO BAG (MYNTRA VISUAL TILES) */}
      <section className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-foreground">
              CATEGORIES TO BAG
            </h2>
            <p className="text-xs text-muted-foreground font-semibold">
              Explore curated fashion, athletic, and lifestyle departments
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
          >
            VIEW ALL &gt;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES_TO_BAG.map((cat, idx) => (
            <Link
              key={idx}
              href={`/products?categorySlug=${cat.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] border border-border shadow-sm hover:shadow-2xl transition-all duration-300"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              <div className="absolute bottom-3 inset-x-3 text-white space-y-0.5">
                <h3 className="text-xs font-black leading-tight group-hover:text-rose-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-[10px] font-extrabold text-amber-300">
                  {cat.offer}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. 💰 BUDGET STORE / EXPLORE BY PRICE TILES (MYNTRA SIGNATURE) */}
      <section className="container mx-auto px-4">
        <div className="rounded-3xl border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            EXPLORE BY PRICE • BUDGET STORE
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'UNDER ₹399', query: 'maxPrice=399' },
              { label: 'UNDER ₹599', query: 'maxPrice=599' },
              { label: 'UNDER ₹999', query: 'maxPrice=999' },
              { label: 'UNDER ₹1,499', query: 'maxPrice=1499' },
              { label: '50%+ OFF DEALS', query: 'discount=50' },
            ].map((tier, idx) => (
              <Link
                key={idx}
                href={`/products?${tier.query}`}
                className="p-3 rounded-2xl border-2 border-border/80 bg-muted/20 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all text-center group font-black text-xs uppercase tracking-wider text-foreground flex items-center justify-center gap-1"
              >
                <span>{tier.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 👗 COMPLETE PRODUCT CATALOG WITH DYNAMIC MYNTRA TABS */}
      <section className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
                EXPLORE STORE CATALOG
              </h2>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                {displayedProducts.length} STYLES
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Browse all items with instant size selector & 1-click checkout
            </p>
          </div>

          {/* Myntra Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCatalogTab('all')}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeCatalogTab === 'all'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              }`}
            >
              🔥 ALL STYLES ({allProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCatalogTab('featured')}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCatalogTab === 'featured'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              FEATURED DROPS ({allProducts.filter((p) => p.isFeatured).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCatalogTab('deals')}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCatalogTab === 'deals'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              DISCOUNT DEALS ({allProducts.filter((p) => p.comparePrice && p.comparePrice > p.basePrice).length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCatalogTab(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeCatalogTab === cat.id
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Column Responsive Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl border bg-card p-4 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border rounded-3xl bg-muted/20 space-y-3">
            <p className="text-xs text-muted-foreground font-bold">No styles found for this category.</p>
            <Button size="sm" variant="outline" onClick={() => setActiveCatalogTab('all')} className="text-xs font-bold rounded-xl">
              Show All Styles
            </Button>
          </div>
        )}
      </section>

      {/* 7. 🛡️ WHY SHOP WITH NOVASTORE (MYNTRA TRUST GUARANTEE) */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-8 border-y border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 flex-shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Free Express Delivery</h4>
              <p className="text-[11px] text-muted-foreground">On all orders above ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">100% Genuine Products</h4>
              <p className="text-[11px] text-muted-foreground">Direct from authorized brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">14-Day Easy Returns</h4>
              <p className="text-[11px] text-muted-foreground">Doorstep pickup & instant refund</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 flex-shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">COD & Instant UPI</h4>
              <p className="text-[11px] text-muted-foreground">100% Secure Checkout</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. 💌 PROMO BANNER & NEWSLETTER */}
      <section className="container mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              SPECIAL WELCOME OFFER
            </span>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
              Flat 20% OFF on Your First Order
            </h3>
            <p className="text-xs sm:text-sm text-white/90 font-medium">
              Use code <strong className="font-mono font-black bg-white text-rose-600 px-2.5 py-0.5 rounded-lg shadow-sm">WELCOME20</strong> at checkout on orders above ₹499.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleCopyCode}
              className="rounded-2xl font-black text-xs px-6 shadow-md bg-white text-slate-900 hover:bg-slate-100"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> COPIED!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" /> COPY CODE
                </>
              )}
            </Button>
            <Button asChild size="lg" className="rounded-2xl bg-black/80 hover:bg-black text-white font-black text-xs px-6 shadow-md">
              <Link href="/products">SHOP NOW</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}


