'use client';

import React, { useState, useEffect } from 'react';
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

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    updateCartItem,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

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

  if (!isCartOpen) return null;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discountAmount || 0;
  const total = cart?.totalAmount || subtotal;

  const handleApply = async (code: string) => {
    if (!code.trim()) return;
    setIsApplying(true);
    setPromoError('');
    try {
      await applyCoupon(code.trim());
      setPromoCodeInput('');
      setShowPromoInput(false);
    } catch (err: any) {
      setPromoError(err.message || 'Invalid coupon');
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

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[101]">
        <div className="w-screen max-w-md bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="font-extrabold text-base">Shopping Bag</h2>
              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                {cart?.totalItems || 0}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm">Your bag is empty</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Discover premium audio, mechanical keyboards, and displays in our store.
                  </p>
                </div>
                <Button
                  onClick={closeCart}
                  size="sm"
                  asChild
                  className="rounded-xl font-semibold mt-2"
                >
                  <Link href="/products">Explore Catalog</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const img =
                  item.variant?.product?.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120';
                return (
                  <div
                    key={item.id}
                    className="flex gap-3.5 p-3 rounded-2xl border bg-background text-xs relative group"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={img}
                        alt={item.variant?.product?.title || 'Product'}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-foreground truncate">
                        {item.variant?.product?.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.variant?.title}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-foreground">
                          {formatPrice(item.unitPrice)}
                        </span>

                        {/* Quantity Controls */}
                        <div className="flex items-center border rounded-lg bg-muted/30">
                          <button
                            onClick={() =>
                              updateCartItem(item.id, Math.max(1, item.quantity - 1))
                            }
                            className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-l-lg font-bold"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-[11px]">
                            {item.quantity}
                          </span>
                          <button
                            disabled={item.quantity >= (item.variant?.availableStock || 99)}
                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-r-lg font-bold disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Price Summary & Offers */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border bg-card space-y-3 flex-shrink-0 relative z-10 shadow-lg">
              {/* Offers & Coupon Bar */}
              {cart?.coupon ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {cart.coupon.code} applied (-{formatPrice(cart.coupon.discountAmount)})
                    </span>
                  </div>
                  <button
                    onClick={handleRemove}
                    className="text-xs text-muted-foreground hover:text-destructive font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Quick 1-Click Available Offers Chips */}
                  {availableOffers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" /> Available Offers:
                        </span>
                        <button
                          onClick={() => setShowPromoInput(!showPromoInput)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          {showPromoInput ? 'Cancel' : 'Have a code?'}
                        </button>
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {availableOffers.map((off) => {
                          const eligible = !off.minOrderValue || subtotal >= off.minOrderValue;
                          return (
                            <button
                              key={off.id}
                              disabled={!eligible || isApplying}
                              onClick={() => handleApply(off.code)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-all ${
                                eligible
                                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 cursor-pointer shadow-xs'
                                  : 'bg-muted/30 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                              }`}
                              title={
                                off.minOrderValue
                                  ? `Requires min order of ${formatPrice(off.minOrderValue)}`
                                  : 'Click to apply'
                              }
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{off.code}</span>
                              <span className="font-normal opacity-80">
                                (
                                {off.discountType === 'PERCENTAGE'
                                  ? `${off.discountValue}%`
                                  : formatPrice(off.discountValue)}
                                )
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual Promo Code input field */}
                  {showPromoInput && (
                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="Promo Code"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 h-8 px-2.5 text-xs rounded-lg border bg-background uppercase font-mono"
                      />
                      <Button
                        size="sm"
                        disabled={isApplying || !promoCodeInput.trim()}
                        onClick={() => handleApply(promoCodeInput)}
                        className="h-8 text-xs font-bold px-3 rounded-lg"
                      >
                        {isApplying ? '...' : 'Apply'}
                      </Button>
                    </div>
                  )}

                  {promoError && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {promoError}
                    </p>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Discount ({cart?.coupon?.code})
                    </span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-foreground">
                    {subtotal >= 100 ? 'FREE' : formatPrice(10)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-foreground pt-1.5 border-t border-border">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={closeCart}
                  asChild
                  size="lg"
                  className="w-full rounded-xl font-bold shadow-md gap-2"
                >
                  <Link href="/checkout">
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  onClick={closeCart}
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full rounded-xl text-xs font-semibold"
                >
                  <Link href="/cart">View Full Cart Details</Link>
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Encrypted 256-Bit SSL Checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
