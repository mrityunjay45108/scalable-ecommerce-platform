'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Truck,
  RotateCcw,
  Receipt,
  Banknote,
  Tag,
  MessageSquare,
  Users,
  Store,
  LogOut,
  ShieldCheck,
  PlusCircle,
  KeyRound,
  Award,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AdminSidebarProps {
  onClose?: () => void;
  className?: string;
}

export function AdminSidebar({ onClose, className = '' }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const sections = [
    {
      title: 'ANALYTICS & OVERVIEW',
      links: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/analytics', label: 'Analytics & Trends', icon: BarChart3 },
      ],
    },
    {
      title: 'CATALOG & INVENTORY',
      links: [
        { href: '/admin/products', label: 'All Products', icon: Package },
        { href: '/admin/products/create', label: '+ Add Product', icon: PlusCircle, isHighlight: true },
        { href: '/admin/categories', label: 'Categories', icon: Layers },
        { href: '/admin/inventory', label: 'Stock & Inventory', icon: Boxes },
      ],
    },
    {
      title: 'ORDERS & FULFILLMENT',
      links: [
        { href: '/admin/orders', label: 'Orders & Timeline', icon: ShoppingCart },
        { href: '/admin/shipments', label: 'Shipments & Logistics', icon: Truck },
        { href: '/admin/returns', label: 'Returns & QC', icon: RotateCcw },
        { href: '/admin/refunds', label: 'Refunds & Payouts', icon: Receipt },
        { href: '/admin/cod', label: 'COD Reconciliation', icon: Banknote },
      ],
    },
    {
      title: 'GROWTH & MANAGEMENT',
      links: [
        { href: '/admin/brands', label: 'Brand Spotlights', icon: Award },
        { href: '/admin/coupons', label: 'Coupons & Promos', icon: Tag },
        { href: '/admin/reviews', label: 'Review Moderation', icon: MessageSquare },
        { href: '/admin/users', label: 'Users & Staff', icon: Users },
      ],
    },
    {
      title: 'SECURITY & SETTINGS',
      links: [
        { href: '/admin/settings', label: 'Admin Security & Email', icon: KeyRound },
      ],
    },
  ];

  return (
    <aside className={`w-64 border-r bg-card min-h-screen flex flex-col justify-between p-4 flex-shrink-0 ${className}`}>
      <div className="space-y-6 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-md shadow-primary/20">
              N
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm tracking-tight text-foreground flex items-center gap-1.5">
                NovaStore <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {user?.role || 'ADMIN'} CONSOLE
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5">
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="text-[9px] font-extrabold text-muted-foreground/70 uppercase tracking-wider px-3 pb-1">
                {sec.title}
              </p>
              {sec.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/admin/dashboard' && pathname.startsWith(link.href) && link.href !== '/admin/products');

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold'
                        : link.isHighlight
                        ? 'text-primary hover:bg-primary/10 font-bold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User Card & Storefront Back */}
      <div className="space-y-3 pt-4 border-t mt-4">
        {/* User Card */}
        <div className="p-2.5 rounded-2xl bg-muted/30 border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{user?.firstName || 'Administrator'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@novastore.com'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>Storefront View</span>
          </Link>
          <button
            onClick={() => {
              if (onClose) onClose();
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
