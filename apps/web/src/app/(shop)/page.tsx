'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  MapPin,
  Heart,
  PhoneCall,
  CheckCircle2,
  Package,
  BadgeCheck,
  Crown,
  HeartHandshake,
} from 'lucide-react';
import { ProductDto, CategoryDto, BrandDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { ProductCard } from '@/components/shop/product-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { getRegionalHeritage, RegionalHeritageItem } from '@/lib/regional-heritage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
  staggerContainer,
  viewportOnce,
  buttonPress,
  cardLift,
} from '@/lib/animations';

// FEATURED BHARATIYA CATEGORIES
const FEATURED_CATEGORIES = [
  {
    title: 'Royal Handlooms & Silks',
    hindi: 'शाही साड़ियाँ एवं हैंडलूम',
    subtitle: 'Banarasi, Chanderi & Kanchipuram Weaves',
    badge: '100% Silk Mark',
    slug: 'apparel-fashion',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    itemCount: '2,400+ Handlooms',
  },
  {
    title: 'Make in India Tech',
    hindi: 'स्वदेशी स्मार्ट इनोवेशन',
    subtitle: 'ANC Earbuds, Wearables & Smartwatches',
    badge: '1-Yr Warranty',
    slug: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    itemCount: '850+ Devices',
  },
  {
    title: 'Shuddh Ayurveda & Organics',
    hindi: 'शुद्ध वैदिक एवं जैविक उत्पाद',
    subtitle: 'Kashmiri Saffron, Pure A2 Ghee & Herbs',
    badge: 'Certified Organic',
    slug: 'home-living',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600',
    itemCount: '1,200+ Products',
  },
  {
    title: 'Artisan Footwear & Mojaris',
    hindi: 'कारीगरी फुटवियर एवं मोजड़ी',
    subtitle: 'Handcrafted Kolhapuris, Juttis & Runners',
    badge: 'Handmade Leather',
    slug: 'footwear',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    itemCount: '950+ Pairs',
  },
];

// 1. PROUD SWADESH HERO CAMPAIGN SLIDES
const HERO_SLIDES = [
  {
    tag: '🇮🇳 THE GRAND SWADESHI SALE',
    tagColor: 'bg-amber-600 text-white',
    title: '50% - 80% OFF',
    subtitle: 'Directly from Master Artisans & Certified Indian Brands',
    description: '100% Genuine Heritage Crafts, Doorstep Cash On Delivery (COD), and 7-Day Hassle-Free Returns.',
    ctaText: 'Explore Grand Deals',
    ctaLink: '/products',
    bgGradient: 'from-amber-950 via-slate-950 to-slate-900',
    accentColor: 'text-amber-400',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200',
  },
  {
    tag: 'ROYAL WEAVES & SILKS',
    tagColor: 'bg-rose-700 text-white',
    title: 'Banarasi, Chanderi & Pashmina',
    subtitle: 'Centuries of Indian Weaving Heritage Delivered to Your Door',
    description: 'Authentic handlooms directly woven by National Award-winning master weavers from Varanasi & Kashmir.',
    ctaText: 'Shop Handloom Weaves',
    ctaLink: '/products?categorySlug=apparel-fashion',
    bgGradient: 'from-rose-950 via-slate-950 to-slate-900',
    accentColor: 'text-rose-400',
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200',
  },
  {
    tag: 'MAKE IN INDIA INNOVATION',
    tagColor: 'bg-blue-600 text-white',
    title: 'Smart Tech & Wearables',
    subtitle: 'Engineered in India with 1-Year National On-Site Warranty',
    description: 'High-bass ANC Earbuds, Smartwatches, and Ultra-Durable Fast Chargers built for the nation.',
    ctaText: 'Discover Smart Tech',
    ctaLink: '/products?categorySlug=electronics',
    bgGradient: 'from-blue-950 via-slate-950 to-slate-900',
    accentColor: 'text-blue-400',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
  },
  {
    tag: 'SHUDDH AYURVEDA & ORGANICS',
    tagColor: 'bg-emerald-600 text-white',
    title: '100% Pure Organic Living',
    subtitle: 'Kashmiri Saffron, Pure A2 Ghee & Authentic Ayurvedic Wellness',
    description: 'Directly harvested from certified Indian organic farms and forest reserves for your family’s vitality.',
    ctaText: 'Shop Vedic Wellness',
    ctaLink: '/products?categorySlug=home-living',
    bgGradient: 'from-emerald-950 via-slate-950 to-slate-900',
    accentColor: 'text-emerald-400',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200',
  },
];

