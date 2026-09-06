'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  LogOut,
  LayoutDashboard,
  Package,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Tag,
  ShieldCheck,
  Zap,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface MegaCategory {
  name: string;
  slug: string;
  featured?: string;
  subcategories?: string[];
  isNew?: boolean;
}

const MEGA_CATEGORIES: MegaCategory[] = [
  {
    name: 'Festive & Ethnic',
    slug: 'apparel-fashion',
    featured: 'Handcrafted Heritage',
    subcategories: ['Banarasi & Kanchipuram Silk', 'Kurta Pajama & Sherwanis', 'Jaipuri Handblock & Bandhani', 'Chanderi & Lucknowi Chikankari', 'Kutch Mirror Work Dupattas'],
  },
  {
    name: 'Men',
    slug: 'apparel-fashion',
    featured: 'Contemporary & Classic',
    subcategories: ['Festive Kurta Sets', 'Pure Cotton Shirts', 'Nehru & Modi Jackets', 'Indigo Denim & Trousers', 'Handmade Kolhapuris & Mojaris'],
  },
  {
    name: 'Women',
    slug: 'apparel-fashion',
    featured: 'Couture & Daily Wear',
    subcategories: ['Pure Silk & Georgette Sarees', 'Anarkalis & Salwar Suits', 'Indo-Western Fusion Dresses', 'Temple & Kundan Jewellery', 'Handcrafted Potlis & Clutches'],
  },
  {
    name: 'Make In India Tech',
    slug: 'electronics',
    featured: 'Indian Engineering',
    subcategories: ['Smartwatches & Fit Bands', 'ANC Wireless Earbuds', 'Portable Bluetooth Speakers', 'Ultra-Fast GaN Chargers', 'Smart Home Automation'],
  },
  {
    name: 'Ayurveda & Wellness',
    slug: 'home-living',
    featured: '100% Shuddh Organics',
    subcategories: ['Pure Kashmiri Saffron & Walnuts', 'Vedic A2 Gir Cow Ghee', 'Forest Raw Honey', 'Certified Organic Spices', 'Herbal Infusions & Kahwa'],
  },
  {
    name: 'Handicrafts & Home',
    slug: 'home-living',
    featured: 'Indigenous Master Crafts',
    subcategories: ['Brass Diyas & Temple Idols', 'Jaipur Blue Pottery', 'Carved Sheesham Woodcraft', 'Handloom Cotton Bedding', 'Pooja & Spiritual Essentials'],
  },
];

