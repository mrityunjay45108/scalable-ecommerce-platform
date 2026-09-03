'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag, Share2, Check, Zap } from 'lucide-react';
import { ProductDto } from '@ecommerce/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { parseProductSpecs } from '@/lib/product-specs';
import { Badge } from '../ui/badge';

interface ProductCardProps {
  product: ProductDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const isWishlisted = isInWishlist(product.id);
  const [isCopied, setIsCopied] = useState(false);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

  const specs = parseProductSpecs(product.description || '', product.category?.name);
  const brandName = specs.brand || product.category?.name || 'NovaStore';

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

  const hasDiscount = product.comparePrice && product.comparePrice > product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.comparePrice! - product.basePrice) / product.comparePrice!) * 100)
    : 0;

  const ratingScore = Number(product.avgRating || 4.5).toFixed(1);
  const ratingCount = product.reviewCount || 128;

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`;
    const text = `Check out ${product.title} on NovaStore for ${formatPrice(product.basePrice)}!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: product.title, text, url });
        return;
      } catch (err) {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSelectSize = async (e: React.MouseEvent, variantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingVariantId(variantId);
    try {
      await addToCart(variantId, 1);
      setAddedSuccessId(variantId);
      setTimeout(() => setAddedSuccessId(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingVariantId(null);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/40 flex flex-col justify-between">
      <div>
        {/* Aspect 3:4 Fashion Image Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/30">
          <Link href={`/products/${product.slug}`} className="relative block w-full h-full">
            {/* Primary Image */}
            <Image
              src={primaryImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className={`object-cover transition-all duration-500 ${
                secondaryImage ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'
              }`}
            />
            {/* Secondary Image on Hover */}
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={`${product.title} alternate`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="object-cover opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
              />
            )}
          </Link>

          {/* MYNTRA RATING BADGE (Bottom-Left of Image) */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <div className="flex items-center gap-1 bg-background/90 dark:bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs border border-border/40 text-[11px] font-extrabold text-foreground">
              <span className="font-black">{ratingScore}</span>
              <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
              <span className="text-muted-foreground font-semibold text-[10px] pl-0.5 border-l border-border/80">
                {ratingCount > 999 ? `${(ratingCount / 1000).toFixed(1)}k` : ratingCount}
              </span>
            </div>
          </div>

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {hasDiscount && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
            {hasVideo && (
              <span className="bg-black/70 backdrop-blur-xs text-amber-400 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                🎥 Video
              </span>
            )}
          </div>

          {/* Action Icons: Share & Wishlist */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
            <button
              onClick={handleWishlistClick}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md backdrop-blur-md ${
                isWishlisted
                  ? 'bg-rose-500 text-white shadow-rose-500/30 scale-110'
                  : 'bg-background/80 hover:bg-background text-muted-foreground hover:text-rose-500 hover:scale-105'
              }`}
              aria-label="Wishlist"
              title="Add to Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleShareClick}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md bg-background/80 hover:bg-background text-muted-foreground hover:text-primary backdrop-blur-md hover:scale-105"
              title={isCopied ? 'Link Copied!' : 'Share Product'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* MYNTRA QUICK-ADD SIZE SELECTOR OVERLAY (Slides Up on Desktop Hover) */}
          {product.variants && product.variants.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-background/95 dark:bg-card/95 backdrop-blur-md border-t transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex flex-col gap-1.5 z-20 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Size to Add:
                </span>
                {addedSuccessId && (
                  <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Added to Bag
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.variants.slice(0, 6).map((v) => {
                  const isOut = v.availableStock <= 0;
                  const isAdding = addingVariantId === v.id;
                  const isSuccess = addedSuccessId === v.id;

                  return (
                    <button
                      key={v.id}
                      disabled={isOut || isAdding}
                      onClick={(e) => handleSelectSize(e, v.id)}
                      className={`h-7 px-2 min-w-[28px] rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                        isSuccess
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : isOut
                          ? 'border-border/40 opacity-40 line-through cursor-not-allowed bg-muted'
                          : 'border-border bg-card hover:border-primary hover:bg-primary hover:text-primary-foreground shadow-xs'
                      }`}
                      title={isOut ? 'Out of Stock' : `Quick Add Size ${v.title}`}
                    >
                      {isAdding ? '...' : v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MYNTRA PRODUCT METADATA */}
        <div className="p-3.5 space-y-1">
          {/* Brand Name */}
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground truncate">
            {brandName}
          </h3>

          {/* Product Title / Subtitle */}
          <Link href={`/products/${product.slug}`} className="block">
            <p className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors font-medium">
              {product.title}
            </p>
          </Link>

          {/* Myntra Price Row: Rs. 899 Rs. 1,999 (55% OFF) */}
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-sm font-black text-foreground">
              {formatPrice(product.basePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through font-normal">
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {hasDiscount && (
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                ({discountPercent}% OFF)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