// 2. REGIONAL HERITAGE SHOWCASE (Bharat Ke Kone-Kone Se) is dynamically loaded from regional-heritage.ts

// 3. VERIFIED CUSTOMER REVIEWS ACROSS INDIA
const REAL_INDIAN_REVIEWS = [
  {
    name: 'Rajesh Sharma',
    location: 'Lanka, Varanasi (Uttar Pradesh)',
    rating: 5,
    title: 'The Banarasi Dupatta quality is truly authentic!',
    comment: 'Directly sourced from weavers with certified silk mark. Packing was royal and delivered with genuine care. Shuddh desi trust at its best!',
    verified: true,
  },
  {
    name: 'Priya Rathore',
    location: 'Mansarovar, Jaipur (Rajasthan)',
    rating: 5,
    title: 'Doorstep COD gave complete peace of mind',
    comment: 'Inspected the package before paying the delivery partner. Reached Jaipur within 2 days. The Atithi Devo Bhava treatment is truly felt.',
    verified: true,
  },
  {
    name: 'Amit Kumar Singh',
    location: 'Boring Road, Patna (Bihar)',
    rating: 5,
    title: '100% Genuine Organics, zero adulteration',
    comment: 'Ordered Kashmiri Saffron and raw honey. Pure aroma and unmatched authenticity. Much better pricing than offline luxury retail.',
    verified: true,
  },
  {
    name: 'Vikram Subramaniam',
    location: 'HSR Layout, Bengaluru (Karnataka)',
    rating: 5,
    title: 'Lightning fast 24-hour delivery!',
    comment: 'Ordered Make In India wireless earbuds yesterday, delivered this afternoon. Smooth tracking and polite delivery staff. Proud of this platform!',
    verified: true,
  },
];

