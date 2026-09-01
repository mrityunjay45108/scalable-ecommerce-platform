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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics & Sales', icon: BarChart3 },
    { href: '/admin/orders', label: 'Orders & Timeline', icon: ShoppingCart },
    { href: '/admin/shipments', label: 'Shipments & Logistics', icon: Truck },
    { href: '/admin/returns', label: 'Returns & QC', icon: RotateCcw },
    { href: '/admin/refunds', label: 'Refunds & Payouts', icon: Receipt },
    { href: '/admin/cod', label: 'COD Reconciliation', icon: Banknote },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/categories', label: 'Categories', icon: Layers },
    { href: '/admin/inventory', label: 'Stock & Inventory', icon: Boxes },
    { href: '/admin/coupons', label: 'Coupons & Promos', icon: Tag },
    { href: '/admin/reviews', label: 'Review Moderation', icon: MessageSquare },
    { href: '/admin/users', label: 'Users & Staff', icon: Users },
  ];

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col justify-between p-4 flex-shrink-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <span className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow">
            N
          </span>
          <div>
            <h2 className="font-extrabold text-sm leading-tight text-foreground">NovaStore</h2>
            <p className="text-[10px] font-semibold text-primary">ADMIN CONSOLE ({user?.role || 'STAFF'})</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="space-y-2 pt-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Store className="w-4 h-4" />
          Back to Storefront
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
