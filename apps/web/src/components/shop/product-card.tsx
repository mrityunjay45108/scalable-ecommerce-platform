'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag, Share2, Check } from 'lucide-react';
import { ProductDto } from '@ecommerce/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ProductCardProps {
  product: ProductDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const isWishlisted = isInWishlist(product.id);
  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`;
    const text = `Check out ${product.title} on NovaStore for ${formatPrice(product.basePrice)}!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text,
          url,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

  const secondaryImage =
    product.images && product.images.length > 1
      ? product.images.find((img) => !img.isPrimary && img.altText !== 'video')?.url || product.images[1]?.url
      : null;

  const hasVideo = product.images?.some(
    (img) =>
      img.altText === 'video' ||
      img.url.includes('.mp4') ||
      img.url.includes('youtube.com') ||
      img.url.includes('youtu.be'),
  );

  const defaultVariant = product.variants?.[0];
  const hasDiscount = product.comparePrice && product.comparePrice > product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.comparePrice! - product.basePrice) / product.comparePrice!) * 100)
    : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (defaultVariant) {
      await addToCart(defaultVariant.id, 1);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await toggleWishlist(product.id);
  };

  return (
    <div className="group relative rounded-2xl border bg-card p-3 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Thumbnail & Badges */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted/40 mb-3">
          <Link href={`/products/${product.slug}`} className="relative block w-full h-full">
            {/* Primary Image */}
            <Image
              src={primaryImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                secondaryImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'
              }`}
            />
            {/* Secondary Image (Hover preview) */}
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={`${product.title} alternate`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
              />
            )}
          </Link>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {hasDiscount && (
              <Badge variant="destructive" className="text-[10px] font-bold px-2">
                -{discountPercent}%
              </Badge>
            )}
            {product.isFeatured && (
              <Badge variant="default" className="text-[10px] font-bold px-2 bg-indigo-600">
                Featured
              </Badge>
            )}
            {hasVideo && (
              <span className="bg-black/70 backdrop-blur text-amber-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                🎥 Video
              </span>
            )}
          </div>

          {/* Action Icons: Share & Wishlist */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            <button
              onClick={handleShareClick}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm bg-background/80 hover:bg-background text-muted-foreground hover:text-primary backdrop-blur-sm"
              title={isCopied ? 'Link Copied!' : 'Share Product'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleWishlistClick}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-sm ${
                isWishlisted
                  ? 'bg-rose-500 text-white'
                  : 'bg-background/80 hover:bg-background text-muted-foreground hover:text-rose-500'
              }`}
              aria-label="Wishlist"
              title="Add to Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category & Title */}
        <div className="space-y-1">
          {product.category && (
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {product.category.name}
            </p>
          )}
          <Link href={`/products/${product.slug}`}>
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">
              {product.title}
            </h3>
          </Link>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t flex items-center justify-between">
        {/* Price & Rating */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-foreground">
              {formatPrice(product.basePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">
              {product.avgRating ? Number(product.avgRating).toFixed(1) : '5.0'}
            </span>
            <span className="text-[10px] text-muted-foreground">({product.reviewCount || 0})</span>
          </div>
        </div>

        {/* Add to Cart Action */}
        <Button
          size="icon"
          variant="secondary"
          onClick={handleQuickAdd}
          className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Add to Cart"
        >
          <ShoppingBag className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
