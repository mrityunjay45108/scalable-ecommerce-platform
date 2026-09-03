'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Store, ShieldCheck } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?callback=/admin/dashboard');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground animate-pulse">Verifying administrative access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/10 max-w-[100vw] overflow-x-hidden">
      {/* Desktop Sticky Sidebar (Hidden on mobile/tablet < lg) */}
      <AdminSidebar className="hidden lg:flex" />

      {/* Mobile Slide-Over Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative z-50 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <AdminSidebar
              onClose={() => setMobileSidebarOpen(false)}
              className="w-full h-full border-r-0 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* Mobile Admin Top Navigation Header (Hidden on lg+) */}
        <header className="lg:hidden sticky top-0 z-40 h-14 px-4 border-b bg-background/95 backdrop-blur flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-1 text-foreground hover:bg-muted"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open Admin Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shadow-xs">
                N
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs tracking-tight text-foreground flex items-center gap-1">
                  NovaStore <ShieldCheck className="w-3 h-3 text-primary" />
                </span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground gap-1.5">
              <Link href="/">
                <Store className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
