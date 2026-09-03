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
    brand: 'NovaStore Streetwear',
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

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Namaste! 🙏 Main NovaStore AI Assistant hoon. Main aapki kya madad kar sakta hoon?\n\nAap offers, products, delivery time, COD payment, ya order tracking ke bare me pooch sakte hain!',
      timestamp: 'Just now',
      quickActions: INITIAL_SUGGESTIONS.slice(0, 4),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages, isTyping]);

  const generateBotReply = (query: string): { text: string; quickActions?: { label: string; query: string }[]; products?: ProductSuggestion[] } => {
    const q = query.toLowerCase().trim();

    // 1. GREETINGS
    if (/^(hi|hello|hey|namaste|pranam|hola|kaisa|kaise)/i.test(q)) {
      return {
        text: 'Hello! 👋 NovaStore par aapka swagat hai. Main aapko best products recommend karne aur store ki har inquiry resolve karne ke liye yahan hoon. Aap neeche diye options me se choose kar sakte hain ya kuch bhi pooch sakte hain:',
        quickActions: INITIAL_SUGGESTIONS.slice(0, 4),
      };
    }

    // 2. OFFERS, DISCOUNTS, COUPONS
    if (/(offer|discount|coupon|promo|code|deal|sale|chhut|bachat|welcome20)/i.test(q)) {
      return {
        text: '🎉 **Exclusive Store Offers & Coupons:**\n\n1. **WELCOME20**: Naye customers ke liye flat **20% OFF** on any order!\n2. **Free Delivery**: Sabhi ₹999+ orders par **100% Free Express Delivery**.\n3. **Combo Deals**: Apparel aur Footwear par up to **40% OFF**.\n\nCheckout page par coupon code **WELCOME20** enter karein aur discount enjoy karein!',
        quickActions: [
          { label: '👟 Explore Shoes Deal', query: 'show running shoes' },
          { label: '👕 Explore Apparel', query: 'show clothing and hoodies' },
          { label: '🚚 Delivery Policy', query: 'delivery time' },
        ],
      };
    }

    // 3. RUNNING SHOES / FOOTWEAR / SNEAKERS
    if (/(shoe|sneaker|footwear|apex|running|sports|joota|chappal)/i.test(q)) {
      const shoes = FEATURED_PRODUCTS_KNOWLEDGE.filter((p) => p.slug.includes('shoes'));
      return {
        text: '👟 Hamare store par **Apex Velocity Carbon Running Shoes** sabse top-rated hain!\n- **Price**: ₹2,999 (Compare MRP ₹4,999 - Save 40%)\n- **Material**: Breathable Engineered Mesh + Carbon Fiber Propulsion Plate\n- **Sizes**: UK 6 se UK 12 tak available.\n- **Delivery**: 2-3 din me express delivery.',
        products: shoes,
        quickActions: [
          { label: '📏 Size Chart Help', query: 'shoes size guide' },
          { label: '💳 COD Available?', query: 'cash on delivery' },
          { label: '🔥 View Other Products', query: 'show all products' },
        ],
      };
    }

    // 4. CLOTHING / HOODIE / JEANS / APPAREL
    if (/(hoodie|cloth|apparel|jean|denim|shirt|tshirt|kapda|pant)/i.test(q)) {
      const clothes = FEATURED_PRODUCTS_KNOWLEDGE.filter((p) => p.slug.includes('hoodie') || p.slug.includes('jeans'));
      return {
        text: '👕 Hamare paas premium luxury fashion collection available hai:\n\n1. **450 GSM Heavyweight Oversized Hoodie** - 100% French Terry Cotton (₹1,899)\n2. **Slim Fit Denim Jeans (Roadster)** - 100% Washed Comfort Cotton (₹999)\n\nSabhi apparel items par **7-Day Easy Replacement & Returns** available hai!',
        products: clothes,
        quickActions: [
          { label: '🔥 Get 20% Coupon', query: 'coupon code' },
          { label: '🚚 Shipping Time', query: 'delivery time' },
        ],
      };
    }

    // 5. ELECTRONICS / HEADPHONES / LAMPS
    if (/(headphone|earphone|audio|lamp|light|electronic|gadget|sony|aura|lumina)/i.test(q)) {
      const electronics = FEATURED_PRODUCTS_KNOWLEDGE.filter((p) => p.slug.includes('headphones') || p.slug.includes('lamp'));
      return {
        text: '🎧 Hamare top electronics & lifestyle gadgets:\n\n1. **Aura Pro Wireless Headphones** - 40dB Active Noise Cancellation & 40hr Battery (₹4,999)\n2. **Lumina Smart Desk Lamp** - Touch Dimming & Eye-Care Warm/Cool Modes (₹2,299)\n\nSabhi electronics par **1 Year Official Brand Warranty** milti hai!',
        products: electronics,
        quickActions: [
          { label: '🛡️ Warranty Policy', query: 'warranty policy' },
          { label: '💳 Payment Modes', query: 'payment methods' },
        ],
      };
    }

    // 6. ALL PRODUCTS / STORE CATALOG
    if (/(all product|catalog|kya kya hai|kya bechte|store|collection|items|list)/i.test(q)) {
      return {
        text: '🛍️ **NovaStore Catalog Highlights:**\n\nHamare paas Footwear, Apparel, Audio & Electronics, aur Home Lifestyle ke certified top products available hain. Aap homepage par directly saare products browse kar sakte hain!',
        products: FEATURED_PRODUCTS_KNOWLEDGE.slice(0, 3),
        quickActions: [
          { label: '👟 Running Shoes', query: 'show running shoes' },
          { label: '👕 Heavyweight Hoodie', query: 'show clothing and hoodies' },
          { label: '🔥 Offers & Deals', query: 'offers' },
        ],
      };
    }

    // 7. DELIVERY & SHIPPING
    if (/(delivery|shipping|kab aayega|kitne din|pincode|charge|speed|courier|delhivery|bluedart)/i.test(q)) {
      return {
        text: '🚚 **Shipping & Delivery Details:**\n\n- **Delivery Time**: Sabhi major Indian metro cities me **2-3 business days** aur baaki locations par **3-5 business days**.\n- **Shipping Charges**: **FREE Delivery** on orders ₹999 and above. (₹999 se kam ke order par sirf standard ₹49 lagta hai).\n- **Real-time Tracking**: Order dispatch hote hi SMS aur WhatsApp par BlueDart/Delhivery tracking link bheja jata hai!',
        quickActions: [
          { label: '📦 Track My Order', query: 'track my order' },
          { label: '💳 Is COD Available?', query: 'cash on delivery' },
        ],
      };
    }

    // 8. PAYMENT & CASH ON DELIVERY (COD)
    if (/(cod|cash on delivery|payment|upi|gpay|phonepe|paytm|card|netbanking|paisa)/i.test(q)) {
      return {
        text: '💳 **Payment Options Available:**\n\n1. **Cash on Delivery (COD)**: Available on all eligible pincodes with zero hassle!\n2. **UPI**: Instant 1-click payment via Google Pay, PhonePe, Paytm, CRED & BHIM.\n3. **Cards & NetBanking**: All Visa, MasterCard, RuPay, and NetBanking supported.\n4. **100% Safe**: 256-bit SSL encrypted & Razorpay/Stripe verified.',
        quickActions: [
          { label: '🔥 Apply WELCOME20', query: 'coupon code' },
          { label: '🔄 Return & Refund', query: 'return policy' },
        ],
      };
    }

    // 9. RETURN, REPLACEMENT & REFUND
    if (/(return|replace|refund|wapas|exchange|kharab|damaged|badalna|paisa wapas)/i.test(q)) {
      return {
        text: '🔄 **7-Day Hassle-Free Returns & Refunds:**\n\n- **Time Window**: Delivery ke 7 din ke andar aap replacement ya 100% refund request kar sakte hain.\n- **Doorstep Pickup**: Hamara courier partner aapke ghar se parcel pickup karega.\n- **Instant Refund**: Pickup verification ke baad refund seedha aapke UPI / Bank account me transfer ho jata hai.',
        quickActions: [
          { label: '📦 Go to My Orders', query: 'track my order' },
          { label: '📞 Contact Support', query: 'customer care number' },
        ],
      };
    }

    // 10. ORDER TRACKING & STATUS
    if (/(track|order status|mera order|order kahan hai|tracking)/i.test(q)) {
      return {
        text: '📦 **Order Track Karne Ke Liye:**\n\n1. Aap top menu me **"Orders"** section par click karein ya `/orders` page par jayein.\n2. Waha aapko real-time dispatch, transit, aur out-for-delivery updates milenge.\n3. Agar aapko Order ID ke sath issue hai, to hamari customer support team turant help karegi!',
        quickActions: [
          { label: '📞 Talk to Support', query: 'customer support contact' },
          { label: '🚚 Delivery Policy', query: 'delivery time' },
        ],
      };
    }

    // 11. SIZING & FIT GUIDE
    if (/(size|fit|fitting|chart|measurement|nap|l size|m size|uk 8|uk 9)/i.test(q)) {
      return {
        text: '📏 **Size Guide & Recommendations:**\n\n- **Footwear**: Indian standard shoe sizing (UK 6 = 25cm, UK 7 = 26cm, UK 8 = 27cm, UK 9 = 28cm, UK 10 = 29cm).\n- **Apparel**: Standard Indian chest fits (S: 38 in, M: 40 in, L: 42 in, XL: 44 in, XXL: 46 in).\n\nHar product page par **Size Guide** button par click karke detailed measurements dekh sakte hain!',
        quickActions: [
          { label: '👟 Check Running Shoes', query: 'show running shoes' },
          { label: '👕 Check Hoodie', query: 'show clothing' },
        ],
      };
    }

    // 12. CONTACT / SUPPORT / HELPLINE
    if (/(contact|support|phone|number|help|care|whatsapp|email|customer care|baat karni)/i.test(q)) {
      return {
        text: '📞 **NovaStore Customer Support:**\n\n- **Email**: support@novastore.in\n- **Helpline / WhatsApp**: +91 98765 43210 (Mon - Sat, 9:00 AM - 8:00 PM)\n- **Address**: NovaStore HQ, Cyber City, Gurugram, India\n\nHum 2 ghante ke andar reply karte hain!',
        quickActions: [
          { label: '🔥 View Best Offers', query: 'offers' },
          { label: '🔄 Return Policy', query: 'return policy' },
        ],
      };
    }

    // DEFAULT SMART AI FALLBACK
    return {
      text: 'Main aapke question "' + query + '" ko samajh gaya hoon!\n\nNovaStore par aapko 100% Genuine Brand products, 2-3 Din Express Delivery, 7-Day Easy Returns, aur Cash on Delivery ki suvidha milti hai. Naye orders par coupon code **WELCOME20** use karein!\n\nAap neeche diye quick options se bhi jaankari le sakte hain:',
      quickActions: INITIAL_SUGGESTIONS,
      products: FEATURED_PRODUCTS_KNOWLEDGE.slice(0, 2),
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateBotReply(text);
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: botResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 select-none">
      {/* 1. FLOATING CHAT BUTTON */}
      {!isOpen && (
        <div className="relative group">
          {hasUnread && (
            <div className="hidden sm:flex absolute -top-10 right-0 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-white/20 whitespace-nowrap animate-bounce items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ask Nova AI Store Assistant</span>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary/95 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ring-4 ring-primary/20"
            aria-label="Open AI Store Assistant"
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
          </button>
        </div>
      )}

      {/* 2. CHATBOT MODAL WINDOW */}
      {isOpen && (
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

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Value Strip inside chat */}
          <div className="bg-muted/40 border-b border-border/60 px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3 text-primary" /> Free Delivery ₹999+
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Genuine
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-500" /> WELCOME20 (20% OFF)
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/10">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={'flex gap-2.5 ' + (isBot ? 'justify-start' : 'justify-end')}>
                  {isBot && (
                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={'max-w-[82%] space-y-2 ' + (isBot ? 'text-left' : 'text-right')}>
                    <div
                      className={'p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ' + (isBot
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
                            onClick={() => setIsOpen(false)}
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
                            onClick={() => handleSendMessage(qa.query)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-card hover:bg-primary/10 hover:text-primary hover:border-primary border border-border/80 text-muted-foreground transition-all shadow-2xs"
                          >
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-muted-foreground block px-1">
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-xl bg-muted text-muted-foreground border flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl bg-card border border-border/80 text-muted-foreground text-xs flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.4s]" />
                  <span className="text-[10px] font-semibold text-muted-foreground ml-1">Nova AI is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Starter Pills */}
          <div className="px-3 py-2 bg-background border-t border-border/60 overflow-x-auto flex gap-1.5 no-scrollbar">
            <button
              onClick={() => handleSendMessage('What are current discount offers?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0"
            >
              🎉 20% OFF Code
            </button>
            <button
              onClick={() => handleSendMessage('Show all running shoes')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0"
            >
              👟 Running Shoes
            </button>
            <button
              onClick={() => handleSendMessage('Is Cash on Delivery COD available?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0"
            >
              💵 Cash on Delivery
            </button>
            <button
              onClick={() => handleSendMessage('How does 7-day returns work?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground whitespace-nowrap border shrink-0"
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
              className="flex-1 h-10 px-3.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputText.trim()}
              className="h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
