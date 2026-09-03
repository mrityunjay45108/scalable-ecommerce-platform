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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const MEGA_CATEGORIES = [
  {
    name: 'MEN',
    slug: 'apparel-fashion',
    featured: 'New Season Casuals',
    subcategories: ['T-Shirts', 'Casual Shirts', 'Jeans & Denims', 'Sneakers & Shoes', 'Oversized Hoodies', 'Watches & Belts'],
  },
  {
    name: 'WOMEN',
    slug: 'apparel-fashion',
    featured: 'Western & Ethnic',
    subcategories: ['Kurtas & Sets', 'Tops & Tees', 'Dresses', 'Jeans & Trousers', 'Flats & Sneakers', 'Handbags'],
  },
  {
    name: 'KIDS',
    slug: 'apparel-fashion',
    featured: 'Boys & Girls',
    subcategories: ['T-Shirts & Tops', 'Dresses', 'Shorts & Jeans', 'Footwear', 'Toys & Accessories'],
  },
  {
    name: 'FOOTWEAR',
    slug: 'footwear',
    featured: 'Running & Sneakers',
    subcategories: ['Sports Shoes', 'Casual Sneakers', 'Running Shoes', 'Slides & Sandals', 'Formal Shoes'],
  },
  {
    name: 'AUDIO & TECH',
    slug: 'electronics',
    featured: 'Studio Acoustics',
    subcategories: ['ANC Headphones', 'Wireless Earbuds', 'Smart Watches', 'Bluetooth Speakers', 'Accessories'],
  },
  {
    name: 'HOME & LIVING',
    slug: 'home-living',
    featured: 'Modern Decor',
    subcategories: ['Lamps & Lighting', 'Desk Essentials', 'Aesthetic Decor', 'Organizers', 'Wall Art'],
  },
  {
    name: 'STUDIO',
    slug: 'products?sortBy=popularity',
    isNew: true,
  },
];

const PROMO_MESSAGES = [
  '🎉 BIG FASHION FESTIVAL | Flat 50-80% OFF on 10,000+ Styles',
  '⚡ Flat 20% OFF on First Order | Use Coupon Code: WELCOME20',
  '🚚 Free Express Shipping Across 19,000+ Pincodes on Orders ₹999+',
  '💵 Cash on Delivery (COD) & Easy 14-Day Doorstep Returns Available',
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
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-18 flex items-center justify-between gap-2 sm:gap-6">
          {/* Logo & Category Mega Links */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md group-hover:scale-105 transition-transform">
                N
              </span>
              <span className="font-black text-lg sm:text-xl tracking-tight text-foreground flex items-center">
                Nova<span className="text-rose-600">Store</span>
              </span>
            </Link>

            {/* Desktop Mega Menu Categories */}
            <nav className="hidden lg:flex items-center gap-6 font-extrabold text-[13px] tracking-wider text-foreground">
              {MEGA_CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className="relative py-5"
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
                      <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
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
          </div>

          {/* Desktop Search Bar (Myntra Wide Pill) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md lg:max-w-lg relative items-center mx-4"
          >
            <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search for products, brands and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/80 focus:bg-background focus:border-rose-500 focus:outline-none text-xs font-medium placeholder:text-muted-foreground/70 transition-all shadow-2xs"
            />
          </form>

          {/* Right Action Icons Stack (Profile, Wishlist, Bag) */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
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

            {/* Profile Stack (Desktop) */}
            <div className="relative hidden sm:block">
              {isAuthenticated ? (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex flex-col items-center justify-center text-foreground hover:text-rose-600 transition-colors px-1.5 py-1"
                >
                  <User className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block">
                    {user?.firstName || 'Profile'}
                  </span>
                </button>
              ) : (
                <div
                  className="relative group"
                  onMouseEnter={() => setUserDropdownOpen(true)}
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex flex-col items-center justify-center text-foreground hover:text-rose-600 transition-colors px-1.5 py-1"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block">
                      Profile
                    </span>
                  </button>

                  {/* Guest Dropdown */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-64 rounded-2xl border bg-card p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-3">
                      <div>
                        <h4 className="text-xs font-black text-foreground">Welcome to NovaStore</h4>
                        <p className="text-[11px] text-muted-foreground">To access orders and wishlist</p>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild size="sm" className="w-full rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white">
                          <Link href="/login" onClick={() => setUserDropdownOpen(false)}>LOGIN</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-bold text-xs">
                          <Link href="/register" onClick={() => setUserDropdownOpen(false)}>SIGN UP</Link>
                        </Button>
                      </div>

                      <div className="border-t pt-2 space-y-1 text-xs">
                        <Link href="/orders" className="block py-1 text-muted-foreground hover:text-foreground font-medium">
                          Track Orders
                        </Link>
                        <Link href="/wishlist" className="block py-1 text-muted-foreground hover:text-foreground font-medium">
                          Wishlist
                        </Link>
                        <Link href="/products" className="block py-1 text-muted-foreground hover:text-foreground font-medium">
                          Special Offers & Coupons
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Authenticated Dropdown */}
              {isAuthenticated && userDropdownOpen && (
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

                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Control Center
                    </Link>
                  )}

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

            {/* Wishlist Stack */}
            <Link
              href="/wishlist"
              className="flex flex-col items-center justify-center text-foreground hover:text-rose-600 transition-colors px-1.5 py-1 relative"
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
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block">
                Wishlist
              </span>
            </Link>

            {/* Bag Stack */}
            <button
              onClick={openCart}
              className="flex flex-col items-center justify-center text-foreground hover:text-rose-600 transition-colors px-1.5 py-1 relative"
              aria-label="Shopping Bag"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {(cart?.totalItems ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-xs">
                    {cart?.totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block">
                Bag
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-foreground hover:bg-muted shrink-0"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setMobileSearchOpen(false);
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
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
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-600 text-center"
                      >
                        Admin Panel
                      </Link>
                    )}
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
