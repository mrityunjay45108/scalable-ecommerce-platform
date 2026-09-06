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
    // Instant optimistic update for smooth UI responsiveness
    setCart((prev) => {
      if (!prev) return prev;
      const cleanId = itemId.replace(/^guest-/, '');
      const newItems = (prev.items || []).map((it) => {
        const matches =
          it.id === itemId ||
          it.variantId === itemId ||
          it.variantId === cleanId ||
          it.id === `guest-${cleanId}`;
        if (matches) {
          const unit =
            it.unitPrice ||
            (it.totalPrice ? it.totalPrice / (it.quantity || 1) : 0);
          return {
            ...it,
            quantity,
            totalPrice: Number((unit * quantity).toFixed(2)),
          };
        }
        return it;
      });
      const newSubtotal = Number(
        newItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0).toFixed(2),
      );
      const newTotalItems = newItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
      return {
        ...prev,
        items: newItems,
        subtotal: newSubtotal,
        totalItems: newTotalItems,
      };
    });

    try {
      const updatedCart = await apiClient.patch(`/cart/items/${itemId}`, { quantity }, getHeaders());
      if (updatedCart && typeof updatedCart === 'object') {
        setCart(updatedCart);
      }
    } catch (e) {
      console.error('Failed to update cart item:', e);
      await fetchCart();
    }
  };

  const removeFromCart = async (itemId: string) => {
    // Instant optimistic removal for smooth UI responsiveness
    setCart((prev) => {
      if (!prev) return prev;
      const cleanId = itemId.replace(/^guest-/, '');
      const newItems = (prev.items || []).filter((it) => {
        const matches =
          it.id === itemId ||
          it.variantId === itemId ||
          it.variantId === cleanId ||
          it.id === `guest-${cleanId}`;
        return !matches;
      });
      const newSubtotal = Number(
        newItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0).toFixed(2),
      );
      const newTotalItems = newItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
      return {
        ...prev,
        items: newItems,
        subtotal: newSubtotal,
        totalItems: newTotalItems,
      };
    });

    try {
      const updatedCart = await apiClient.delete(`/cart/items/${itemId}`, getHeaders());
      if (updatedCart && typeof updatedCart === 'object') {
        setCart(updatedCart);
      }
    } catch (e) {
      console.error('Failed to remove cart item:', e);
      await fetchCart();
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
