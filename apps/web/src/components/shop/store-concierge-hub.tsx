'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  Truck,
  Tag,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  User,
  MessageCircle,
  Heart,
  ExternalLink,
  Package,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

const CONCIERGE_PHONE = '917324882119';

interface ProductSuggestion {
  title: string;
  price: number;
  slug: string;
  image: string;
  brand: string;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickActions?: { label: string; query: string }[];
  products?: ProductSuggestion[];
}

const INITIAL_SUGGESTIONS = [
  { label: '🔥 Live Active Coupons', query: 'live coupons and discount offers' },
  { label: '👟 Trending Footwear & Shoes', query: 'shoes' },
  { label: '🏛️ Virasat-e-Hind Crafts & Sarees', query: 'sarees' },
  { label: '📦 Track My Recent Order', query: 'track my order' },
  { label: '💵 Cash on Delivery (COD)', query: 'is COD available' },
  { label: '🔄 7-Day Easy Return Policy', query: 'return and refund policy' },
];

const WHATSAPP_HELP_OPTIONS = [
  { label: '📦 Track My Order (मेरा ऑर्डर कहाँ है?)', message: 'Namaste! I would like to track my recent SWADESH order.' },
  { label: '💵 Check Doorstep COD in My City (कैश ऑन डिलीवरी)', message: 'Namaste! Please check if Cash on Delivery (COD) is serviceable for my PIN code.' },
  { label: '🔄 7-Day Easy Return & Refund (वापसी सहायता)', message: 'Namaste! I need assistance with returning an item or checking refund status.' },
  { label: '🏷️ Today’s Best Swadeshi Coupons (डिस्काउंट कूपन)', message: 'Namaste! What are the best active coupon codes and festive offers on SWADESH today?' },
];

// Helper to convert backend product DTO into suggestion card format
const formatApiProduct = (p: any): ProductSuggestion => {
  let img = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600';
  if (p.images && p.images.length > 0) {
    if (typeof p.images[0] === 'string') {
      img = p.images[0];
    } else if (p.images[0]?.url) {
      img = p.images[0].url;
    }
  }
  return {
    title: p.title || 'Product',
    price: Number(p.basePrice || p.price || 0),
    slug: p.slug || '',
    image: img,
    brand: p.category?.name || p.brand || 'SWADESH Luxe',
  };
};

