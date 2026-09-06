'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

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

const FEATURED_PRODUCTS_KNOWLEDGE: ProductSuggestion[] = [
  {
    title: 'Apex Velocity Carbon Running Shoes',
    price: 2999,
    slug: 'apex-velocity-carbon-running-shoes',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    brand: 'Nike / Apex Athletics',
  },
  {
    title: 'Aura Pro Wireless Noise-Cancelling Headphones',
    price: 4999,
    slug: 'aura-pro-wireless-headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    brand: 'Sony / Aura Studio',
  },
  {
    title: '450 GSM Heavyweight Oversized Hoodie',
    price: 1899,
    slug: '450-gsm-heavyweight-oversized-hoodie',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600',
    brand: 'SWADESH Streetwear',
  },
  {
    title: 'Slim Fit Denim Jeans',
    price: 999,
    slug: 'jeans',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600',
    brand: 'Roadster',
  },
  {
    title: 'Lumina Ergonomic Smart Desk Lamp',
    price: 2299,
    slug: 'lumina-ergonomic-smart-desk-lamp',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600',
    brand: 'Lumina Craft',
  },
];

const INITIAL_SUGGESTIONS = [
  { label: '🔥 Offers & Discount Coupon', query: 'offers and discount coupons' },
  { label: '👟 Best Footwear & Running Shoes', query: 'show running shoes' },
  { label: '🚚 Delivery & Shipping Time', query: 'delivery time and shipping charges' },
  { label: '💳 Cash on Delivery (COD)', query: 'is COD available' },
  { label: '🔄 Return & Replacement Policy', query: 'how to return product' },
  { label: '📦 Track My Order', query: 'track my order' },
];

const WHATSAPP_HELP_OPTIONS = [
  { label: '📦 Track My Order (मेरा ऑर्डर कहाँ है?)', message: 'Namaste! I would like to track my recent SWADESH order.' },
  { label: '💵 Check Doorstep COD in My City (कैश ऑन डिलीवरी)', message: 'Namaste! Please check if Cash on Delivery (COD) is serviceable for my PIN code.' },
  { label: '🔄 7-Day Easy Return & Refund (वापसी सहायता)', message: 'Namaste! I need assistance with returning an item or checking refund status.' },
  { label: '🏷️ Today’s Best Swadeshi Coupons (डिस्काउंट कूपन)', message: 'Namaste! What are the best active coupon codes and festive offers on SWADESH today?' },
];