const PROMO_MESSAGES = [
  '✨ ॥ अतिथिदेवो भवः ॥ — Atithi Devo Bhava | You are our most revered guest across 29,000+ Pin Codes',
  '⚡ Welcome Offer: Flat ₹100 OFF on your first purchase | Use Code: SWADESH100',
  '🛡️ 100% Certified Authentic Swadeshi Quality | Directly from Master Artisans & Innovators',
  '🔄 7-Day Doorstep Returns | Zero questions asked, instant UPI & Bank refunds',
  '📦 Express Delivery & Doorstep COD Available across Delhi NCR, Mumbai, Bengaluru & pan-India',
];

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cart, wishlist, openCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);

  // Auto-cycle promotional ticker every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      {/* 1. TOP OFFER TICKER BAR (MYNTRA STYLE) */}
      <div className="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white text-[11px] font-black py-1.5 px-4 text-center tracking-wide shadow-xs flex items-center justify-center gap-2 overflow-hidden transition-all">
        <Sparkles className="w-3.5 h-3.5 animate-spin hidden sm:inline" />
        <span className="truncate animate-in fade-in duration-500" key={promoIndex}>
          {PROMO_MESSAGES[promoIndex]}
        </span>
        <span className="hidden md:inline font-bold bg-white/20 px-2 py-0.2 rounded text-[10px]">
          LIMITED TIME
        </span>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/98 backdrop-blur-md shadow-xs">
        {/* Tier 1: Main Bar (Brand, Search Bar, Login/Sign Up, Wishlist, Bag) */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-foreground hover:bg-muted shrink-0"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setMobileSearchOpen(false);
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
              <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md group-hover:scale-105 transition-transform border border-white/20">
                🇮🇳
              </span>
              <div className="flex flex-col">
                <span className="font-black text-lg sm:text-2xl tracking-tight text-foreground flex items-center">
                  SWADESH<span className="text-amber-500 text-[10px] sm:text-xs ml-1 font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">Luxe</span>
                </span>
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase -mt-0.5 hidden sm:flex items-center gap-1">
                  <span>The Indian Store</span>
                  <span className="text-border">•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-serif font-bold">॥ अतिथिदेवो भवः ॥</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Bar (Flexible, never pushes items off) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md lg:max-w-xl relative items-center mx-2 lg:mx-4"
          >
            <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search for authentic Indian products, brands, crafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suppressHydrationWarning
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/80 focus:bg-background focus:border-rose-500 focus:outline-none text-xs font-medium placeholder:text-muted-foreground/70 transition-all shadow-2xs"
            />
          </form>

          {/* Right: Actions Stack (Always 100% visible: Login/Signup, Wishlist, Bag) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
            {/* Mobile Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Toggle Search"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Admin Portal Quick Access */}
            <Link
              href="/admin/products"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-colors"
              title="Admin Portal - Manage Products & Catalog"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>

            {/* LOGIN & SIGN UP / USER PROFILE (PROMINENT & ALWAYS VISIBLE!) */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  suppressHydrationWarning
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors text-foreground"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold leading-none">{user?.firstName || 'Account'}</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{isAdmin ? 'Admin' : 'Customer'}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border bg-card p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
                    <div className="px-3 py-2.5 border-b mb-1">
                      <p className="text-xs font-black text-foreground">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                      {isAdmin && (
                        <Badge className="mt-1 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0">
                          ADMIN
                        </Badge>
                      )}
                    </div>

                    <Link
                      href="/admin/products"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Admin Portal (Manage Products)
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted transition-colors text-foreground"
                    >
                      <Package className="w-4 h-4 text-muted-foreground" />
                      My Orders
                    </Link>

                    <Link
                      href="/wishlist"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted transition-colors text-foreground"
                    >
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      My Wishlist ({wishlist?.items?.length ?? 0})
                    </Link>

                    <Link
                      href="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-muted transition-colors text-foreground"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      Profile Settings & Password
                    </Link>

                    <button
                      onClick={handleLogout}
                      suppressHydrationWarning
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold text-xs h-8 sm:h-9 px-2.5 sm:px-3.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500 transition-colors"
                >
                  <Link href="/login">LOGIN</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="hidden sm:inline-flex rounded-xl font-bold text-xs h-8 sm:h-9 px-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white shadow-xs"
                >
                  <Link href="/register">SIGN UP</Link>
                </Button>
              </div>
            )}

            {/* Wishlist Stack */}
            <Link
              href="/wishlist"
              className="flex items-center gap-1.5 p-2 rounded-xl text-foreground hover:text-rose-600 hover:bg-muted/60 transition-colors relative"
              aria-label="Wishlist"
            >
              <div className="relative">
                <Heart className="w-5 h-5" />
                {(wishlist?.items?.length ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-xs">
                    {wishlist?.items.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold hidden xl:inline">Wishlist</span>
            </Link>

            {/* Shopping Bag (PROMINENT & EYE-CATCHING) */}
            <button
              onClick={openCart}
              suppressHydrationWarning
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all shrink-0"
              aria-label="Shopping Bag"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                {(cart?.totalItems ?? 0) > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-xs">
                    {cart?.totalItems}
                  </span>
                )}
              </div>
              <span className="tracking-wide">
                {(cart?.totalItems ?? 0) > 0 ? `BAG (${cart?.totalItems})` : 'BAG'}
              </span>
            </button>
          </div>
        </div>

        {/* Tier 2: Dedicated Category Strip (Desktop & Tablet) */}
        <div className="hidden md:flex border-t bg-muted/20 backdrop-blur-xs">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <nav className="flex items-center gap-5 lg:gap-7 font-extrabold text-[12px] tracking-wider text-foreground">
              {MEGA_CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className="relative py-2.5"
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link
                    href={`/products?categorySlug=${cat.slug}`}
                    className={`hover:text-rose-600 transition-colors uppercase flex items-center gap-1 ${
                      hoveredCategory === cat.name ? 'text-rose-600' : ''
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.isNew && (
                      <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        NEW
                      </span>
                    )}
                  </Link>

                  {/* Mega Dropdown Menu */}
                  {hoveredCategory === cat.name && (
                    <div className="absolute left-0 top-full pt-1 z-50 w-72 animate-in fade-in zoom-in-95 duration-150">
                      <div className="rounded-2xl border bg-card p-4 shadow-2xl space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-black text-xs uppercase tracking-wider text-rose-600">
                            {cat.name} Collection
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold">100% Original</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {cat.subcategories?.map((sub) => (
                            <Link
                              key={sub}
                              href={`/products?categorySlug=${cat.slug}&search=${encodeURIComponent(sub)}`}
                              className="text-xs text-muted-foreground hover:text-rose-600 hover:bg-muted/50 px-2 py-1.5 rounded-lg transition-colors font-semibold flex items-center justify-between group/sub"
                            >
                              <span>{sub}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
                            </Link>
                          ))}
                        </div>
                        <div className="pt-2 border-t text-center">
                          <Link
                            href={`/products?categorySlug=${cat.slug}`}
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            Explore All {cat.name} &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground py-2 shrink-0">
              <Link href="/products" className="text-rose-600 hover:underline flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Festive Bachat Sale</span>
              </Link>
              <span className="text-border">•</span>
              <span className="text-[11px] text-amber-600 font-serif font-bold">॥ अतिथिदेवो भवः ॥</span>
            </div>
          </div>
        </div>

        {/* Expandable Mobile Search Drawer */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t px-4 py-3 bg-muted/30 animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearch} className="flex items-center relative">
              <input
                type="text"
                placeholder="Search products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                suppressHydrationWarning
                className="w-full h-10 pl-10 pr-10 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-xs"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-3 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile Slide-Over Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t p-4 bg-background/98 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center relative">
              <input
                type="text"
                placeholder="Search products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                suppressHydrationWarning
                className="w-full h-10 pl-10 pr-4 text-xs rounded-xl border bg-muted/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            </form>

            {/* Quick Admin Access */}
            <Link
              href="/admin/products"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-xs hover:bg-amber-500/20 transition-all"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Admin Portal (Add, Edit, Delete Products)</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            {/* Categories */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1">
                SHOP BY CATEGORIES
              </p>
              {MEGA_CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/products?categorySlug=${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-muted transition-colors text-foreground"
                >
                  <span className="flex items-center gap-2">
                    {cat.name}
                    {cat.isNew && (
                      <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">
                        NEW
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>

            {/* User Links */}
            <div className="border-t pt-3 space-y-2">
              {isAuthenticated ? (
                <div className="p-3 rounded-2xl bg-muted/40 border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-foreground">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                    </div>
                    {isAdmin && (
                      <Badge className="bg-rose-600 text-white text-[9px] font-extrabold">ADMIN</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/admin/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-center"
                    >
                      Admin Products
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 text-[11px] font-bold rounded-lg bg-card border text-center"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 text-[11px] font-bold rounded-lg bg-card border text-center"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-600 text-center"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="rounded-xl font-bold text-xs h-10">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                  </Button>
                  <Button asChild className="rounded-xl font-bold text-xs h-10 bg-rose-600 hover:bg-rose-700 text-white">
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
