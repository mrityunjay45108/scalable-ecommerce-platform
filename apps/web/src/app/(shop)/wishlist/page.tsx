'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, ShoppingBag, Star, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPrice } from '@/lib/utils';
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
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 rounded-3xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Sign in to view your wishlist</h2>
          <p className="text-xs text-muted-foreground">
            Save products you love and sync them across all your devices.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="rounded-2xl px-6 font-bold shadow-md">
            <Link href="/login?callback=/wishlist">
              Sign In
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl px-6 font-semibold">
            <Link href="/register">
              Create Account
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
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Your wishlist is empty</h2>
          <p className="text-xs text-muted-foreground">
            Explore our curated catalog and tap the heart icon on items you'd like to save.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-2xl px-8 mt-2 font-bold shadow-md gap-2">
          <Link href="/products">
            Explore Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Saved Items</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} {items.length === 1 ? 'product' : 'products'} saved in your wishlist
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearWishlist}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const img =
            product.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
          const isBusy = actionLoadingId === product.id;

          return (
            <div
              key={item.id}
              className="rounded-3xl border bg-card p-4 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div>
                {/* Image */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-muted/40 mb-3">
                  <Image
                    src={img}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => handleRemove(product.id)}
                    disabled={isBusy}
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-background/80 backdrop-blur hover:bg-background text-muted-foreground hover:text-destructive flex items-center justify-center shadow-sm transition-colors"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Stock status badge */}
                  <span
                    className={`absolute bottom-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      product.inStock
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-destructive/90 text-white'
                    }`}
                  >
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                {/* Rating */}
                {product.avgRating > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mb-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{product.avgRating.toFixed(1)}</span>
                  </div>
                )}

                {/* Title */}
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-bold text-sm hover:text-primary transition-colors line-clamp-1">
                    {product.title}
                  </h3>
                </Link>

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-base font-extrabold text-foreground">
                    {formatPrice(product.basePrice)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.basePrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Move to Bag Action */}
              <div className="pt-3 border-t">
                <Button
                  size="sm"
                  onClick={() => handleMoveToCart(product.id)}
                  disabled={isBusy || !product.inStock}
                  className="w-full rounded-xl gap-2 font-bold text-xs shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isBusy ? 'Moving...' : product.inStock ? 'Move to Bag' : 'Out of Stock'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
