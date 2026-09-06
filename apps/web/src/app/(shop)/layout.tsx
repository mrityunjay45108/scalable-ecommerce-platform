import React from 'react';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { CartDrawer } from '@/components/shop/cart-drawer';
import { ChatbotWidget } from '@/components/shop/chatbot-widget';
import { WhatsAppFloat } from '@/components/shop/whatsapp-float';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div suppressHydrationWarning className="flex min-h-screen flex-col w-full max-w-[100vw] overflow-x-hidden">
      <Navbar />
      <main suppressHydrationWarning className="flex-1 w-full max-w-[100vw] overflow-x-hidden">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatbotWidget />
      <WhatsAppFloat />
    </div>
  );
}
