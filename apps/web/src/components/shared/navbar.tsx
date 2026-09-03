'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cart, wishlist, openCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-primary">
            <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow-sm">
              N
            </span>
            <span className="font-extrabold tracking-tight">NovaStore</span>
          </Link>

          {/* Desktop Categories Navigation */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-muted-foreground">
            <Link href="/products" className="hover:text-foreground transition-colors">
              All Products
            </Link>
            <Link href="/products?categorySlug=electronics" className="hover:text-foreground transition-colors">
              Electronics
            </Link>
            <Link href="/products?categorySlug=apparel-fashion" className="hover:text-foreground transition-colors">
              Apparel
            </Link>
            <Link href="/products?categorySlug=home-living" className="hover:text-foreground transition-colors">
              Home & Living
            </Link>
          </nav>
        </div>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
          <input
            type="text"
            placeholder="Search audio, sneakers, streetwear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            suppressHydrationWarning
            className="w-full h-9 pl-9 pr-4 text-sm rounded-full border bg-muted/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Search Icon Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            aria-label="Toggle Search"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Wishlist */}
          <Button asChild variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Wishlist">
            <Link href="/wishlist">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-rose-500 transition-colors" />
              {(wishlist?.items?.length ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow">
                  {wishlist?.items.length}
                </span>
              )}
            </Link>
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            className="relative h-9 w-9"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            {(cart?.totalItems ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow">
                {cart?.totalItems}
              </span>
            )}
          </Button>

          {/* Desktop User Account / Auth */}
          {isAuthenticated ? (
            <div className="relative hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-full border border-border/60 hover:bg-muted/60"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <span className="text-xs font-semibold max-w-[90px] truncate">{user?.firstName}</span>
              </Button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    {isAdmin && (
                      <Badge variant="default" className="mt-1.5 text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-primary font-medium transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <Link
                    href="/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    My Orders
                  </Link>

                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Account Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    suppressHydrationWarning
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors mt-1 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="font-semibold text-xs h-9">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="font-semibold text-xs h-9 rounded-full px-4 shadow-sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu trigger - ALWAYS VISIBLE ON MOBILE WITHOUT OVERFLOW */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-foreground hover:bg-muted shrink-0 ml-1"
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

      {/* Mobile Search Drawer (Expandable) */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t px-4 py-3 bg-muted/30 animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearch} className="flex items-center relative">
            <input
              type="text"
              placeholder="Search audio, sneakers, streetwear..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              suppressHydrationWarning
              className="w-full h-10 pl-10 pr-10 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
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

      {/* Full Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t p-4 bg-background/98 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Search bar inside mobile menu */}
          <form onSubmit={handleSearch} className="flex items-center relative">
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suppressHydrationWarning
              className="w-full h-10 pl-10 pr-4 text-sm rounded-xl border bg-muted/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          </form>

          {/* User Auth Section in Mobile Menu */}
          {isAuthenticated ? (
            <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user?.email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Badge variant="default" className="text-[10px] px-2 py-0.5">
                    Admin
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                )}
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 text-xs font-semibold rounded-lg bg-background border hover:bg-muted transition-colors"
                >
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  My Orders
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 text-xs font-semibold rounded-lg bg-background border hover:bg-muted transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  suppressHydrationWarning
                  className="flex items-center gap-2 p-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-1">
              <Button asChild variant="outline" className="w-full justify-center rounded-xl font-semibold text-xs h-10">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild className="w-full justify-center rounded-xl font-semibold text-xs h-10 shadow-sm">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          )}

          {/* Navigation Category Links */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Explore Store
            </p>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>All Products & Deals</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              href="/products?categorySlug=electronics"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Studio Electronics & Audio</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              href="/products?categorySlug=apparel-fashion"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Apparel & Luxury Fashion</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              href="/products?categorySlug=footwear"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Footwear & Athletic Shoes</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              href="/products?categorySlug=home-living"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <span>Home & Ergonomics</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Quick Coupon Promo in Mobile Menu */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-950">20% OFF Coupon</p>
                <p className="text-[10px] text-indigo-700">Code: <span className="font-mono font-bold">WELCOME20</span></p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] font-bold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
              onClick={() => {
                navigator.clipboard.writeText('WELCOME20');
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
