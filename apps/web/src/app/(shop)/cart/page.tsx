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
  endDate: string;
}

export default function CartPage() {
  const { cart, updateCartItem, removeFromCart, clearCart, applyCoupon, removeCoupon } = useCart();
  const { isAuthenticated } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discountAmount || 0;
  const shippingCost =
    cart?.shippingAmount !== undefined
      ? cart.shippingAmount
      : subtotal > 100 || subtotal === 0
      ? 0
      : 10;
  const estimatedTax =
    cart?.estimatedTax !== undefined
      ? cart.estimatedTax
      : Number(((subtotal - discountAmount) * 0.08).toFixed(2));
  const orderTotal =
    cart?.totalAmount !== undefined
      ? cart.totalAmount
      : Number((subtotal - discountAmount + estimatedTax + shippingCost).toFixed(2));

  // Fetch active store offers created by Admin
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
    fetchOffers();
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

  if (!cart || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">Your Bag is Empty</h2>
        <p className="text-sm text-muted-foreground">
          Looks like you haven't added anything to your cart yet. Explore our curated catalog of premium gear.
        </p>
        <Button asChild size="lg" className="rounded-2xl px-8 mt-2 font-bold shadow-md">
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Shopping Bag</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{cart.totalItems} items in your order</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Cart Items List & Available Offers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {items.map((item) => {
              const product = item.variant?.product;
              const img =
                product?.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';

              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-3xl border bg-card shadow-sm items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted/40 flex-shrink-0">
                      <Image
                        src={img}
                        alt={product?.title || 'Product'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <Link href={`/products/${product?.slug || ''}`}>
                        <h4 className="text-sm font-bold hover:text-primary transition-colors line-clamp-1">
                          {product?.title}
                        </h4>
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.variant?.title}</p>
                      <p className="text-xs font-semibold text-foreground sm:hidden">
                        {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Quantity Controls */}
                    <div className="flex items-center border rounded-xl bg-muted/40 p-0.5">
                      <button
                        onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background disabled:opacity-30 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        disabled={item.quantity >= (item.variant?.availableStock || 99)}
                        onClick={() => updateCartItem(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background text-xs font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="text-sm font-bold">{formatPrice(item.totalPrice)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ({formatPrice(item.unitPrice)} ea)
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ACTIVE STORE OFFERS SECTION */}
          {availableOffers.length > 0 && (
            <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <h3 className="font-extrabold text-sm tracking-tight text-foreground">
                    Available Offers & Discounts
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {availableOffers.length} {availableOffers.length === 1 ? 'offer' : 'offers'} active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {availableOffers.map((offer) => {
                  const isApplied = cart?.coupon?.code === offer.code;
                  const isEligible = !offer.minOrderValue || subtotal >= offer.minOrderValue;
                  const diff = offer.minOrderValue ? offer.minOrderValue - subtotal : 0;

                  return (
                    <div
                      key={offer.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isApplied
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-sm'
                          : isEligible
                          ? 'border-primary/30 bg-card hover:border-primary/60 hover:shadow-sm'
                          : 'border-border/60 bg-muted/20 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={isApplied ? 'default' : 'secondary'}
                              className={`font-mono text-[11px] font-extrabold uppercase px-2 py-0.5 ${
                                isApplied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-primary/10 text-primary border border-primary/20'
                              }`}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {offer.code}
                            </Badge>
                            {isApplied && (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <Check className="w-3.5 h-3.5" /> Applied
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-foreground pt-0.5">
                            {offer.discountType === 'PERCENTAGE'
                              ? `${offer.discountValue}% OFF`
                              : offer.discountType === 'FIXED_AMOUNT'
                              ? `${formatPrice(offer.discountValue)} OFF`
                              : 'FREE SHIPPING'}
                            {offer.maxDiscount ? ` (Up to ${formatPrice(offer.maxDiscount)})` : ''}
                          </p>
                          {offer.minOrderValue && (
                            <p className="text-[11px] text-muted-foreground">
                              On orders above {formatPrice(offer.minOrderValue)}
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <div>
                          {isApplied ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleRemoveCoupon}
                              className="h-7 text-xs font-bold text-destructive hover:bg-destructive/10 px-2 rounded-xl"
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!isEligible || isApplyingCoupon}
                              onClick={() => handleApplyCoupon(offer.code)}
                              className="h-7 text-xs font-bold rounded-xl px-3 shadow-sm"
                            >
                              {isApplyingCoupon ? '...' : 'Apply'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {!isEligible && diff > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>Add {formatPrice(diff)} more to unlock this offer</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary & Coupon Input */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-lg">Order Summary</h3>

          {/* Coupon Code input / Applied Coupon */}
          {cart.coupon ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>{cart.coupon.code}</strong> applied (-{formatPrice(cart.coupon.discountAmount)})
                </span>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Remove Coupon"
              >
                <X className="w-4 h-4" />
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
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter Promo Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary uppercase font-mono"
                  />
                  <Tag className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3" />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="rounded-xl font-bold"
                >
                  {isApplyingCoupon ? '...' : 'Apply'}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {couponError}
                </p>
              )}
            </form>
          )}

          {/* Price Breakdown */}
          <div className="space-y-2.5 pt-2 text-xs border-t">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount ({cart.coupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated Shipping</span>
              <span className="font-medium text-foreground">
                {shippingCost === 0 ? (
                  <span className="text-emerald-600 font-semibold">FREE</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated Tax (8%)</span>
              <span className="font-medium text-foreground">{formatPrice(estimatedTax)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-foreground pt-3 border-t">
              <span>Total</span>
              <span className="text-primary">{formatPrice(orderTotal)}</span>
            </div>
          </div>

          <Button asChild size="lg" className="w-full rounded-2xl font-bold gap-2 shadow-md">
            <Link href={isAuthenticated ? '/checkout' : '/login?callback=/checkout'}>
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Guaranteed Safe & Secure 256-Bit SSL Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}
