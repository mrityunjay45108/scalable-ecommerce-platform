'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  Tag,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Percent,
  AlertCircle,
  Truck,
  RotateCcw,
  Heart,
  CreditCard,
  CheckCircle2,
  Minus,
  Plus,
  ArrowLeft,
  Lock,
  MapPin,
  Gift,
  Zap,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface AvailableOffer {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
}

interface RecommendedProduct {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  images: { url: string }[];
  variants: { id: string; price: number }[];
}

const FREE_SHIPPING_THRESHOLD = 999;

export default function CartPage() {
  const {
    cart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    toggleWishlist,
    isInWishlist,
    addToCart,
  } = useCart();
  const { isAuthenticated } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [pincode, setPincode] = useState('110001');
  const [isChangingPincode, setIsChangingPincode] = useState(false);
  const [tempPincode, setTempPincode] = useState('110001');

  const items = cart?.items || [];
  const totalItemsCount = cart?.totalItems || items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = cart?.subtotal || items.reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice * item.quantity) || 0), 0);
  const discountAmount = cart?.discountAmount || 0;

  // Free shipping calculations
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0;
  const shippingCost = isFreeShipping ? 0 : 99;
  const freeShippingDiff = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Myntra MRP Discount calculations
  const totalMRP = Math.round(subtotal * 1.38);
  const mrpDiscount = totalMRP - subtotal;
  const totalSavings = mrpDiscount + discountAmount + (isFreeShipping && subtotal > 0 ? 99 : 0);
  const estimatedTax = Number(((subtotal - discountAmount) * 0.18).toFixed(2));
  const orderTotal = Number((subtotal - discountAmount + shippingCost + estimatedTax).toFixed(2));

  // Fetch active store offers and recommendations
  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoadingOffers(true);
      try {
        const data = await apiClient.get('/coupons/active');
        setAvailableOffers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load active offers', err);
      } finally {
        setIsLoadingOffers(false);
      }
    };

    const fetchRecommendations = async () => {
      try {
        const res = await apiClient.get('/products/featured');
        const list = res?.data || res || [];
        if (Array.isArray(list)) {
          setRecommendations(list.slice(0, 4));
        }
      } catch {
        // ignore
      }
    };

    fetchOffers();
    fetchRecommendations();
  }, []);

  const handleApplyCoupon = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      await applyCoupon(codeToApply.trim());
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired promo code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddRecommended = async (product: RecommendedProduct) => {
    const variantId = product.variants?.[0]?.id;
    if (!variantId) return;
    setAddingId(product.id);
    try {
      await addToCart(variantId, 1);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  if (!cart || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg space-y-6">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/60" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold uppercase tracking-wider text-foreground">
            Hey, your bag is empty!
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There is nothing in your bag. Let's add some items from our bestsellers and fresh arrivals.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-xl px-8 font-bold bg-[#ff3f6c] hover:bg-[#e0355f] text-white text-xs uppercase tracking-wider h-11 shadow-md gap-2"
          >
            <Link href="/products">
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider h-11">
            <Link href="/wishlist">Add From Wishlist</Link>
          </Button>
        </div>

        {/* Popular Categories */}
        <div className="pt-10 border-t space-y-3">
          <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
            Popular Categories to Explore
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Audio & Headphones', 'Mechanical Keyboards', 'Displays', 'Smartphones', 'Accessories'].map((cat) => (
              <Link
                key={cat}
                href={`/products?search=${cat.toLowerCase()}`}
                className="text-xs px-4 py-1.5 rounded-full border bg-card hover:bg-muted/80 font-medium transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-10 space-y-8 max-w-6xl">
      {/* Myntra-Style Breadcrumb Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/products" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* 3 Step Checkout Stepper */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="text-[#ff3f6c] border-b-2 border-[#ff3f6c] pb-0.5">1. BAG</span>
          <span>----------</span>
          <span>2. ADDRESS</span>
          <span>----------</span>
          <span>3. PAYMENT</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% SECURE</span>
        </div>
      </div>

      {/* Main Grid: Items (Left) vs Price Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column (7 cols): Pincode, Free Shipping, Items, Offers, Trust */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Deliver to Pincode Strip */}
          <div className="p-3.5 rounded-2xl border bg-card flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#ff3f6c]" />
              {isChangingPincode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={tempPincode}
                    onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ''))}
                    className="w-24 h-7 px-2 text-xs rounded border bg-background font-mono font-bold"
                  />
                  <button
                    onClick={() => {
                      setPincode(tempPincode || '110001');
                      setIsChangingPincode(false);
                    }}
                    className="text-xs font-black text-[#ff3f6c] uppercase hover:underline"
                  >
                    CHECK
                  </button>
                </div>
              ) : (
                <span>
                  Deliver to: <strong className="text-foreground font-bold">{pincode}</strong> (Standard Express Delivery)
                </span>
              )}
            </div>
            {!isChangingPincode && (
              <button
                onClick={() => setIsChangingPincode(true)}
                className="text-xs font-black text-[#ff3f6c] uppercase hover:underline"
              >
                CHANGE PINCODE
              </button>
            )}
          </div>

          {/* Free Shipping Progress Tracker */}
          <div className="p-4 rounded-2xl border bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-foreground">
                <Truck className={`w-4 h-4 ${isFreeShipping ? 'text-emerald-500' : 'text-[#ff3f6c]'}`} />
                {isFreeShipping ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    🎉 Yay! You have unlocked FREE Express Delivery on this order!
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-[#ff3f6c] font-bold">{formatPrice(freeShippingDiff)}</strong> more to get <strong>FREE Express Delivery</strong>
                  </span>
                )}
              </span>
              <span className="text-xs font-extrabold text-muted-foreground">
                {Math.round(freeShippingProgress)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFreeShipping
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-[#ff3f6c] to-amber-500'
                }`}
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items Header */}
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-muted-foreground pt-1">
            <span>Items in Bag ({totalItemsCount})</span>
            <button
              onClick={clearCart}
              className="text-muted-foreground hover:text-destructive font-bold transition-colors"
            >
              CLEAR ALL
            </button>
          </div>

          {/* Cart Item Cards */}
          <div className="space-y-3.5">
            {items.map((item) => {
              const product = item.variant?.product || (item as any).product;
              const title = product?.title || (item as any).title || 'Product Item';
              const variantTitle = item.variant?.title || 'Standard';
              const img =
                product?.images?.[0]?.url ||
                (item as any).image ||
                (item as any).imageUrl ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
              const inWish = product?.id ? isInWishlist(product.id) : false;
              const unitPrice = item.unitPrice || (item.totalPrice ? item.totalPrice / (item.quantity || 1) : 499);
              const originalMRP = Math.round(unitPrice * 1.38);
              const discountPercent = Math.round(((originalMRP - unitPrice) / originalMRP) * 100);

              return (
                <div
                  key={item.id || item.variantId}
                  className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs relative group transition-all"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id || item.variantId)}
                    className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded-full transition-colors"
                    title="Remove item"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex gap-4 sm:gap-5">
                    {/* Thumbnail */}
                    <Link
                      href={`/products/${product?.slug || ''}`}
                      className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden bg-muted/60 flex-shrink-0 border border-border/50"
                    >
                      <Image
                        src={img}
                        alt={title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </Link>

                    {/* Meta Details */}
                    <div className="flex-1 min-w-0 pr-6 space-y-2">
                      <div>
                        <p className="text-xs font-black text-[#ff3f6c] uppercase tracking-wider">
                          NOVASTORE AUTHENTIC
                        </p>
                        <Link
                          href={`/products/${product?.slug || ''}`}
                          className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors line-clamp-1 block"
                        >
                          {title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Sold by: <span className="font-semibold text-foreground">RetailNet Flagship</span>
                        </p>
                      </div>

                      {/* Size & Quantity Selectors */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="px-2.5 py-1 rounded-md bg-muted border text-xs font-bold text-foreground">
                          Size: <span className="text-[#ff3f6c]">{variantTitle}</span>
                        </div>

                        <div className="flex items-center border rounded-md bg-muted/60">
                          <button
                            onClick={() =>
                              updateCartItem(item.id || item.variantId, Math.max(1, (item.quantity || 1) - 1))
                            }
                            disabled={(item.quantity || 1) <= 1}
                            className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-l text-foreground font-bold disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-extrabold text-xs">
                            {item.quantity || 1}
                          </span>
                          <button
                            disabled={(item.quantity || 1) >= (item.variant?.availableStock || 99)}
                            onClick={() =>
                              updateCartItem(item.id || item.variantId, (item.quantity || 1) + 1)
                            }
                            className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-r text-foreground font-bold disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Row */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <span className="font-black text-base sm:text-lg text-foreground">
                          {formatPrice(unitPrice * (item.quantity || 1))}
                        </span>
                        <span className="text-xs text-muted-foreground line-through font-semibold">
                          {formatPrice(originalMRP * (item.quantity || 1))}
                        </span>
                        <span className="text-xs font-black text-[#ff3f6c]">
                          ({discountPercent}% OFF)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Tags: Return & Delivery */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                      <strong className="text-foreground">14 days</strong> return available
                    </span>
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Truck className="w-3.5 h-3.5 text-primary" /> Delivery by <strong className="text-emerald-600 dark:text-emerald-400">Tomorrow</strong>
                    </span>
                  </div>

                  {/* Move to Wishlist Link */}
                  {product?.id && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center justify-end gap-3 text-xs font-black">
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className={`flex items-center gap-1.5 transition-colors uppercase tracking-wider ${
                          inWish ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${inWish ? 'fill-current' : ''}`} />
                        <span>{inWish ? 'SAVED IN WISHLIST' : 'MOVE TO WISHLIST'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Deals & Coupons Strip */}
          {availableOffers.length > 0 && (
            <div className="rounded-3xl border border-dashed border-[#ff3f6c]/40 bg-[#ff3f6c]/5 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#ff3f6c]" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-foreground">
                    Available Coupons & Bank Offers
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  {availableOffers.length} offers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableOffers.map((offer) => {
                  const isApplied = cart?.coupon?.code === offer.code;
                  const isEligible = !offer.minOrderValue || subtotal >= offer.minOrderValue;
                  const diff = offer.minOrderValue ? offer.minOrderValue - subtotal : 0;

                  return (
                    <div
                      key={offer.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isApplied
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
                          : isEligible
                          ? 'border-[#ff3f6c]/30 bg-card hover:border-[#ff3f6c]/60'
                          : 'border-border bg-muted/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge
                            variant={isApplied ? 'default' : 'secondary'}
                            className={`font-mono text-xs font-black uppercase px-2 py-0.5 ${
                              isApplied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#ff3f6c]/10 text-[#ff3f6c] border border-[#ff3f6c]/30'
                            }`}
                          >
                            {offer.code}
                          </Badge>
                          <p className="text-xs font-bold text-foreground pt-1.5">
                            {offer.discountType === 'PERCENTAGE'
                              ? `Save ${offer.discountValue}% on your order`
                              : offer.discountType === 'FIXED_AMOUNT'
                              ? `Save flat ${formatPrice(offer.discountValue)}`
                              : 'FREE Delivery'}
                          </p>
                          {offer.minOrderValue && (
                            <p className="text-[11px] text-muted-foreground">
                              Min order: {formatPrice(offer.minOrderValue)}
                            </p>
                          )}
                        </div>

                        <div>
                          {isApplied ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleRemoveCoupon}
                              className="h-7 text-xs font-bold text-destructive px-2 rounded-xl"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!isEligible || isApplyingCoupon}
                              onClick={() => handleApplyCoupon(offer.code)}
                              className="h-7 text-xs font-black rounded-xl px-3 bg-[#ff3f6c] hover:bg-[#e0355f] text-white"
                            >
                              APPLY
                            </Button>
                          )}
                        </div>
                      </div>

                      {!isEligible && diff > 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          Add {formatPrice(diff)} more to unlock this offer
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trust Guarantee Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { icon: ShieldCheck, title: '100% Genuine', desc: 'Direct from brand' },
              { icon: RotateCcw, title: '14 Days Return', desc: 'Hassle-free exchange' },
              { icon: Truck, title: 'Express Delivery', desc: 'Tracked dispatch' },
              { icon: Lock, title: '256-Bit SSL', desc: 'Encrypted checkout' },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="p-3.5 rounded-2xl border bg-card text-center space-y-1">
                  <Icon className="w-5 h-5 text-[#ff3f6c] mx-auto" />
                  <p className="text-xs font-black text-foreground">{feature.title}</p>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Coupons, Gifting, Sticky Price Details, Place Order */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-4">
          {/* Apply Coupon Box */}
          <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#ff3f6c]" /> Coupons
            </h3>

            {cart.coupon ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-bold">
                <span>
                  Code <strong>{cart.coupon.code}</strong> Applied (-{formatPrice(cart.coupon.discountAmount)})
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs font-extrabold text-destructive hover:underline"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCoupon(couponCode);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 h-9 px-3 text-xs rounded-xl border bg-background uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-[#ff3f6c]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="h-9 px-4 text-xs font-black rounded-xl bg-[#ff3f6c] hover:bg-[#e0355f] text-white"
                  >
                    {isApplyingCoupon ? '...' : 'APPLY'}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {couponError}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Gifting Box */}
          <div className="p-3.5 rounded-2xl border bg-card flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Gift className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-bold text-foreground">Gifting for someone?</p>
                <p className="text-[10px] text-muted-foreground">Add gift box with personalized note for ₹25</p>
              </div>
            </div>
            <button className="text-[11px] font-black text-[#ff3f6c] uppercase hover:underline">
              ADD
            </button>
          </div>

          {/* Price Details Card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="font-black text-xs uppercase tracking-wider text-muted-foreground border-b pb-3">
              PRICE DETAILS ({totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'})
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total MRP</span>
                <span className="font-semibold text-foreground">{formatPrice(totalMRP)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Discount on MRP</span>
                <span>-{formatPrice(mrpDiscount)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Coupon Discount ({cart.coupon?.code})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Convenience / Platform Fee</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Shipping Fee</span>
                <span className="font-semibold text-foreground">
                  {isFreeShipping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Estimated GST (18%)</span>
                <span className="font-semibold text-foreground">{formatPrice(estimatedTax)}</span>
              </div>

              <div className="flex justify-between text-base font-black text-foreground pt-3 border-t border-border">
                <span>Total Amount</span>
                <span className="text-lg text-foreground">{formatPrice(orderTotal)}</span>
              </div>
            </div>

            {/* Total Savings Ribbon */}
            {totalSavings > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
                🎉 You will save <strong>{formatPrice(totalSavings)}</strong> on this order!
              </div>
            )}

            {/* PLACE ORDER Button */}
            <Button
              asChild
              size="lg"
              className="w-full rounded-xl font-black text-sm h-12 bg-[#ff3f6c] hover:bg-[#e0355f] text-white tracking-wider uppercase shadow-xl gap-2"
            >
              <Link href={isAuthenticated ? '/checkout' : '/login?callback=/checkout'}>
                PLACE ORDER <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            {/* Safe Checkout Banner */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Safe & Secure Payments • Instant Refund Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
