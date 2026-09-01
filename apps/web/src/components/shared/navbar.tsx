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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
            <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow">
              N
            </span>
            <span>NovaStore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Search audio, sneakers, accessories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            suppressHydrationWarning
            className="w-full h-9 pl-9 pr-4 text-sm rounded-full border bg-muted/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Wishlist */}
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Wishlist">
            <Link href="/wishlist">
              <Heart className="w-5 h-5 text-muted-foreground hover:text-rose-500 transition-colors" />
              {(wishlist?.items?.length ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
            className="relative"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {(cart?.totalItems ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {cart?.totalItems}
              </span>
            )}
          </Button>

          {/* User Account / Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <span className="hidden lg:inline text-xs font-semibold">{user?.firstName}</span>
              </Button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-2 shadow-lg z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    {isAdmin && (
                      <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0">
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 bg-background space-y-3">
          <form onSubmit={handleSearch} className="flex items-center relative mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              suppressHydrationWarning
              className="w-full h-9 pl-9 pr-4 text-sm rounded-lg border bg-muted/50 focus:outline-none"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          </form>
          <nav className="flex flex-col space-y-2 text-sm">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              All Products
            </Link>
            <Link
              href="/products?categorySlug=electronics"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Electronics
            </Link>
            <Link
              href="/products?categorySlug=apparel-fashion"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Apparel & Fashion
            </Link>
            <Link
              href="/products?categorySlug=home-living"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Home & Living
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
