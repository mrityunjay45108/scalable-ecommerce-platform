'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Heart, ShieldCheck, Sparkles } from 'lucide-react';

export function WhatsAppFloat() {
  const [isOpen, setIsOpen] = useState(false);

  const quickHelpOptions = [
    { label: '📦 Track My Order (मेरा ऑर्डर कहाँ है?)', message: 'Namaste! I would like to track my recent SWADESH order.' },
    { label: '💵 Check Doorstep COD in My City (कैश ऑन डिलीवरी)', message: 'Namaste! Please check if Cash on Delivery (COD) is serviceable for my PIN code.' },
    { label: '🔄 7-Day Easy Return & Refund (वापसी सहायता)', message: 'Namaste! I need assistance with returning an item or checking refund status.' },
    { label: '🏷️ Today’s Best Swadeshi Coupons (डिस्काउंट कूपन)', message: 'Namaste! What are the best active coupon codes and festive offers on SWADESH today?' },
  ];

  const handleOpenWhatsApp = (messageText: string) => {
    const phone = '919876543210';
    const encoded = encodeURIComponent(messageText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-3xl border border-amber-500/30 bg-card p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                🇮🇳
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <span>SWADESH Concierge (24×7)</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </h4>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <span>॥ अतिथिदेवो भवः ॥</span>
                  <span className="text-muted-foreground font-normal">• Namaste! How may we serve you?</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Quick Inquiries (तुरंत सहायता चुनें):
            </p>
            <div className="space-y-1.5">
              {quickHelpOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleOpenWhatsApp(opt.message)}
                  className="w-full text-left text-xs font-semibold p-2.5 rounded-xl bg-muted/40 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-between group"
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

      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20"
        aria-label="WhatsApp Customer Support"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
        <span className="text-xs font-black tracking-wide hidden sm:inline">
          {isOpen ? 'Close' : '24×7 Concierge 💬'}
        </span>
      </button>
    </div>
  );
}