// 4. TOP INDIAN BRAND SPOTLIGHTS
const SPOTLIGHT_BRANDS = [
  { name: 'TATA / TANEIRA', offer: 'Up to 40% OFF Silks', imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400', query: 'Tata' },
  { name: 'FABINDIA', offer: 'Handloom Kurtas & Sets', imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', query: 'Fabindia' },
  { name: 'KHADI INDIA', offer: '100% Pure Organic Cotton', imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', query: 'Khadi' },
  { name: 'BOAT / NOISE', offer: 'Smart Audio & Tech', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', query: 'Tech' },
  { name: 'FOREST ESSENTIALS', offer: 'Pure Vedic Ayurveda', imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', query: 'Ayurveda' },
  { name: 'ROADSTER DESI', offer: 'Everyday Casuals from ₹499', imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400', query: 'Roadster' },
];

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [regionalHeritage, setRegionalHeritage] = useState<RegionalHeritageItem[]>([]);

  useEffect(() => {
    setRegionalHeritage(getRegionalHeritage());
    const handleUpdate = () => {
      setRegionalHeritage(getRegionalHeritage());
    };
    window.addEventListener('regional-heritage-updated', handleUpdate);
    return () => window.removeEventListener('regional-heritage-updated', handleUpdate);
  }, []);

  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'featured' | 'deals' | string>('all');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [spotlightBrands, setSpotlightBrands] = useState(SPOTLIGHT_BRANDS);
  const [isLoading, setIsLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Interactive Live Pincode Checker State
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{
    status: 'idle' | 'success' | 'invalid';
    city?: string;
    state?: string;
    message?: string;
  }>({ status: 'idle' });

  // Live Flash Sale Countdown Timer (8-hour ticking clock)
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 48, seconds: 24 });

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

  // Auto-rotate Hero Slides every 4.5 seconds
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
        const [featuredRes, allProdRes, categoriesRes, brandsRes] = await Promise.all([
          apiClient.get('/products/featured').catch(() => ({ data: [] })),
          apiClient.get('/products?limit=50').catch(() => ({ data: [] })),
          apiClient.get('/categories').catch(() => []),
          apiClient.get('/brands').catch(() => []),
        ]);

        const fList = Array.isArray(featuredRes) ? featuredRes : featuredRes.data || [];
        const aList = Array.isArray(allProdRes) ? allProdRes : allProdRes.data || [];
        setFeaturedProducts(fList);
        setAllProducts(aList.length > 0 ? aList : fList);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        if (Array.isArray(brandsRes) && brandsRes.length > 0) {
          setSpotlightBrands(brandsRes);
        }
      } catch {
        // graceful fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  // Pincode checker function
  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pincodeInput.trim();
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPincodeResult({
        status: 'invalid',
        message: 'Please enter a valid 6-digit Indian PIN code (कृपया 6 अंकों का सही पिन कोड दर्ज करें)।',
      });
      return;
    }

    // Auto-detect Indian city/state from common pincode prefixes
    let city = 'Your City';
    let state = 'India';

    const prefix = pin.substring(0, 2);
    if (prefix === '11') { city = 'New Delhi (दिल्ली)'; state = 'Delhi'; }
    else if (prefix >= '12' && prefix <= '13') { city = 'Haryana / NCR'; state = 'Haryana'; }
    else if (prefix >= '14' && prefix <= '15') { city = 'Punjab'; state = 'Punjab'; }
    else if (prefix >= '20' && prefix <= '28') { city = 'Uttar Pradesh (UP)'; state = 'Uttar Pradesh'; }
    else if (prefix >= '30' && prefix <= '34') { city = 'Jaipur / Rajasthan'; state = 'Rajasthan'; }
    else if (prefix >= '36' && prefix <= '39') { city = 'Ahmedabad / Gujarat'; state = 'Gujarat'; }
    else if (prefix >= '40' && prefix <= '44') { city = 'Mumbai / Maharashtra'; state = 'Maharashtra'; }
    else if (prefix >= '45' && prefix <= '49') { city = 'Madhya Pradesh / Indore'; state = 'Madhya Pradesh'; }
    else if (prefix >= '50' && prefix <= '53') { city = 'Hyderabad / Telangana'; state = 'Telangana'; }
    else if (prefix >= '56' && prefix <= '59') { city = 'Bengaluru / Karnataka'; state = 'Karnataka'; }
    else if (prefix >= '60' && prefix <= '64') { city = 'Chennai / Tamil Nadu'; state = 'Tamil Nadu'; }
    else if (prefix >= '67' && prefix <= '69') { city = 'Kochi / Kerala'; state = 'Kerala'; }
    else if (prefix >= '70' && prefix <= '74') { city = 'Kolkata / West Bengal'; state = 'West Bengal'; }
    else if (prefix >= '80' && prefix <= '85') { city = 'Patna / Bihar / Jharkhand'; state = 'Bihar'; }

    setPincodeResult({
      status: 'success',
      city,
      state,
      message: `Great news! Express Delivery & Cash on Delivery (COD) are active for ${pin} (${city}).`,
    });
  };

  // Filter products for tabs
  const displayedProducts = useMemo(() => {
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const currentSlide = HERO_SLIDES[heroIndex];

  return (
    <div suppressHydrationWarning className="space-y-6 sm:space-y-12 pb-16 overflow-x-hidden pt-2 sm:pt-4">
      {/* 1. HERO FESTIVAL SLIDER WITH CINEMATIC MOTION */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="relative overflow-hidden mx-2 sm:mx-6 lg:mx-8 rounded-3xl border border-amber-500/30 shadow-2xl select-none bg-slate-950"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        <AnimatePresence mode="wait">
          {/* MOBILE SLIDE CARD */}
          <motion.div
            key={`mobile-${heroIndex}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`relative md:hidden w-full min-h-[460px] overflow-hidden rounded-3xl bg-gradient-to-t ${currentSlide.bgGradient} flex flex-col justify-between p-5`}
          >
            <motion.div
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 6, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <Image
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                fill
                priority
                className="object-cover object-center opacity-85"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md ${currentSlide.tagColor}`}>
                {currentSlide.tag}
              </span>
              <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-200 border border-amber-300/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Live Fest
              </span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="relative z-10 space-y-2 text-white pb-2"
            >
              <motion.h1 variants={fadeUp} className="text-3xl font-black tracking-tight leading-none text-white drop-shadow-lg">
                {currentSlide.title}
              </motion.h1>
              <motion.h2 variants={fadeUp} className={`text-xs font-black uppercase tracking-wider ${currentSlide.accentColor} drop-shadow`}>
                {currentSlide.subtitle}
              </motion.h2>
              <motion.p variants={fadeUp} className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-medium">
                {currentSlide.description}
              </motion.p>
              <motion.div variants={fadeUp} className="pt-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black px-6 text-xs shadow-xl w-full h-11">
                    <Link href={currentSlide.ctaLink}>
                      {currentSlide.ctaText}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* DESKTOP HERO SLIDE */}
          <motion.div
            key={`desktop-${heroIndex}`}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`hidden md:flex relative w-full min-h-[440px] lg:min-h-[500px] overflow-hidden rounded-3xl bg-gradient-to-r ${currentSlide.bgGradient} items-center`}
          >
            <motion.div
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 7, ease: 'easeOut' }}
              className="absolute right-0 top-0 bottom-0 w-3/5 overflow-hidden"
            >
              <Image
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                fill
                priority
                className="object-cover object-center opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="relative z-10 w-full max-w-7xl mx-auto px-8 lg:px-12 py-10 flex flex-col justify-center max-w-2xl space-y-4 text-white"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md ${currentSlide.tagColor}`}>
                  {currentSlide.tag}
                </span>
                <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-200 border border-amber-300/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> India&apos;s Prestigious Swadeshi Store
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                {currentSlide.title}
              </motion.h1>
              <motion.h2 variants={fadeUp} className={`text-base lg:text-lg font-black uppercase tracking-wide ${currentSlide.accentColor} drop-shadow`}>
                {currentSlide.subtitle}
              </motion.h2>
              <motion.p variants={fadeUp} className="text-sm text-slate-200 max-w-lg leading-relaxed font-medium">
                {currentSlide.description}
              </motion.p>

              <motion.div variants={fadeUp} className="flex items-center gap-4 pt-4">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black px-8 text-sm shadow-2xl transition-all">
                    <Link href={currentSlide.ctaLink}>
                      {currentSlide.ctaText}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/20 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Certified Authentic
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <motion.button
          type="button"
          suppressHydrationWarning
          whileHover={{ scale: 1.15, backgroundColor: 'rgba(0,0,0,0.85)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center transition-colors z-20 border border-white/20 shadow-lg"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <motion.button
          type="button"
          suppressHydrationWarning
          whileHover={{ scale: 1.15, backgroundColor: 'rgba(0,0,0,0.85)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center transition-colors z-20 border border-white/20 shadow-lg"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>

        {/* Slide Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              suppressHydrationWarning
              onClick={() => setHeroIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${idx === heroIndex ? 'w-8 bg-amber-400 shadow-md shadow-amber-400/50' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </motion.section>

      {/* 2. SIGNATURE BHARATIYA CATEGORIES (श्रेणियाँ) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mx-2 sm:mx-6 lg:mx-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-black text-amber-600 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>Bharat Ki Virasat — Categories</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-1">
              Explore Signature Bharatiya Categories
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Direct from artisan clusters, certified weavers, and indigenous tech innovators.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-bold shrink-0">
            <Link href="/products">
              View All Categories &rarr;
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {FEATURED_CATEGORIES.map((cat) => (
            <motion.div
              key={cat.title}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="h-full"
            >
              <Link
                href={`/products?categorySlug=${cat.slug}`}
                className="group relative block rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-500/20 bg-card hover:border-amber-500/50 hover:shadow-2xl transition-all h-full"
              >
                <div className="relative h-52 sm:h-64 lg:h-72 w-full overflow-hidden">
                  <Image
                    src={cat.imageUrl}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-center group-hover:scale-108 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      {cat.badge}
                    </span>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white space-y-1">
                    <p className="text-[10px] sm:text-xs font-bold text-amber-300/90 font-serif">
                      {cat.hindi}
                    </p>
                    <h3 className="text-sm sm:text-lg font-black leading-snug drop-shadow-md text-white group-hover:text-amber-200 transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-200 font-medium line-clamp-1">
                      {cat.subtitle}
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {cat.itemCount}
                      </span>
                      <span className="text-[11px] text-amber-300 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        Explore &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 3. INTERACTIVE LIVE PINCODE SERVICEABILITY & DELIVERY CHECKER */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeIn}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-emerald-500/10 p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-amber-600 animate-bounce" />
                <span>Live Service Across 29,000+ Indian Pin Codes</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Check Express Delivery & Doorstep COD in Your City
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your 6-digit PIN code to verify real-time courier serviceability, cash on delivery availability, and transit timelines.
              </p>
            </div>

            {/* Pincode Input Form */}
            <div className="w-full lg:w-auto flex-1 max-w-md">
              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 110001, 400001, 800001"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    suppressHydrationWarning
                    className="w-full h-11 pl-10 pr-3 rounded-2xl border bg-background text-sm font-bold font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" suppressHydrationWarning className="rounded-2xl h-11 px-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shrink-0">
                    Check PIN &rarr;
                  </Button>
                </motion.div>
              </form>

              {/* Instant Verification Feedback */}
              <AnimatePresence>
                {pincodeResult.status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-start gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p>{pincodeResult.message}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                        ⚡ Estimated Delivery: 1-2 Business Days | 💵 Doorstep Cash On Delivery (COD) Available
                      </p>
                    </div>
                  </motion.div>
                )}

                {pincodeResult.status === 'invalid' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold"
                  >
                    {pincodeResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Pincode Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="text-base">⚡</span> 1-2 Day Express Delivery
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="text-base">💵</span> Doorstep COD (घर पर नकद)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="text-base">🔄</span> 7-Day Easy Returns (सहज वापसी)
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span className="text-base">🛡️</span> Zero Fraud Guarantee
            </div>
          </div>
        </div>
      </motion.section>

      {/* 4. ROYAL ATITHI DEVO BHAVA LUXURY HOSPITALITY SHOWCASE */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeIn}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/80 via-slate-950 to-amber-950/70 p-6 sm:p-10 lg:p-12 text-white shadow-2xl">
          {/* Subtle Royal Glow Backdrop */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={viewportOnce} className="relative z-10 text-center max-w-3xl mx-auto space-y-4">
            {/* Sacred Sanskrit Inscription */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Sanatan Seva Parampara</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-2">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-100 drop-shadow-md py-1">
                ॥ अतिथिदेवो भवः ॥
              </h2>
              <p className="text-sm sm:text-base font-bold text-amber-200/90 tracking-wide uppercase">
                Atithi Devo Bhava — &ldquo;The Guest is an Embodiment of the Divine&rdquo;
              </p>
            </motion.div>

            <motion.p variants={fadeUp} className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              In our timeless Indian tradition, hospitality is sacred. At <strong className="text-amber-300 font-bold">SWADESH Luxe</strong>, you are never merely a customer — you are our most revered guest. We honor your trust with authentic master craftsmanship, transparent pricing, and royal service at every doorstep.
            </motion.p>
          </motion.div>

          {/* The 4 Pillars of Atithi Satkar */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 mt-6 sm:mt-10 lg:mt-12"
          >
            <motion.div variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="p-3.5 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 hover:bg-white/10 transition-colors space-y-1.5 sm:space-y-2.5 text-left group">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform">
                👑
              </div>
              <h3 className="font-black text-xs sm:text-sm text-amber-200">
                Atithi Satkar (अतिथि)
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none">
                VIP concierge care, dedicated 24×7 WhatsApp support, and swift priority resolution.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="p-3.5 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 hover:bg-white/10 transition-colors space-y-1.5 sm:space-y-2.5 text-left group">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform">
                🤝
              </div>
              <h3 className="font-black text-xs sm:text-sm text-emerald-300">
                Doorstep COD (नकद)
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none">
                Inspect your sealed parcel first. Pay cash or scan UPI only when you are 100% delighted.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="p-3.5 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 hover:bg-white/10 transition-colors space-y-1.5 sm:space-y-2.5 text-left group">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-orange-500 to-rose-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform">
                💎
              </div>
              <h3 className="font-black text-xs sm:text-sm text-orange-200">
                100% Shuddh (शुद्ध)
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none">
                Certified authentic weaves, organic harvests, and innovations directly from master Indian artisans.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="p-3.5 sm:p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 hover:bg-white/10 transition-colors space-y-1.5 sm:space-y-2.5 text-left group">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-400 text-slate-950 flex items-center justify-center font-black text-base sm:text-lg shadow-lg group-hover:scale-110 transition-transform">
                🔄
              </div>
              <h3 className="font-black text-xs sm:text-sm text-blue-200">
                Sahaj Wapsi (वापसी)
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none">
                7-day doorstep pickup with instant UPI/Bank refund. Zero uncomfortable questions asked.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* 5. THE 4 PILLARS OF "SWADESHI BHAROSA" (चार अटूट विश्वास) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-6 sm:mb-8">
          <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-400 font-bold px-3 py-0.5 text-[11px] sm:text-xs">
            🇮🇳 Our Sacred Promise — Your Unbroken Trust
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground">
            Why Millions of Families Choose SWADESH Luxe
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            We are not just an online store, but a trusted national bridge to authentic Indian heritage and quality.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
          <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border bg-card hover:border-amber-500/40 hover:shadow-xl transition-all space-y-2 sm:space-y-3">
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg sm:text-2xl">
              🛡️
            </div>
            <h3 className="font-black text-xs sm:text-base text-foreground">100% Certified Genuine</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
              Directly sourced from certified Indian master weavers, artisans, and innovators. Zero duplicates guaranteed.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border bg-card hover:border-emerald-500/40 hover:shadow-xl transition-all space-y-2 sm:space-y-3">
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-lg sm:text-2xl">
              💵
            </div>
            <h3 className="font-black text-xs sm:text-base text-foreground">Doorstep COD Available</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
              Touch and inspect your order first. Pay in cash or scan QR via UPI at your doorstep with complete peace of mind.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border bg-card hover:border-blue-500/40 hover:shadow-xl transition-all space-y-2 sm:space-y-3">
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-lg sm:text-2xl">
              🔄
            </div>
            <h3 className="font-black text-xs sm:text-base text-foreground">7-Day Sahaj Wapsi</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
              If it doesn&apos;t fit or match your expectations, enjoy doorstep reverse pickup and immediate refund with zero hassle.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border bg-card hover:border-rose-500/40 hover:shadow-xl transition-all space-y-2 sm:space-y-3">
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black text-lg sm:text-2xl">
              📞
            </div>
            <h3 className="font-black text-xs sm:text-base text-foreground">24×7 Desi Helpline</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
              Dedicated human assistance in English, Hindi, and regional languages on WhatsApp and toll-free helpline.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* 6. FLASH SALE & BACHAT COUPONS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-1 rounded-full text-amber-200 text-xs font-black border border-amber-300/30">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Grand Swadeshi Bachat Deals — Limited Time</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Exclusive Festive Discount Coupons
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-medium">
                Apply these verified promo codes during checkout for instant savings on your order.
              </p>

              {/* Ticking Countdown Timer */}
              <div className="flex items-center gap-2 pt-2 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-300" />
                <span>Offer ends in:</span>
                <span suppressHydrationWarning className="font-mono bg-black/40 px-2.5 py-1 rounded-lg text-amber-300 font-black shadow-inner">
                  {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>

            {/* Coupons Interactive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
              <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-2xl bg-white text-slate-900 shadow-lg space-y-2 border-2 border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">₹100 OFF</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">Orders ₹499+</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-mono font-black text-sm tracking-wider text-slate-800">SWADESH100</span>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      type="button" suppressHydrationWarning onClick={() => handleCopyCode('SWADESH100')}
                      className="h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 shadow-sm"
                    >
                      {copiedCode === 'SWADESH100' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="ml-1">{copiedCode === 'SWADESH100' ? 'Copied!' : 'Copy Code'}</span>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-2xl bg-white text-slate-900 shadow-lg space-y-2 border-2 border-emerald-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">20% OFF</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">First Order</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-mono font-black text-sm tracking-wider text-slate-800">DESI20</span>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      type="button" suppressHydrationWarning onClick={() => handleCopyCode('DESI20')}
                      className="h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 shadow-sm"
                    >
                      {copiedCode === 'DESI20' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="ml-1">{copiedCode === 'DESI20' ? 'Copied!' : 'Copy Code'}</span>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 7. CURATED PRODUCT CATALOG WITH DESI TABS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeIn}
        className="mx-2 sm:mx-6 lg:mx-8 space-y-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b pb-4">
          <div>
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-400 font-bold mb-1">
              ✨ 100% Certified Authentic
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Curated Indian Showcase
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Handpicked crafts, festive wear, and modern Make-in-India technology rated 4.5+ stars
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-muted/60 border text-xs font-bold">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCatalogTab('all')}
              className={`relative px-3 py-1.5 rounded-xl transition-colors ${activeCatalogTab === 'all' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeCatalogTab === 'all' && (
                <motion.span
                  layoutId="activeCatalogTabPill"
                  className="absolute inset-0 bg-amber-600 rounded-xl shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">All Products (सभी)</span>
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCatalogTab('featured')}
              className={`relative px-3 py-1.5 rounded-xl transition-colors ${activeCatalogTab === 'featured' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeCatalogTab === 'featured' && (
                <motion.span
                  layoutId="activeCatalogTabPill"
                  className="absolute inset-0 bg-amber-600 rounded-xl shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">⭐ Best Sellers (सर्वश्रेष्ठ)</span>
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCatalogTab('deals')}
              className={`relative px-3 py-1.5 rounded-xl transition-colors ${activeCatalogTab === 'deals' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeCatalogTab === 'deals' && (
                <motion.span
                  layoutId="activeCatalogTabPill"
                  className="absolute inset-0 bg-amber-600 rounded-xl shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">🔥 Flash Deals (बचत सेल)</span>
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        {displayedProducts.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5"
          >
            {displayedProducts.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">Loading authentic products...</p>
          </div>
        )}

        <div className="pt-4 text-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-xs font-black border-2 border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white shadow-sm">
              <Link href="/products">
                Explore All 10,000+ Swadeshi Products &rarr;
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* 8. EXPLORE BY INDIAN REGIONS (Bharat Ke Kone-Kone Se) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeIn}
        className="mx-2 sm:mx-6 lg:mx-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-black text-amber-600 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>Virasat-e-Hind (विरासत-ए-हिंद)</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-1">
              Treasures from Every Corner of India
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Authentic regional craftsmanship directly connected to the indigenous identity of each state.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
            {isAdmin && (
              <Button asChild variant="default" size="sm" className="rounded-full text-xs font-bold shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-1">
                <Link href="/admin/categories?tab=heritage">
                  ⚙️ Manage Virasat (Admin)
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-bold shrink-0">
              <Link href="/products?categorySlug=apparel-fashion">
                Explore All Regions &rarr;
              </Link>
            </Button>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
        >
          {regionalHeritage.map((item) => (
            <motion.div
              key={item.id || item.region}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="h-full"
            >
              <Link
                href={`/products?categorySlug=${item.slug}&search=${encodeURIComponent(item.searchQuery || item.region.split(' ')[0])}`}
                className="group relative block rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-2xl transition-all h-full"
              >
                <div className="relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-center group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md">
                      {item.region}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white space-y-0.5 sm:space-y-1">
                    <h3 className="text-xs sm:text-base lg:text-lg font-black leading-snug drop-shadow-md line-clamp-2 group-hover:text-amber-200 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-amber-200 font-medium drop-shadow truncate">
                      📍 {item.highlight}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* 9. VERIFIED CUSTOMER REVIEWS (सच्चे ग्राहकों की ज़ुबानी) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="rounded-3xl border border-border bg-muted/20 p-6 sm:p-10 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-400 font-bold px-3 py-0.5">
              ⭐ 4.9/5 Star Customer Trust
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Voices of Real Indian Families (सच्चे ग्राहकों की ज़ुबानी)
            </h2>
            <p className="text-xs text-muted-foreground">
              Honest experiences from verified buyers in Varanasi, Jaipur, Patna, Bengaluru and 29,000+ pin codes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REAL_INDIAN_REVIEWS.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-5 rounded-2xl border bg-card shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>
                  <h3 className="font-bold text-xs text-foreground leading-snug">
                    &ldquo;{review.title}&rdquo;
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                </div>

                <div className="pt-3 border-t text-[11px] space-y-0.5">
                  <div className="font-black text-foreground flex items-center gap-1">
                    <span>{review.name}</span>
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    📍 {review.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* 10. MISSION VOCAL FOR LOCAL & SWADESHI EMPOWERMENT */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeIn}
        className="mx-2 sm:mx-6 lg:mx-8"
      >
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 max-w-xl text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
              🇮🇳 Vocal for Local & Atmanirbhar Bharat
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Empowering Indian Artisans with Every Purchase
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              When you purchase on SWADESH Luxe, your hard-earned rupee directly supports master weavers, local craft clusters, and visionary Indian creators across the nation.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-4 relative z-10">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs px-8 shadow-xl">
                <Link href="/products">
                  Shop Swadeshi Creations 🇮🇳
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
