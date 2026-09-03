'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, ShoppingBag, Star, ArrowRight, X } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPrice } from '@/lib/utils';
import { parseProductSpecs } from '@/lib/product-specs';
import { Button } from '@/components/ui/button';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, moveToCart, clearWishlist } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleMoveToCart = async (productId: string) => {
    setActionLoadingId(productId);
    try {
      await moveToCart(productId);
    } catch (e) {
      console.error('Failed to move item to cart', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (productId: string) => {
    setActionLoadingId(productId);
    try {
      await removeFromWishlist(productId);
    } catch (e) {
      console.error('Failed to remove item', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black uppercase tracking-wider">PLEASE LOG IN</h2>
          <p className="text-xs text-muted-foreground">
            Login to view items in your wishlist and sync across devices.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="rounded-2xl px-8 font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md">
            <Link href="/login?callback=/wishlist">
              LOGIN
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl px-6 font-bold">
            <Link href="/register">
              SIGN UP
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const items = wishlist?.items || [];

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-wider">YOUR WISHLIST IS EMPTY</h2>
          <p className="text-xs text-muted-foreground">
            Explore our curated catalog and tap the heart icon on styles you love.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-2xl px-8 mt-2 font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md gap-2">
          <Link href="/products">
            EXPLORE STYLES <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
            MY WISHLIST
          </h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">
            {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearWishlist}
          className="text-xs font-bold text-muted-foreground hover:text-rose-600"
        >
          CLEAR ALL
        </Button>
      </div>

      {/* Myntra-Style 4-Column Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const img =
            product.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
          const isBusy = actionLoadingId === product.id;
          const parsed = parseProductSpecs(product.description || '');
          const brandName = parsed.brand || product.category?.name || 'NOVASTORE';

          const comparePrice = product.comparePrice || Math.round(product.basePrice * 1.4);
          const hasDiscount = comparePrice > product.basePrice;
          const discountPct = hasDiscount
            ? Math.round(((comparePrice - product.basePrice) / comparePrice) * 100)
            : 0;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
            >
              {/* Product Visual Container (3:4 aspect ratio) */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/30">
                <Image
                  src={img}
                  alt={product.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Remove Cross Button */}
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={isBusy}
                  className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-background/85 backdrop-blur hover:bg-background text-muted-foreground hover:text-rose-600 flex items-center justify-center shadow-md transition-colors z-10"
                  title="Remove from wishlist"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Rating Badge Overlaid on bottom-left */}
                {product.avgRating > 0 && (
                  <div className="absolute bottom-2.5 left-2.5 bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-border/60 shadow-xs flex items-center gap-1 text-[11px] font-black text-foreground z-10">
                    <span>{product.avgRating.toFixed(1)}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>

              {/* Product Info Section */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-foreground truncate">
                    {brandName}
                  </h4>
                  <Link href={`/products/${product.slug}`}>
                    <p className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate font-normal mt-0.5">
                      {product.title}
                    </p>
                  </Link>

                  {/* Price Row */}
                  <div className="flex items-baseline gap-1.5 flex-wrap pt-1.5">
                    <span className="text-sm font-black text-foreground">
                      {formatPrice(product.basePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-muted-foreground line-through font-medium">
                        {formatPrice(comparePrice)}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                        ({discountPct}% OFF)
                      </span>
                    )}
                  </div>
                </div>

                {/* Move to Bag Button */}
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleMoveToCart(product.id)}
                    disabled={isBusy || !product.inStock}
                    className="w-full rounded-xl gap-1.5 font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {isBusy ? 'MOVING...' : product.inStock ? 'MOVE TO BAG' : 'OUT OF STOCK'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
