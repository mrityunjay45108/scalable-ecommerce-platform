import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Headphones, Sparkles, CheckCircle2, Award, Smartphone } from 'lucide-react';

const POPULAR_SEARCHES = [
  'T-Shirts', 'Casual Shirts', 'Oversized Hoodies', 'Sneakers', 'Sports Shoes', 'Carbon Running Shoes',
  'Jeans & Denims', 'Cargo Pants', 'Kurtas & Kurtis', 'Dresses', 'Handbags', 'Smart Watches',
  'ANC Headphones', 'Wireless Earbuds', 'Jackets', 'Track Pants', 'Desk Accessories', 'Perfumes'
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 pt-14 pb-10 mt-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 1. Value props strip (Myntra Guarantee) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 flex-shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Free Express Delivery</h4>
              <p className="text-[11px] text-muted-foreground">On all prepaid & COD orders over ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">100% Original Guarantee</h4>
              <p className="text-[11px] text-muted-foreground">Directly sourced from verified brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">14-Day Easy Returns</h4>
              <p className="text-[11px] text-muted-foreground">Hassle-free doorstep pickup & refund</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">24/7 Dedicated Support</h4>
              <p className="text-[11px] text-muted-foreground">Live chat, email & call assistance</p>
            </div>
          </div>
        </div>

        {/* 2. Structured Myntra Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Col 1: Online Shopping */}
          <div>
            <h5 className="text-xs font-black uppercase tracking-widest mb-4 text-foreground">
              ONLINE SHOPPING
            </h5>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium">
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-rose-600 transition-colors">Men&apos;s Clothing</Link></li>
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-rose-600 transition-colors">Women&apos;s Fashion</Link></li>
              <li><Link href="/products?categorySlug=footwear" className="hover:text-rose-600 transition-colors">Footwear & Sneakers</Link></li>
              <li><Link href="/products?categorySlug=electronics" className="hover:text-rose-600 transition-colors">Studio Audio & Tech</Link></li>
              <li><Link href="/products?categorySlug=home-living" className="hover:text-rose-600 transition-colors">Home & Living</Link></li>
              <li><Link href="/products" className="hover:text-rose-600 transition-colors flex items-center gap-1 font-bold text-rose-600">
                <span>Gift Cards & Deals</span>
                <Sparkles className="w-3 h-3" />
              </Link></li>
            </ul>
          </div>

          {/* Col 2: Customer Policies */}
          <div>
            <h5 className="text-xs font-black uppercase tracking-widest mb-4 text-foreground">
              CUSTOMER POLICIES
            </h5>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium">
              <li><Link href="/orders" className="hover:text-rose-600 transition-colors">Track Your Order</Link></li>
              <li><Link href="/cart" className="hover:text-rose-600 transition-colors">Shopping Bag</Link></li>
              <li><Link href="/wishlist" className="hover:text-rose-600 transition-colors">My Wishlist</Link></li>
              <li><Link href="/account" className="hover:text-rose-600 transition-colors">Profile & Settings</Link></li>
              <li><a href="#" className="hover:text-rose-600 transition-colors">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-rose-600 transition-colors">Cancellation & Returns</a></li>
              <li><a href="#" className="hover:text-rose-600 transition-colors">Terms of Use & Privacy</a></li>
            </ul>
          </div>

          {/* Col 3: Experience Mobile App */}
          <div className="col-span-2 space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground">
              EXPERIENCE NOVASTORE ON MOBILE
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fast, responsive progressive web application optimized for smooth touch navigation, instant pincode lookup, and 1-click checkout.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border shadow-xs text-xs font-bold text-foreground">
                <Smartphone className="w-4 h-4 text-primary" />
                <span>PWA Ready for iOS & Android</span>
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span><strong>100% ORIGINAL</strong> guarantee for all products on NovaStore</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span><strong>Return within 14 days</strong> of receiving your order</span>
              </div>
            </div>
          </div>

          {/* Col 4: Registered Office */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground">
              REGISTERED OFFICE
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              NovaStore Lifestyle Pvt. Ltd.<br />
              Cyber City, Tech Park, Phase II<br />
              Bengaluru, Karnataka - 560100<br />
              India
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              CIN: U72900KA2026PTC123456
            </p>
          </div>
        </div>

        {/* 3. Myntra SEO Popular Searches Cloud */}
        <div className="pt-6 border-t space-y-2">
          <h5 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            POPULAR SEARCHES
          </h5>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground leading-relaxed">
            {POPULAR_SEARCHES.map((query, i) => (
              <React.Fragment key={i}>
                <Link
                  href={`/products?search=${encodeURIComponent(query)}`}
                  className="hover:text-rose-600 hover:underline transition-colors"
                >
                  {query}
                </Link>
                {i < POPULAR_SEARCHES.length - 1 && <span className="text-muted-foreground/40">|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 4. Bottom Copyright & Payment Methods */}
        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p suppressHydrationWarning>© {new Date().getFullYear()} NovaStore Inc. In collaboration with authentic brand partners.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-card border text-[10px] font-bold text-foreground shadow-xs">UPI / GPay</span>
            <span className="px-2.5 py-1 rounded-lg bg-card border text-[10px] font-bold text-foreground shadow-xs">RuPay</span>
            <span className="px-2.5 py-1 rounded-lg bg-card border text-[10px] font-bold text-foreground shadow-xs">Visa / Mastercard</span>
            <span className="px-2.5 py-1 rounded-lg bg-card border text-[10px] font-bold text-foreground shadow-xs">Cash on Delivery</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-black text-[10px] border border-emerald-500/20">256-Bit SSL Encrypted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
