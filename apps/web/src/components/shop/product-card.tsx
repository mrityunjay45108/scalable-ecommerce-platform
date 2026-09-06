'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, Share2, Check } from 'lucide-react';
import { ProductDto } from '@ecommerce/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { parseProductSpecs } from '@/lib/product-specs';

interface ProductCardProps {
  product: ProductDto;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const isWishlisted = isInWishlist(product.id);
  const [isCopied, setIsCopied] = useState(false);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const specs = parseProductSpecs(product.description || '', product.category?.name);
  const brandName = specs.brand || product.category?.name || 'SWADESH LUXE';

  // Extract all valid image URLs (excluding dedicated videos)
  const imageList = (product.images || [])
    .filter((img) => img.altText !== 'video' && !img.url.includes('.mp4'))
    .map((img) => img.url);

  const images = imageList.length > 0
    ? imageList
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

  const currentImage = images[activeImageIndex % images.length];

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

  const ratingScore = Number(product.avgRating || 4.3).toFixed(1);
  const ratingCount = product.reviewCount || 142;

  // Segmented mouse-move preview (Myntra desktop hover slider)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const segmentWidth = rect.width / images.length;
    const index = Math.min(Math.floor(x / segmentWidth), images.length - 1);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setActiveImageIndex(0);
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`;
    const text = `Check out ${product.title} on SWADESH Luxe for ${formatPrice(product.basePrice)}!`;

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
    <div
      onMouseLeave={handleMouseLeave}
      className="group relative rounded-md sm:rounded-lg border border-border/50 hover:border-transparent bg-card overflow-hidden transition-all duration-200 hover:shadow-2xl flex flex-col justify-between"
    >
      <div>
        {/* ======================================================= */}
        {/* 1. ASPECT 3:4 MYNTRA FASHION IMAGE CONTAINER */}
        {/* ======================================================= */}
        <div
          onMouseMove={handleMouseMove}
          className="relative aspect-[3/4] w-full overflow-hidden bg-muted/20 cursor-pointer"
        >
          <Link href={`/products/${product.slug}`} className="relative block w-full h-full">
            <Image
              src={currentImage}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </Link>

          {/* Top Badges (Discount, Video, Heritage) */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {hasDiscount && discountPercent >= 10 && (
              <span className="bg-orange-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-xs uppercase tracking-wider shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
            {hasVideo && (
              <span className="bg-black/80 backdrop-blur-xs text-amber-300 font-extrabold text-[9px] px-1.5 py-0.5 rounded-xs flex items-center gap-1 shadow-xs">
                🎥 Video
              </span>
            )}
            {specs.region && (
              <span className="bg-amber-500/95 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-xs shadow-xs uppercase tracking-tight">
                🏛️ {specs.region.split(' ')[0]}
              </span>
            )}
          </div>

          {/* Top Right Actions: Floating Heart & Share */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
            <button
              onClick={handleWishlistClick}
              className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-all shadow-md backdrop-blur-md ${
                isWishlisted
                  ? 'bg-rose-500 text-white scale-105'
                  : 'bg-white/80 dark:bg-black/70 text-slate-700 dark:text-zinc-200 hover:text-rose-500 hover:scale-105'
              }`}
              aria-label="Wishlist"
              title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleShareClick}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-all shadow-md bg-white/80 dark:bg-black/70 text-slate-700 dark:text-zinc-200 hover:text-primary backdrop-blur-md hover:scale-105 opacity-0 group-hover:opacity-100 hidden sm:flex"
              title={isCopied ? 'Link Copied!' : 'Share'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Multi-Image Pagination Dots (Myntra Hover Slider) */}
          {images.length > 1 && (
            <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1 z-10 pointer-events-none transition-opacity duration-200 opacity-0 group-hover:opacity-100">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-200 ${
                    activeImageIndex === idx ? 'w-4 bg-orange-500 shadow-sm' : 'w-1.5 bg-white/70 dark:bg-zinc-400/70'
                  }`}
                />
              ))}
            </div>
          )}

          {/* MYNTRA RATING BADGE (Bottom-Left of Image) */}
          {/* Fades out on desktop hover to make room for Wishlist & Size strip */}
          <div className="absolute bottom-2 left-2 z-10 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
            <div className="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xs border border-border/40 text-[11px] font-extrabold text-slate-800 dark:text-zinc-200">
              <span className="font-black">{ratingScore}</span>
              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
              <span className="text-muted-foreground font-semibold text-[10px] pl-0.5 border-l border-border/60">
                {ratingCount > 999 ? `${(ratingCount / 1000).toFixed(1)}k` : ratingCount}
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 2. MYNTRA DESKTOP HOVER DRAWER (Sizes + Direct Wishlist) */}
          {/* ======================================================= */}
          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md border-t transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex flex-col gap-2 z-20 shadow-xl">
            {/* Myntra Wishlist Button */}
            <button
              onClick={handleWishlistClick}
              className={`w-full py-1.5 px-3 rounded text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                isWishlisted
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-500'
                  : 'bg-card hover:bg-muted text-foreground border border-border hover:border-foreground'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
              <span>{isWishlisted ? 'Wishlisted' : 'Wishlist'}</span>
            </button>

            {/* Myntra Sizes Bar */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Sizes:
                  </span>
                  {addedSuccessId && (
                    <span className="font-extrabold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Added!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {product.variants.slice(0, 6).map((v) => {
                    const isOut = v.availableStock <= 0;
                    const isAdding = addingVariantId === v.id;
                    const isSuccess = addedSuccessId === v.id;

                    return (
                      <button
                        key={v.id}
                        disabled={isOut || isAdding}
                        onClick={(e) => handleSelectSize(e, v.id)}
                        className={`h-6 px-1.5 min-w-[24px] rounded text-[10px] font-bold border transition-all flex items-center justify-center ${
                          isSuccess
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : isOut
                            ? 'border-border/40 opacity-40 line-through cursor-not-allowed bg-muted'
                            : 'border-border bg-card hover:border-primary hover:bg-primary hover:text-primary-foreground'
                        }`}
                        title={isOut ? 'Out of Stock' : `Add Size ${v.title}`}
                      >
                        {isAdding ? '...' : v.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* 3. MYNTRA PRODUCT METADATA (Brand, Subtitle, Price Row) */}
        {/* ======================================================= */}
        <div className="p-3 space-y-0.5">
          {/* Brand Name (Bold Uppercase) */}
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground truncate">
            {brandName}
          </h3>

          {/* Product Subtitle / Short Description */}
          <Link href={`/products/${product.slug}`} className="block">
            <p className="text-xs text-muted-foreground truncate font-normal hover:text-foreground transition-colors">
              {product.title}
            </p>
          </Link>

          {/* Pricing Row: Rs. 899  Rs. 1,999  (55% OFF) */}
          <div className="flex items-baseline gap-1.5 pt-0.5 flex-wrap">
            <span className="text-sm font-extrabold text-foreground">
              {formatPrice(product.basePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through font-normal">
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {hasDiscount && (
              <span className="text-xs font-bold text-[#ff905a] dark:text-orange-400">
                ({discountPercent}% OFF)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