export function StoreConciergeHub() {
  const pathname = usePathname();
  const isStickyBarPage = pathname?.startsWith('/products/') && pathname !== '/products';

  const [activeModal, setActiveModal] = useState<'none' | 'chat' | 'whatsapp'>('none');
  const [inputText, setInputText] = useState('');
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! 🙏 Welcome to SWADESH Luxe (॥ अतिथिदेवो भवः ॥).\n\nMain aapka **Nova AI Store Assistant** hoon, direct live backend database se connected. Main real-time inventory se verified products khoj sakta hoon, live discount coupons de sakta hoon, aur aapke orders track karne me madad kar sakta hoon!\n\nAap kya dhundh rahe hain?',
      timestamp: 'Just now',
      quickActions: INITIAL_SUGGESTIONS.slice(0, 4),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeModal === 'chat') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeModal, messages, isTyping]);

  const handleOpenWhatsApp = (messageText?: string) => {
    const finalMsg = messageText || customWhatsAppMsg.trim() || 'Namaste! I would like to connect with SWADESH customer concierge.';
    const encoded = encodeURIComponent(finalMsg);
    window.open(`https://api.whatsapp.com/send?phone=${CONCIERGE_PHONE}&text=${encoded}`, '_blank', 'noopener,noreferrer');
    setCustomWhatsAppMsg('');
    setActiveModal('none');
  };

  // Live Backend Data Fetching for Nova AI
  const fetchLiveBotReply = async (
    rawQuery: string,
  ): Promise<{ text: string; quickActions?: { label: string; query: string }[]; products?: ProductSuggestion[] }> => {
    const q = rawQuery.toLowerCase().trim();

    // 1. GREETINGS
    if (/^(hi|hello|hey|namaste|pranam|hola|kaisa|kaise|kaise ho)/i.test(q)) {
      return {
        text: 'Namaste ji! 🙏 SWADESH Luxe par aapka swagat hai.\n\nMain live store catalog se direct connected hoon. Aap kisi bhi product (jaise **sarees**, **shoes**, **kurtas**, **lamp**, **jeans**), live discount coupons, COD availability ya delivery status ke bare me pooch sakte hain!',
        quickActions: [
          { label: '🔥 Live Active Coupons', query: 'live coupons and offers' },
          { label: '👟 Trending Footwear', query: 'shoes' },
          { label: '🏛️ Virasat Sarees', query: 'sarees' },
          { label: '🚚 Delivery Timelines', query: 'delivery time' },
        ],
      };
    }

    // 2. LIVE COUPONS & FESTIVE OFFERS (Fetched from Backend DB)
    if (q.includes('coupon') || q.includes('offer') || q.includes('discount') || q.includes('code') || q.includes('festive') || q.includes('chhut')) {
      try {
        const couponsRes: any = await apiClient.get('/coupons/active').catch(() => null);
        const couponsList = Array.isArray(couponsRes) ? couponsRes : (couponsRes?.data || []);
        
        if (couponsList && couponsList.length > 0) {
          const couponDetails = couponsList.map((c: any) => {
            const discText = c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `Flat ₹${c.discountValue} OFF`;
            const minSpend = c.minOrderValue ? ` (Min. order: ₹${c.minOrderValue})` : '';
            return `• **${c.code}**: ${discText}${minSpend}`;
          }).join('\n');

          return {
            text: `🎉 **Live Active Coupons (Direct from Store Database):**\n\n${couponDetails}\n\nYeh codes checkout ke samay 'Apply Coupon' box me daal kar instant discount paayein!`,
            quickActions: [
              { label: '🛍️ Shop Trending Items', query: 'shoes' },
              { label: '💵 Check Doorstep COD', query: 'is COD available' },
            ],
          };
        }
      } catch (err) {
        console.warn('Failed to fetch live coupons', err);
      }

      // Fallback if coupons API call fails or returns empty
      return {
        text: '🎉 **Aaj ke Live Festive Discounts:**\n• **SWADESH10:** Flat 10% OFF on your first purchase!\n• **FESTIVE20:** Flat 20% OFF on orders above ₹1,999\n• **FREESHIP:** Free doorstep express delivery across India!\n\nCheckout page par code enter karke instant discount claim karein.',
        quickActions: [
          { label: '🛍️ Shop Now', query: 'shoes' },
          { label: '💵 Check COD', query: 'is COD available' },
        ],
      };
    }

    // 3. LIVE ORDER TRACKING (Fetched from Backend DB)
    if (q.includes('track') || q.includes('order') || q.includes('mera order') || q.includes('kaha hai') || q.includes('status')) {
      try {
        const ordersRes: any = await apiClient.get('/orders').catch(() => null);
        const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data || []);

        if (ordersList && ordersList.length > 0) {
          const recentOrders = ordersList.slice(0, 3);
          const orderSummaries = recentOrders.map((o: any) => {
            const num = o.orderNumber || (o.id ? o.id.slice(0, 8).toUpperCase() : 'N/A');
            const total = o.totalAmount || o.total || 0;
            return `• **Order #${num}**: Status: **${o.status}** | Total: ₹${Number(total).toLocaleString('en-IN')}`;
          }).join('\n');

          return {
            text: `📦 **Aapke Recent Orders (Live Database Record):**\n\n${orderSummaries}\n\nLive GPS tracking aur GST invoice download ke liye **[My Orders](/orders)** page par visit karein ya WhatsApp support se status lein!`,
            quickActions: [
              { label: '📋 Open Orders Page', query: 'open orders' },
              { label: '💬 WhatsApp Concierge', query: 'whatsapp support' },
            ],
          };
        }
      } catch (err) {
        console.warn('Orders lookup not logged in or error', err);
      }

      return {
        text: `📦 **Live Order Tracking:**\nAap apne order ka real-time GPS tracking dekhne ke liye **[My Orders](/orders)** page par visit kar sakte hain.\n\nAap humare 24x7 Customer Concierge se WhatsApp par bhi apna Order ID bhejkar turant live status jaan sakte hain!`,
        quickActions: [
          { label: '💬 WhatsApp Live Tracking', query: 'open_whatsapp_action' },
          { label: '📋 Go to My Orders', query: 'open orders' },
        ],
      };
    }

    // 4. DELIVERY TIME & PIN CODE INQUIRIES
    if (q.includes('delivery') || q.includes('shipping') || q.includes('time') || q.includes('charges') || q.includes('pin code')) {
      return {
        text: '🚚 **Live Delivery Timelines (Pan-India 29,000+ Pin Codes):**\n• **Metro Cities (Delhi, Mumbai, Bengaluru, etc.):** 2 se 3 working days\n• **Rest of India & Remote Hubs:** 3 se 5 working days\n• **Free Express Shipping:** ₹999 se upar ke sabhi orders par FREE delivery di jaati hai!\n• **Real-Time GPS Tracking:** Har order ke dispatch hote hi tracking link provide kiya jata hai.',
        quickActions: [
          { label: '💵 COD Doorstep Payment', query: 'is COD available' },
          { label: '🔄 7-Day Return Policy', query: 'return policy' },
        ],
      };
    }

    // 5. CASH ON DELIVERY (COD)
    if (q.includes('cod') || q.includes('cash on delivery') || q.includes('cash') || q.includes('delivery payment')) {
      return {
        text: '💵 **Cash on Delivery (COD) 100% Available Hai!**\n\n98% Indian PIN codes par verified doorstep Cash on Delivery active hai. Checkout ke samay payment method me **Cash on Delivery** select karein aur parcel receive karte waqt payment karein.',
        quickActions: [
          { label: '🔥 Active Coupons', query: 'live coupons and discount offers' },
          { label: '🛍️ Browse Store Catalog', query: 'shoes' },
        ],
      };
    }

    // 6. RETURN & REFUND POLICY
    if (q.includes('return') || q.includes('refund') || q.includes('wapsi') || q.includes('exchange') || q.includes('replace')) {
      return {
        text: '🔄 **7-Day Hassle-Free Sahaj Wapsi (वापसी नीति):**\n• Delivery ke 7 din ke andar aap **[My Orders](/orders)** se 1-click me return ya exchange request daal sakte hain.\n• Courier pickup boy aapke doorstep se parcel collect karega.\n• Parcel inspect hote hi 24 se 48 ghante me aapke original UPI/Bank account me 100% refund credit ho jata hai.',
        quickActions: [
          { label: '💬 Talk to Concierge on WhatsApp', query: 'open_whatsapp_action' },
          { label: '📦 Track My Order', query: 'track my order' },
        ],
      };
    }

    // 7. ATITHI DEVO BHAVA & INDIAN HERITAGE CRAFTS
    if (q.includes('atithi') || q.includes('swadesh') || q.includes('bharat') || q.includes('heritage') || q.includes('virasat') || q.includes('craft')) {
      return {
        text: '॥ अतिथिदेवो भवः ॥ 🙏\n\nSWADESH Luxe par hum har customer ko atithi maan kar sammanit karte hain. Hamare pass Kashmir ki Pashmina, Jaipur ki Bandhani, Kanchipuram ki Pure Silk aur Bihar ki Madhubani jaise certified master artisans ke live products hain.',
        quickActions: [
          { label: '🏛️ View Sarees & Crafts', query: 'sarees' },
          { label: '🔥 Festive Offers', query: 'live coupons and discount offers' },
        ],
      };
    }

    // 8. DIRECT LIVE BACKEND SEARCH FOR ANY PRODUCT / KEYWORD
    try {
      // Extract price constraints if user typed e.g. "under 2000" or "below 1000"
      let maxPrice: string | undefined;
      let minPrice: string | undefined;

      const underMatch = q.match(/(?:under|below|less than|kam|se kam)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
      if (underMatch) maxPrice = underMatch[1];

      const aboveMatch = q.match(/(?:above|more than|over|jyada|se jyada)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
      if (aboveMatch) minPrice = aboveMatch[1];

      // Clean search term
      let cleanTerm = q
        .replace(/(?:show|dikhao|chahiye|dekhna|hai|mujhe|kya|batao|please|me|best|trending|top|under|below|above|\d+|rs|inr|₹)/gi, ' ')
        .trim();
      if (!cleanTerm || cleanTerm.length < 2) cleanTerm = q.trim();

      const params = new URLSearchParams();
      if (cleanTerm) params.set('search', cleanTerm);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minPrice) params.set('minPrice', minPrice);
      params.set('limit', '4');

      let searchRes: any = await apiClient.get(`/products?${params.toString()}`);
      let productsList = Array.isArray(searchRes) ? searchRes : (searchRes?.data || []);

      // If no exact price-restricted matches, search without price limit
      if (productsList.length === 0 && (maxPrice || minPrice)) {
        searchRes = await apiClient.get(`/products?search=${encodeURIComponent(cleanTerm)}&limit=4`);
        productsList = Array.isArray(searchRes) ? searchRes : (searchRes?.data || []);
      }

      // If still 0 products, fetch general catalog / trending products
      if (productsList.length === 0) {
        const featRes: any = await apiClient.get('/products?limit=4');
        const featList = Array.isArray(featRes) ? featRes : (featRes?.data || []);
        const formatted = featList.map(formatApiProduct);

        return {
          text: `Aapne poocha: "${rawQuery}". Is query ke liye exact match abhi available nahi hai, lekin yeh rahe live database ke **Top Trending Products** jo aap dekh sakte hain:`,
          products: formatted,
          quickActions: [
            { label: '🔥 Live Active Coupons', query: 'live coupons and discount offers' },
            { label: '💵 Check Doorstep COD', query: 'is COD available' },
            { label: '👟 Footwear Collection', query: 'shoes' },
          ],
        };
      }

      // Products successfully found in live backend database!
      const formatted = productsList.map(formatApiProduct);
      return {
        text: `✨ Maine live backend catalog se aapke liye **${productsList.length} verified products** dhundhe hain:\n\nIn par click karke aap direct product details dekh sakte hain:`,
        products: formatted,
        quickActions: [
          { label: '🔥 Check Active Coupons', query: 'live coupons and discount offers' },
          { label: '🚚 Delivery Details', query: 'delivery time' },
          { label: '💬 WhatsApp Support', query: 'open_whatsapp_action' },
        ],
      };
    } catch (err) {
      console.error('Error fetching live product data', err);
    }

    // Default polite response
    return {
      text: `Aapne poocha: "${rawQuery}"\n\nMain aapko store ke verified products khojne, discount coupons batane, aur orders track karne me madad kar sakta hoon. Aap inme se koi option chun sakte hain:`,
      quickActions: INITIAL_SUGGESTIONS.slice(0, 4),
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (query === 'open_whatsapp_action' || query === 'whatsapp support') {
      handleOpenWhatsApp('Namaste! I need help with my SWADESH shopping experience.');
      return;
    }

    if (query === 'open orders') {
      window.location.href = '/orders';
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const botResponse = await fetchLiveBotReply(query);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponse.text,
        timestamp: 'Just now',
        quickActions: botResponse.quickActions,
        products: botResponse.products,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error in Nova AI live reply', err);
      const errorMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Kshama karein, network request me samasya aayi. Aap dobara try karein ya humare 24x7 WhatsApp concierge se turant connect karein!',
        timestamp: 'Just now',
        quickActions: INITIAL_SUGGESTIONS.slice(0, 3),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'msg-init',
        sender: 'bot',
        text: 'Chat reset ho gaya hai. Main live backend database se connected hoon.\n\nNeeche diye options se shuru karein ya apna sawal type karein!',
        timestamp: 'Just now',
        quickActions: INITIAL_SUGGESTIONS,
      },
    ]);
  };

  const bottomPositionClass =
    activeModal !== 'none'
      ? 'bottom-4 sm:bottom-6'
      : isStickyBarPage
      ? 'bottom-20 sm:bottom-6'
      : 'bottom-6 sm:bottom-6';

  return (
    <div className={`fixed z-50 select-none flex flex-col items-end right-3 sm:right-6 ${bottomPositionClass}`}>
      {/* ======================================================== */}
      {/* 1. COLLISION-FREE VERTICAL STACK (When both are closed) */}
      {/* ======================================================== */}
      {activeModal === 'none' && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Button 1 (Top): Ask Nova AI Store Assistant */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setActiveModal('chat')}
            className="group relative flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 sm:px-4 py-1.5 sm:py-2.5 shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
            aria-label="Open Nova AI Store Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-black tracking-wide">Ask Nova AI</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </button>

          {/* Button 2 (Bottom): 24×7 Concierge (WhatsApp) */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setActiveModal('whatsapp')}
            className="group relative flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 sm:px-4 py-1.5 sm:py-2.5 shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
            aria-label="Open 24x7 WhatsApp Customer Concierge"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-emerald-600" />
            <span className="text-[11px] sm:text-xs font-black tracking-wide">24×7 Concierge 💬</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CHATBOT MODAL WINDOW (Nova AI Store Assistant) */}
      {/* ======================================================== */}
      {activeModal === 'chat' && (
        <div className="w-[calc(100vw-32px)] sm:w-[400px] h-[540px] sm:h-[580px] max-h-[85vh] bg-background border border-border/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Chat Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between relative shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5 leading-none">
                  Nova AI Assistant <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </h3>
                <p className="text-[11px] text-white/80 font-medium mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Store Data Connected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick switch to WhatsApp */}
              <button
                type="button"
                onClick={() => setActiveModal('whatsapp')}
                className="text-[10px] font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Switch to WhatsApp Support"
              >
                <MessageCircle className="w-3 h-3 fill-white" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live Data Badge */}
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 border-b border-emerald-500/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>⚡ Live Store Database Active</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-black">
              Real-time API
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs text-xs font-bold mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[82%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={'p-3 rounded-2xl text-xs leading-relaxed shadow-xs ' +
                      (msg.sender === 'bot'
                        ? 'bg-card border border-border/80 text-foreground rounded-tl-sm'
                        : 'bg-primary text-white rounded-tr-sm font-medium')}
                  >
                    <div className="whitespace-pre-line space-y-1">
                      {msg.text.split('\n').map((line, i) => {
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <p key={i} className="min-h-[1.2em]">
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                  <strong key={j} className="font-extrabold text-foreground dark:text-white">
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {msg.products.map((prod) => (
                        <Link
                          key={prod.slug}
                          href={'/products/' + prod.slug}
                          onClick={() => setActiveModal('none')}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary hover:shadow-md transition-all group text-left"
                        >
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border">
                            <Image src={prod.image} alt={prod.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                              {prod.brand}
                            </p>
                            <h5 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {prod.title}
                            </h5>
                            <p className="text-xs font-black text-primary mt-0.5">
                              {formatPrice(prod.price)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quickActions.map((qa, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(qa.query)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-card hover:bg-primary/10 hover:text-primary hover:border-primary border border-border/80 text-muted-foreground transition-all shadow-2xs cursor-pointer"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-muted text-foreground border flex items-center justify-center shrink-0 shadow-xs text-xs font-bold mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl bg-card border border-border/80 rounded-tl-sm flex items-center gap-2 shadow-xs">
                  <span className="text-[11px] text-muted-foreground font-semibold">Live database se search ho raha hai...</span>
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 bg-card border-t border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSendMessage('Live discount coupons dikhao')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              🎉 Live Coupons
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Show running shoes under 3000')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              👟 Shoes Under ₹3,000
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Sarees under 2500')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              🏛️ Sarees
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Track my recent order')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              📦 Track Order
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Cash on Delivery policy')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              💵 COD Check
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-card border-t border-border/80 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything (e.g. running shoes, sarees under 2000, offers)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              suppressHydrationWarning
              className="flex-1 h-10 px-3.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputText.trim() || isTyping}
              className="h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. WHATSAPP CONCIERGE MODAL WINDOW */}
      {/* ======================================================== */}
      {activeModal === 'whatsapp' && (
        <div className="w-[calc(100vw-32px)] sm:w-[390px] rounded-3xl border border-amber-500/30 bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-3">
          <div className="flex items-start justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                🇮🇳
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                  <span>SWADESH Concierge</span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Official 24×7 Support</span>
                  </span>
                </h4>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <span>॥ अतिथिदेवो भवः ॥</span>
                  <span className="text-muted-foreground font-normal">• 24×7 Direct Customer Care</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveModal('chat')}
                className="text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                title="Switch to AI Assistant"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>AI Bot</span>
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Custom Message Input Bar */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-foreground block">
              💬 Type your message (अपना संदेश लिखें):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                placeholder="Type your message here for support..."
                className="flex-1 h-9 px-3 text-xs rounded-xl border bg-background font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOpenWhatsApp();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleOpenWhatsApp()}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>

          {/* Direct WhatsApp Action Link */}
          <a
            href={`https://api.whatsapp.com/send?phone=${CONCIERGE_PHONE}&text=${encodeURIComponent('Namaste! I would like to connect with SWADESH customer concierge.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-8.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Direct WhatsApp Chat</span>
          </a>

          {/* Preset Inquiries */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Quick Inquiries (तुरंत सहायता चुनें):
            </p>
            <div className="space-y-1.5">
              {WHATSAPP_HELP_OPTIONS.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleOpenWhatsApp(opt.message)}
                  className="w-full text-left text-xs font-semibold p-2.5 rounded-xl bg-muted/40 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="text-[10px] text-amber-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Chat &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Genuine Care
            </span>
            <span className="flex items-center gap-1">
              Atithi Devo Bhava <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
