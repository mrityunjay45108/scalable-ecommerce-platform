'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CreditCard, MapPin, Plus, CheckCircle2, ArrowRight, Trash2, Edit2, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { AddressDto, PaymentProvider } from '@ecommerce/types';
import { Button } from '@/components/ui/button';

interface CheckoutPreview {
  items: Array<{
    id: string;
    variantId: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    image?: string;
    inStock: boolean;
  }>;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  coupon?: any;
  shippingAddress: AddressDto;
  inventoryIssues: Array<{
    variantId: string;
    productTitle: string;
    requested: number;
    available: number;
  }>;
  isReadyForPayment: boolean;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponCode = searchParams.get('coupon') || '';

  const { cart, refreshCart } = useCart();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(PaymentProvider.STRIPE);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Address form modal/inline state
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  const loadAddresses = useCallback(async () => {
    try {
      const data: AddressDto[] = await apiClient.get('/users/me/addresses');
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddr = data.find((a) => a.isDefault) || data[0];
        setSelectedAddressId((prev) => prev || defaultAddr.id);
      } else {
        setShowNewAddress(true);
      }
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callback=/checkout');
      return;
    }
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated, authLoading, router, loadAddresses]);

  // Server-authoritative Checkout Preview calculation
  const fetchCheckoutPreview = useCallback(async (addressId: string) => {
    if (!addressId) return;
    setIsPreviewLoading(true);
    setErrorMsg('');
    try {
      const data = await apiClient.post<CheckoutPreview>('/orders/preview', {
        addressId,
        couponCode: couponCode || cart?.coupon?.code || undefined,
      });
      setPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate checkout summary');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [couponCode, cart?.coupon?.code]);

  useEffect(() => {
    if (selectedAddressId && cart && cart.items.length > 0) {
      fetchCheckoutPreview(selectedAddressId);
    }
  }, [selectedAddressId, cart, fetchCheckoutPreview]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingAddressId) {
        await apiClient.put(`/users/me/addresses/${editingAddressId}`, {
          recipientName,
          phone,
          street,
          city,
          state,
          postalCode,
          country,
        });
      } else {
        const created: AddressDto = await apiClient.post('/users/me/addresses', {
          recipientName,
          phone,
          street,
          city,
          state,
          postalCode,
          country,
          isDefault: addresses.length === 0,
        });
        setSelectedAddressId(created.id);
      }
      await loadAddresses();
      resetAddressForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save address');
    }
  };

  const handleSetDefaultAddress = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/users/me/addresses/${addressId}/default`);
      await loadAddresses();
      setSelectedAddressId(addressId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set default address');
    }
  };

  const handleDeleteAddress = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/users/me/addresses/${addressId}`);
      if (selectedAddressId === addressId) {
        setSelectedAddressId('');
      }
      await loadAddresses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete address');
    }
  };

  const startEditAddress = (addr: AddressDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddressId(addr.id);
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country || 'US');
    setShowNewAddress(true);
  };

  const resetAddressForm = () => {
    setShowNewAddress(false);
    setEditingAddressId(null);
    setRecipientName('');
    setPhone('');
    setStreet('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('US');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setErrorMsg('Please select a delivery address');
      return;
    }

    if (preview?.inventoryIssues && preview.inventoryIssues.length > 0) {
      setErrorMsg('Please adjust your cart items before completing order');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // 1. Create order & reserve stock via transaction
      const order = await apiClient.post<{ id: string }>('/orders/checkout', {
        addressId: selectedAddressId,
        paymentProvider,
        couponCode: couponCode || cart?.coupon?.code || undefined,
      });

      // 2. Process / Mock Payment
      if (paymentProvider === PaymentProvider.COD) {
        await refreshCart();
        router.push(`/orders/${order.id}?success=true`);
      } else {
        const paymentIntent = await apiClient.post('/payments/create-intent', {
          orderId: order.id,
          provider: paymentProvider,
        });

        await apiClient.post('/payments/confirm', {
          orderId: order.id,
          transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paymentData: paymentIntent,
        });

        await refreshCart();
        router.push(`/orders/${order.id}?success=true`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete order checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Your Cart is Empty</h2>
          <p className="text-xs text-muted-foreground">Add items to your cart before proceeding to checkout.</p>
        </div>
        <Link href="/products">
          <Button size="lg" className="rounded-2xl px-8 mt-2 font-bold shadow-md">
            Explore Products
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = preview?.subtotal ?? cart.subtotal ?? 0;
  const discountAmount = preview?.discountAmount ?? cart.discountAmount ?? 0;
  const shippingCost = preview?.shippingCost ?? (subtotal >= 100 ? 0 : 10);
  const tax = preview?.tax ?? Number(((subtotal - discountAmount) * 0.08).toFixed(2));
  const total = preview?.totalAmount ?? Number((subtotal - discountAmount + tax + shippingCost).toFixed(2));

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Secure Checkout</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Complete your address and payment details below</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Inventory Warnings */}
      {preview?.inventoryIssues && preview.inventoryIssues.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Stock Shortage Notice:
          </p>
          {preview.inventoryIssues.map((issue, idx) => (
            <p key={idx}>
              • {issue.productTitle}: only {issue.available} units available (you requested {issue.requested}).
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* Step 1: Shipping Address */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> 1. Shipping Address
              </h3>
              {!showNewAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { resetAddressForm(); setShowNewAddress(true); }}
                  className="text-xs font-semibold gap-1 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Address
                </Button>
              )}
            </div>

            {showNewAddress ? (
              <form onSubmit={handleSaveAddress} className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {editingAddressId ? 'Edit Address' : 'New Shipping Address'}
                  </h4>
                  <button type="button" onClick={resetAddressForm} className="text-xs text-muted-foreground hover:underline">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Recipient Name</label>
                    <input
                      required
                      placeholder="Jane Doe"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Phone Number</label>
                    <input
                      required
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold block mb-1">Street Address</label>
                    <input
                      required
                      placeholder="123 Tech Lane, Suite 400"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">City</label>
                    <input
                      required
                      placeholder="San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">State & Postal Code</label>
                    <div className="flex gap-2">
                      <input
                        required
                        placeholder="CA"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-1/2 h-9 px-3 text-xs rounded-xl border bg-background"
                      />
                      <input
                        required
                        placeholder="94107"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-1/2 h-9 px-3 text-xs rounded-xl border bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetAddressForm} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="rounded-xl font-bold">
                    {editingAddressId ? 'Update Address' : 'Save & Select'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                      selectedAddressId === addr.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold">{addr.recipientName}</p>
                      {selectedAddressId === addr.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.street}</p>
                    <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{addr.phone}</p>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t text-[10px]">
                      {addr.isDefault ? (
                        <span className="text-primary font-bold">★ Default Address</span>
                      ) : (
                        <button
                          onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Set Default
                        </button>
                      )}
                      <span className="text-muted-foreground">|</span>
                      <button
                        onClick={(e) => startEditAddress(addr, e)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        onClick={(e) => handleDeleteAddress(addr.id, e)}
                        className="text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Payment Method */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> 2. Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentProvider(PaymentProvider.STRIPE)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all ${
                  paymentProvider === PaymentProvider.STRIPE
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">Stripe / Card</span>
                  {paymentProvider === PaymentProvider.STRIPE && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground">Visa, Mastercard, Amex</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider(PaymentProvider.RAZORPAY)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all ${
                  paymentProvider === PaymentProvider.RAZORPAY
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">Razorpay</span>
                  {paymentProvider === PaymentProvider.RAZORPAY && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground">UPI, NetBanking, Cards</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider(PaymentProvider.COD)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all ${
                  paymentProvider === PaymentProvider.COD
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">Cash on Delivery</span>
                  {paymentProvider === PaymentProvider.COD && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground">Pay upon receipt</p>
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary & Server Totals */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Order Summary</h3>
            {isPreviewLoading && <span className="text-[11px] text-primary animate-pulse">Calculating...</span>}
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {(preview?.items || cart.items).map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold line-clamp-1">{item.productTitle || item.variant?.product?.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.variantTitle || item.variant?.title} x {item.quantity}
                  </p>
                </div>
                <span className="font-bold">{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-3 border-t text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount ({preview?.coupon?.code || cart.coupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span className="font-medium text-foreground">
                {shippingCost === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : formatPrice(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span className="font-medium text-foreground">{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-foreground pt-3 border-t">
              <span>Grand Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            size="lg"
            disabled={isProcessing || !selectedAddressId || isPreviewLoading}
            onClick={handlePlaceOrder}
            className="w-full rounded-2xl font-bold shadow-lg gap-2 h-12"
          >
            {isProcessing ? 'Creating Order...' : `Place Order • ${formatPrice(total)}`}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Server-authoritative checkout with 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-8">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
