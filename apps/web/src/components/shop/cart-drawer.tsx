'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  X,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Check,
  Sparkles,
  AlertCircle,
  Truck,
  Heart,
  RotateCcw,
  Plus,
  Minus,
  MapPin,
  Gift,
  Zap,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
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

const FREE_SHIPPING_THRESHOLD = 999;

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateCartItem,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    toggleWishlist,
    isInWishlist,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [pincode, setPincode] = useState('110001');
  const [isChangingPincode, setIsChangingPincode] = useState(false);
  const [tempPincode, setTempPincode] = useState('110001');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isCartOpen) {
      apiClient
        .get('/coupons/active')
        .then((res) => {
          if (Array.isArray(res)) setAvailableOffers(res);
        })
        .catch(() => {});
    }
  }, [isCartOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  if (!mounted || !isCartOpen) return null;

  const items = cart?.items || [];
  const totalItemsCount = cart?.totalItems || items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const subtotal = cart?.subtotal || items.reduce((sum, item) => sum + (item.totalPrice || (item.unitPrice * item.quantity) || 0), 0);
  const discount = cart?.discountAmount || 0;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0;
  const shippingCost = isFreeShipping ? 0 : 99;
  const freeShippingDiff = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Myntra style MRP calculation
  const totalMRP = Math.round(subtotal * 1.38);
  const mrpDiscount = totalMRP - subtotal;
  const totalSavings = mrpDiscount + discount + (isFreeShipping && subtotal > 0 ? 99 : 0);
  const estimatedTax = Number(((subtotal - discount) * 0.18).toFixed(2));
  const finalPayable = Number((subtotal - discount + shippingCost + estimatedTax).toFixed(2));

  const handleApply = async (code: string) => {
    if (!code.trim()) return;
    setIsApplying(true);
    setPromoError('');
    try {
      await applyCoupon(code.trim());
      setPromoCodeInput('');
      setShowPromoInput(false);
    } catch (err: any) {
      setPromoError(err.message || 'Invalid or expired coupon code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeCoupon();
    } catch (err) {
      console.error(err);
    }
  };

  const drawerContent = (
    <div className="fixed inset-0 z-[99999] overflow-hidden">
      {/* Dark Blur Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 z-[100000]">
        <div className="w-screen max-w-md sm:max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
          
          {/* Myntra-Style Header */}
          <div className="px-4 py-3.5 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3f6c]" />
              <h2 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-foreground">
                Shopping Bag
              </h2>
              <span className="text-xs text-muted-foreground font-bold">
                ({totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'})
              </span>
            </div>

            {/* Stepper text */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <span className="text-[#ff3f6c] border-b-2 border-[#ff3f6c] pb-0.5">BAG</span>
              <span>---------</span>
              <span>ADDRESS</span>
              <span>---------</span>
              <span>PAYMENT</span>
            </div>

            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close Shopping Bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Pincode Bar (Myntra Style) */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border text-xs flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#ff3f6c] flex-shrink-0" />
                {isChangingPincode ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={tempPincode}
                      onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ''))}
                      className="w-20 h-6 px-1.5 text-xs rounded border bg-background font-mono font-bold"
                    />
                    <button
                      onClick={() => {
                        setPincode(tempPincode || '110001');
                        setIsChangingPincode(false);
                      }}
                      className="text-[11px] font-extrabold text-[#ff3f6c] uppercase hover:underline"
                    >
                      CHECK
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Deliver to: <strong className="text-foreground font-bold">{pincode}</strong>
                  </span>
                )}
              </div>
              {!isChangingPincode && (
                <button
                  onClick={() => setIsChangingPincode(true)}
                  className="text-[11px] font-extrabold text-[#ff3f6c] uppercase hover:underline"
                >
                  CHANGE PINCODE
                </button>
              )}
            </div>
          )}

          {/* Free Shipping Progress Tracker */}
          {items.length > 0 && (
            <div className="px-4 py-2 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 border-b border-border/80 text-[11px] space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Truck className={`w-3.5 h-3.5 ${isFreeShipping ? 'text-emerald-500' : 'text-[#ff3f6c]'}`} />
                  {isFreeShipping ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      🎉 Yay! You get FREE Express Delivery!
                    </span>
                  ) : (
                    <span>
                      Add <strong className="text-[#ff3f6c] font-bold">{formatPrice(freeShippingDiff)}</strong> more for <strong>FREE Delivery</strong>
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-extrabold text-muted-foreground">
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
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/20">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center relative">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/60" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <p className="font-extrabold text-base text-foreground uppercase tracking-wider">
                    Hey, your bag is empty!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    There is nothing in your bag. Let's add some items.
                  </p>
                </div>
                <Button
                  onClick={closeCart}
                  asChild
                  className="rounded-xl font-bold bg-[#ff3f6c] hover:bg-[#e0355f] text-white px-8 text-xs tracking-wider uppercase h-10 shadow-md"
                >
                  <Link href="/products">Add Items From Store</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const product = item.variant?.product || (item as any).product;
                const title = product?.title || (item as any).title || 'Product Item';
                const variantTitle = item.variant?.title || 'Standard';
                const img =
                  product?.images?.[0]?.url ||
                  (item as any).image ||
                  (item as any).imageUrl ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                const inWish = product?.id ? isInWishlist(product.id) : false;
                const unitPrice = item.unitPrice || (item.totalPrice ? item.totalPrice / (item.quantity || 1) : 499);
                const originalMRP = Math.round(unitPrice * 1.38);
                const discountPercent = Math.round(((originalMRP - unitPrice) / originalMRP) * 100);

                return (
                  <div
                    key={item.id || item.variantId}
                    className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs relative group transition-all"
                  >
                    {/* Cross / Remove Button on Top Right */}
                    <button
                      onClick={() => removeFromCart(item.id || item.variantId)}
                      className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      title="Remove Item"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex gap-3.5">
                      {/* Product Thumbnail */}
                      <Link
                        href={`/products/${product?.slug || ''}`}
                        onClick={closeCart}
                        className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-muted/60 flex-shrink-0 border border-border/50"
                      >
                        <Image
                          src={img}
                          alt={title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </Link>

                      {/* Product Meta */}
                      <div className="flex-1 min-w-0 pr-6 space-y-1.5">
                        <div>
                          <p className="text-[11px] font-extrabold text-[#ff3f6c] uppercase tracking-wider">
                            NOVASTORE AUTHENTIC
                          </p>
                          <Link
                            href={`/products/${product?.slug || ''}`}
                            onClick={closeCart}
                            className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors line-clamp-1 block"
                          >
                            {title}
                          </Link>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Sold by: <span className="font-semibold text-foreground">RetailNet Flagship</span>
                          </p>
                        </div>

                        {/* Size & Quantity Selector Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {/* Size Pill */}
                          <div className="px-2 py-0.5 rounded-md bg-muted/80 border text-[11px] font-bold text-foreground flex items-center gap-1">
                            <span>Size:</span>
                            <span className="text-[#ff3f6c]">{variantTitle}</span>
                          </div>

                          {/* Qty Pill Stepper */}
                          <div className="flex items-center border rounded-md bg-muted/60">
                            <button
                              onClick={() =>
                                updateCartItem(item.id || item.variantId, Math.max(1, (item.quantity || 1) - 1))
                              }
                              disabled={(item.quantity || 1) <= 1}
                              className="w-5 h-5 flex items-center justify-center hover:bg-background rounded-l text-foreground font-bold disabled:opacity-30"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 text-center font-extrabold text-[11px]">
                              {item.quantity || 1}
                            </span>
                            <button
                              disabled={(item.quantity || 1) >= (item.variant?.availableStock || 99)}
                              onClick={() =>
                                updateCartItem(item.id || item.variantId, (item.quantity || 1) + 1)
                              }
                              className="w-5 h-5 flex items-center justify-center hover:bg-background rounded-r text-foreground font-bold disabled:opacity-30"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="font-extrabold text-sm text-foreground">
                            {formatPrice(unitPrice * (item.quantity || 1))}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(originalMRP * (item.quantity || 1))}
                          </span>
                          <span className="text-xs font-bold text-[#ff3f6c]">
                            ({discountPercent}% OFF)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery & Return Assurance Tag */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-emerald-500" />
                        <strong className="text-foreground">14 days</strong> return available
                      </span>
                      <span className="flex items-center gap-1 text-foreground font-semibold">
                        <Truck className="w-3 h-3 text-primary" /> Delivery by <strong className="text-emerald-600 dark:text-emerald-400">Tomorrow</strong>
                      </span>
                    </div>

                    {/* Move to Wishlist / Remove action links */}
                    {product?.id && (
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-end gap-3 text-xs font-bold">
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className={`flex items-center gap-1 transition-colors ${
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
              })
            )}

            {/* Myntra Style Apply Coupons Box */}
            {items.length > 0 && (
              <div className="p-3.5 rounded-2xl border border-dashed border-[#ff3f6c]/40 bg-[#ff3f6c]/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#ff3f6c]" />
                    <span className="font-extrabold text-xs uppercase tracking-wider text-foreground">
                      Apply Coupons
                    </span>
                  </div>
                  {cart?.coupon ? (
                    <button
                      onClick={handleRemove}
                      className="text-xs font-bold text-destructive hover:underline"
                    >
                      REMOVE
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPromoInput(!showPromoInput)}
                      className="text-xs font-extrabold text-[#ff3f6c] uppercase hover:underline"
                    >
                      {showPromoInput ? 'CLOSE' : 'APPLY'}
                    </button>
                  )}
                </div>

                {cart?.coupon ? (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Coupon '{cart.coupon.code}' applied (-{formatPrice(cart.coupon.discountAmount)})
                    </span>
                  </div>
                ) : (
                  <>
                    {showPromoInput && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="ENTER COUPON CODE"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 h-8 px-2.5 text-xs rounded-lg border bg-background uppercase font-mono tracking-wider focus:ring-1 focus:ring-[#ff3f6c]"
                        />
                        <Button
                          size="sm"
                          disabled={isApplying || !promoCodeInput.trim()}
                          onClick={() => handleApply(promoCodeInput)}
                          className="h-8 text-xs font-bold px-3.5 bg-[#ff3f6c] hover:bg-[#e0355f] text-white rounded-lg"
                        >
                          {isApplying ? '...' : 'APPLY'}
                        </Button>
                      </div>
                    )}

                    {promoError && (
                      <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {promoError}
                      </p>
                    )}

                    {/* Quick 1-Click Available Offers Chips */}
                    {availableOffers.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                        {availableOffers.map((off) => {
                          const eligible = !off.minOrderValue || subtotal >= off.minOrderValue;
                          return (
                            <button
                              key={off.id}
                              disabled={!eligible || isApplying}
                              onClick={() => handleApply(off.code)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-extrabold whitespace-nowrap transition-all ${
                                eligible
                                  ? 'bg-card border-[#ff3f6c]/30 text-[#ff3f6c] hover:bg-[#ff3f6c]/10 cursor-pointer shadow-2xs'
                                  : 'bg-muted/40 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <span>{off.code}</span>
                              <span className="font-medium opacity-80">
                                ({off.discountType === 'PERCENTAGE' ? `${off.discountValue}%` : formatPrice(off.discountValue)})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Gifting & Personalisation */}
            {items.length > 0 && (
              <div className="p-3 rounded-2xl border bg-card flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="font-bold text-foreground">Buying for a loved one?</p>
                    <p className="text-[10px] text-muted-foreground">Add gift wrap with personalized message for ₹25</p>
                  </div>
                </div>
                <button className="text-[11px] font-extrabold text-[#ff3f6c] uppercase hover:underline">
                  ADD GIFT WRAP
                </button>
              </div>
            )}
          </div>

          {/* Myntra-Style Footer Bill & Place Order CTA */}
          {items.length > 0 && (
            <div className="p-4 border-t border-border bg-card space-y-3 flex-shrink-0 shadow-2xl relative z-10">
              {/* Total Savings Ribbon */}
              {totalSavings > 0 && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>You are saving <strong>{formatPrice(totalSavings)}</strong> on this order!</span>
                </div>
              )}

              {/* Price Details Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total MRP</span>
                  <span className="font-semibold text-foreground">{formatPrice(totalMRP)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount on MRP</span>
                  <span>-{formatPrice(mrpDiscount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Coupon Discount ({cart?.coupon?.code})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
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
              </div>

              {/* Bottom Sticky Action Bar: Total + PLACE ORDER Button */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Amount</p>
                  <p className="text-lg font-black text-foreground">{formatPrice(finalPayable)}</p>
                </div>

                <Button
                  onClick={closeCart}
                  asChild
                  size="lg"
                  className="flex-1 rounded-xl font-extrabold text-xs sm:text-sm h-11 bg-[#ff3f6c] hover:bg-[#e0355f] text-white tracking-wider uppercase shadow-lg gap-1.5"
                >
                  <Link href="/checkout">
                    PLACE ORDER <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Secure Checkout with 256-Bit SSL Encryption</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
