'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartDto, WishlistDto } from '@ecommerce/types';
import { apiClient } from './api-client';
import { useAuth } from './auth-context';

interface ExtendedCartDto extends CartDto {
  discountAmount?: number;
  shippingAmount?: number;
  estimatedTax?: number;
  totalAmount?: number;
  coupon?: {
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  } | null;
}

interface CartContextType {
  cart: ExtendedCartDto | null;
  wishlist: WishlistDto | null;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  moveToCart: (productId: string, variantId?: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<ExtendedCartDto | null>(null);
  const [wishlist, setWishlist] = useState<WishlistDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Initialize or retrieve Guest Cart ID from localStorage
  const getGuestCartId = useCallback(() => {
    if (typeof window === 'undefined') return 'guest';
    let id = localStorage.getItem('guest_cart_id');
    if (!id) {
      id = `guest_${Math.random().toString(36).substring(2)}${Date.now()}`;
      localStorage.setItem('guest_cart_id', id);
    }
    return id;
  }, []);

  const getHeaders = useCallback(() => {
    const guestId = getGuestCartId();
    return {
      headers: {
        'x-guest-cart-id': guestId,
      },
    };
  }, [getGuestCartId]);

  const fetchCart = useCallback(async () => {
    try {
      const data = await apiClient.get('/cart', getHeaders());
      setCart(data);
    } catch {
      setCart({ id: 'guest', items: [], subtotal: 0, totalItems: 0, totalAmount: 0 });
    }
  }, [getHeaders]);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist({ id: 'guest', userId: '', items: [] });
      return;
    }
    try {
      const data = await apiClient.get('/wishlist');
      setWishlist(data);
    } catch {
      setWishlist({ id: '', userId: '', items: [] });
    }
  }, [isAuthenticated]);

  // On Login, auto-merge guest cart into authenticated user cart
  useEffect(() => {
    const initAndMerge = async () => {
      if (isAuthenticated) {
        const guestId = localStorage.getItem('guest_cart_id');
        if (guestId) {
          try {
            await apiClient.post('/cart/merge', { guestCartId: guestId });
            localStorage.removeItem('guest_cart_id');
          } catch {
            // ignore
          }
        }
      }
      await fetchCart();
      await fetchWishlist();
    };

    initAndMerge();
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  const addToCart = async (variantId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      const updatedCart = await apiClient.post('/cart/items', { variantId, quantity }, getHeaders());
      setCart(updatedCart);
      setIsCartOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      const updatedCart = await apiClient.patch(`/cart/items/${itemId}`, { quantity }, getHeaders());
      setCart(updatedCart);
    } catch (e) {
      console.error(e);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const updatedCart = await apiClient.delete(`/cart/items/${itemId}`, getHeaders());
      setCart(updatedCart);
    } catch (e) {
      console.error(e);
    }
  };

  const clearCart = async () => {
    try {
      await apiClient.delete('/cart/clear', getHeaders());
      setCart({
        id: cart?.id || 'guest',
        items: [],
        subtotal: 0,
        totalItems: 0,
        totalAmount: 0,
        discountAmount: 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const applyCoupon = async (code: string) => {
    const updated = await apiClient.post('/cart/apply-coupon', { code }, getHeaders());
    setCart(updated);
  };

  const removeCoupon = async () => {
    const updated = await apiClient.delete('/cart/remove-coupon', getHeaders());
    setCart(updated);
  };

  const toggleWishlist = async (productId: string) => {
    try {
      const res = await apiClient.post(`/wishlist/${productId}`);
      await fetchWishlist();
      return res.added;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await apiClient.delete(`/wishlist/${productId}`);
      await fetchWishlist();
    } catch (e) {
      console.error(e);
    }
  };

  const moveToCart = async (productId: string, variantId?: string) => {
    setIsLoading(true);
    try {
      await apiClient.post(`/wishlist/${productId}/move-to-cart`, { variantId });
      await Promise.all([fetchCart(), fetchWishlist()]);
      setIsCartOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const clearWishlist = async () => {
    try {
      await apiClient.delete('/wishlist/clear/all');
      await fetchWishlist();
    } catch (e) {
      console.error(e);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist?.items?.some((i) => i.productId === productId) ?? false;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        toggleCart: () => setIsCartOpen((prev) => !prev),
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        toggleWishlist,
        removeFromWishlist,
        moveToCart,
        clearWishlist,
        isInWishlist,
        refreshCart: fetchCart,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