export function StoreConciergeHub() {
  const [activeModal, setActiveModal] = useState<'none' | 'chat' | 'whatsapp'>('none');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! 🙏 Welcome to SWADESH Luxe (॥ अतिथिदेवो भवः ॥). Main aapka personal shopping concierge hoon. Main aapki kya madad kar sakta hoon?\n\nAap festive offers, verified products, delivery timeline, COD payment, ya order tracking ke bare me pooch sakte hain!',
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
    const phone = '917898501472';
    const finalMsg = messageText || customWhatsAppMsg.trim() || 'Namaste! I would like to connect with SWADESH customer concierge.';
    const encoded = encodeURIComponent(finalMsg);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    setCustomWhatsAppMsg('');
    setActiveModal('none');
  };

  const generateBotReply = (
    query: string,
  ): { text: string; quickActions?: { label: string; query: string }[]; products?: ProductSuggestion[] } => {
    const q = query.toLowerCase().trim();

    // 1. GREETINGS
    if (/^(hi|hello|hey|namaste|pranam|hola|kaisa|kaise)/i.test(q)) {
      return {
        text: 'Namaste ji! 🙏 Welcome to SWADESH. Main aapko best offers batane aur right product choose karne me help kar sakta hoon. Aap kya dhundh rahe hain?',
        quickActions: [
          { label: '🔥 Aaj ke Offers', query: 'offers and discount coupons' },
          { label: '👟 Best Footwear', query: 'show running shoes' },
          { label: '🚚 Delivery Timelines', query: 'delivery time' },
        ],
      };
    }

    // 2. TRACK ORDER / SHIPPING
    if (q.includes('track') || q.includes('kaha') || q.includes('where is my order') || q.includes('order status')) {
      return {
        text: 'Aap apne order ka real-time GPS live tracking **Orders Dashboard** par dekh sakte hain! Log in karke "My Orders" me jayein ya humare 24x7 WhatsApp concierge se turant status lein.',
        quickActions: [
          { label: '📋 Go to My Orders', query: 'open orders' },
          { label: '💬 WhatsApp Tracking Support', query: 'whatsapp support' },
        ],
      };
    }

    // 3. DELIVERY TIME & PIN CODE
    if (q.includes('delivery') || q.includes('shipping') || q.includes('time') || q.includes('charges') || q.includes('pin code')) {
      return {
        text: '🚚 **Delivery Timelines:**\n• **Metro Cities (Delhi, Mumbai, Bengaluru, etc.):** 2 se 3 working days\n• **Rest of India:** 3 se 5 working days\n• **Free Shipping:** ₹999 se upar ke sabhi orders par FREE delivery di jaati hai!',
        quickActions: [
          { label: '💵 COD Available?', query: 'is COD available' },
          { label: '📦 Track existing shipment', query: 'track my order' },
        ],
      };
    }

    // 4. OFFERS / DISCOUNTS / COUPONS
    if (q.includes('offer') || q.includes('coupon') || q.includes('discount') || q.includes('code') || q.includes('festive')) {
      return {
        text: '🎉 **Aaj ke Live Festive Discounts:**\n• **SWADESH10:** Flat 10% OFF on first order!\n• **FESTIVE20:** Flat 20% OFF on orders above ₹1,999\n• **FREESHIP:** Free delivery on all artisanal craft items\n\nCheckout page par coupon code enter karke instant discount claim karein!',
        quickActions: [
          { label: '🛍️ Shop Now', query: 'show running shoes' },
          { label: '💳 Check COD', query: 'is COD available' },
        ],
      };
    }

    // 5. FOOTWEAR / SHOES / SNEAKERS
    if (q.includes('shoe') || q.includes('footwear') || q.includes('sneaker') || q.includes('running') || q.includes('apex')) {
      return {
        text: 'Yeh rahe humare highest-rated carbon plated running shoes aur artisanal footwear jo customers sabse zyada pasand kar rahe hain:',
        products: FEATURED_PRODUCTS_KNOWLEDGE.filter((p) => p.slug.includes('shoes') || p.slug.includes('jeans')),
        quickActions: [
          { label: '🔥 Apply Coupon Code', query: 'offers and discount coupons' },
          { label: '👟 View All Catalog', query: 'show all products' },
        ],
      };
    }

    // 6. COD (CASH ON DELIVERY)
    if (q.includes('cod') || q.includes('cash on delivery') || q.includes('cash')) {
      return {
        text: '💵 **Cash on Delivery (COD) Bilkul Available Hai!**\n\n98% Indian PIN codes par verified doorstep COD service active hai. Bas checkout ke dauran "Cash on Delivery" option choose karein aur delivery ke waqt payment karein.',
        quickActions: [
          { label: '🔄 7-Day Return Policy', query: 'how to return product' },
          { label: '📦 View Cart', query: 'open cart' },
        ],
      };
    }

    // 7. RETURN & REFUND POLICY
    if (q.includes('return') || q.includes('refund') || q.includes('replace') || q.includes('exchange')) {
      return {
        text: '🔄 **7-Day Hassle-Free Returns & Refunds:**\n• Delivery ke 7 din ke andar aap replacement ya 100% refund request initiate kar sakte hain.\n• Reverse pickup agent aapke ghar se parcel collect karega.\n• Refund 24-48 ghante me aapke original payment mode ya UPI/Bank account me credit ho jayega.',
        quickActions: [
          { label: '💬 Talk to Concierge', query: 'whatsapp support' },
          { label: '📦 Track My Order', query: 'track my order' },
        ],
      };
    }

    // 8. ATITHI DEVO BHAVA / HERITAGE
    if (q.includes('atithi') || q.includes('bharat') || q.includes('swadesh') || q.includes('heritage') || q.includes('craft')) {
      return {
        text: '॥ अतिथिदेवो भवः ॥ 🙏\n\nSWADESH Luxe par hum har grahak ko atithi maan kar seva karte hain. Humare sare products authentic Indian artisans, certified weavers, aur verified brands se directly aate hain.',
        quickActions: [
          { label: '🏛️ Virasat-e-Hind Crafts', query: 'virasat' },
          { label: '🔥 Best Offers', query: 'offers and discount coupons' },
        ],
      };
    }

    // 9. WHATSAPP SUPPORT
    if (q.includes('whatsapp') || q.includes('human') || q.includes('agent') || q.includes('call') || q.includes('help')) {
      return {
        text: 'Aap humare 24x7 Customer Concierge se direct WhatsApp par chat kar sakte hain! "24×7 Concierge" button par tap karein ya neeche click karein.',
        quickActions: [
          { label: '💬 Open WhatsApp Support', query: 'open_whatsapp_action' },
          { label: '🔥 View Offers', query: 'offers and discount coupons' },
        ],
      };
    }

    // DEFAULT
    return {
      text: `Aapne poocha: "${query}"\n\nMain aapki help kar sakta hoon orders track karne me, best discount coupons batane me, aur trending products recommend karne me. Aap inme se koi option chun sakte hain:`,
      quickActions: INITIAL_SUGGESTIONS.slice(0, 4),
      products: FEATURED_PRODUCTS_KNOWLEDGE.slice(0, 2),
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (query === 'open_whatsapp_action' || query === 'whatsapp support') {
      handleOpenWhatsApp('Namaste! I need help with my SWADESH shopping experience.');
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

    setTimeout(() => {
      const botResponse = generateBotReply(query);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponse.text,
        timestamp: 'Just now',
        quickActions: botResponse.quickActions,
        products: botResponse.products,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'msg-init',
        sender: 'bot',
        text: 'Chat reset ho gaya hai. Main aapki kya madad kar sakta hoon?\n\nNeeche diye options se shuru karein ya apna question type karein!',
        timestamp: 'Just now',
        quickActions: INITIAL_SUGGESTIONS,
      },
    ]);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 select-none flex flex-col items-end">
      {/* ======================================================== */}
      {/* 1. COLLISION-FREE VERTICAL STACK (When both are closed) */}
      {/* ======================================================== */}
      {activeModal === 'none' && (
        <div className="flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Button 1 (Top): Ask Nova AI Store Assistant */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setActiveModal('chat')}
            className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
            aria-label="Open Nova AI Store Assistant"
          >
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span className="text-xs font-black tracking-wide">Ask Nova AI</span>
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
            className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
            aria-label="Open 24x7 WhatsApp Customer Concierge"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
            <span className="text-xs font-black tracking-wide">24×7 Concierge 💬</span>
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
                  Online • Instant Store Help
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick switch to WhatsApp */}
              <button
                type="button"
                onClick={() => setActiveModal('whatsapp')}
                className="text-[10px] font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full text-white flex items-center gap-1 transition-colors"
                title="Switch to WhatsApp Support"
              >
                <MessageCircle className="w-3 h-3 fill-white" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Atithi Devo Bhava Micro Banner */}
          <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-bold">
            <span className="flex items-center gap-1">
              <span>॥ अतिथिदेवो भवः ॥</span>
              <span className="text-[10px] font-normal text-muted-foreground">• India's Own Luxury Experience</span>
            </span>
            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full font-black">
              24×7 Active
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
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl bg-card border border-border/80 rounded-tl-sm flex items-center gap-1.5 shadow-xs">
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
              onClick={() => handleSendMessage('What are current discount offers?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              🎉 20% OFF Code
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Show all running shoes')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              👟 Running Shoes
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Is Cash on Delivery COD available?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              💵 Cash on Delivery
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('How does 7-day returns work?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0 cursor-pointer"
            >
              🔄 7-Day Returns
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
              placeholder="Ask anything (e.g. delivery time, offers, shoes)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              suppressHydrationWarning
              className="flex-1 h-10 px-3.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputText.trim()}
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                    +91 7898501472
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
            href={`https://wa.me/917898501472?text=${encodeURIComponent('Namaste! I would like to connect with SWADESH customer concierge.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct WhatsApp Chat (+91 7898501472)</span>
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
