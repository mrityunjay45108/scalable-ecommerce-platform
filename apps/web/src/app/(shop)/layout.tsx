import React from 'react';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { CartDrawer } from '@/components/shop/cart-drawer';
import { ChatbotWidget } from '@/components/shop/chatbot-widget';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatbotWidget />
    </div>
  );
}
