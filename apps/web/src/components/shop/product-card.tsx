'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag } from 'lucide-react';
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

  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

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
            <Image
              src={primaryImage}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
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
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center transition-all z-10 shadow-sm ${
              isWishlisted
                ? 'bg-rose-500 text-white'
                : 'bg-background/80 hover:bg-background text-muted-foreground hover:text-rose-500'
            }`}
            aria-label="Wishlist"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
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
