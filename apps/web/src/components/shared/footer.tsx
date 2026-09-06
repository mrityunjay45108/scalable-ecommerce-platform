/** Global Footer Component with authentic Indian trust guarantee strips */
import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Headphones, Sparkles, Heart, CheckCircle2, PhoneCall } from 'lucide-react';

const POPULAR_SEARCHES = [
  'Banarasi Sarees', 'Kashmiri Pashmina', 'Jaipuri Handblock Kurtis', 'Khadi Cotton Shirts', 'Kolhapuri Chappals',
  'Pure Organic Spices', 'Make In India Smartwatch', 'ANC Wireless Earbuds', 'Vedic Ayurvedic Skincare', 'Brass Temple Diyas',
  'Mysore Sandalwood Soap', 'Assam Orthodox Tea', 'Chanderi Dupattas', 'Handmade Mojaris', 'Pooja Essentials', 'Kashmiri Walnuts & Saffron'
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 pt-14 pb-10 mt-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 1. Value Props Strip (4 Pillars of Desi Bharosa) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 flex-shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">29,000+ Pin Codes Delivery</h4>
              <p className="text-[11px] text-muted-foreground">Express shipping & Doorstep COD (घर पर नकद)</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">100% Certified Genuine</h4>
              <p className="text-[11px] text-muted-foreground">Directly from master artisans & verified brands</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">7-Day Sahaj Wapsi</h4>
              <p className="text-[11px] text-muted-foreground">Effortless doorstep pickup & instant refund</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">24×7 Multilingual Care</h4>
              <p className="text-[11px] text-muted-foreground">Instant WhatsApp & Helpline in English & Hindi</p>
            </div>
          </div>
        </div>

        {/* 2. Structured Footer Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Col 1: Online Shopping */}
          <div>
            <h5 className="text-xs font-black uppercase tracking-widest mb-4 text-foreground flex items-center gap-1.5">
              <span>Online Shopping</span>
            </h5>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium">
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-amber-600 transition-colors">Festive & Ethnic Weaves</Link></li>
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-amber-600 transition-colors">Men&apos;s Kurtas & Formals</Link></li>
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-amber-600 transition-colors">Women&apos;s Silk Sarees & Suits</Link></li>
              <li><Link href="/products?categorySlug=electronics" className="hover:text-amber-600 transition-colors">Make In India Tech & Audio</Link></li>
              <li><Link href="/products?categorySlug=home-living" className="hover:text-amber-600 transition-colors">Vedic Ayurveda & Organics</Link></li>
              <li><Link href="/products?categorySlug=home-living" className="hover:text-amber-600 transition-colors">Handicrafts & Sacred Home</Link></li>
              <li>
                <Link href="/products" className="hover:text-amber-600 transition-colors flex items-center gap-1 font-bold text-amber-600">
                  <span>Grand Swadeshi Deals</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Customer Policies */}
          <div>
            <h5 className="text-xs font-black uppercase tracking-widest mb-4 text-foreground">
              Guest Care & Policies
            </h5>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-medium">
              <li><Link href="/orders" className="hover:text-amber-600 transition-colors">Track Order (लाइव ट्रैकिंग)</Link></li>
              <li><Link href="/cart" className="hover:text-amber-600 transition-colors">Shopping Bag (कार्ट)</Link></li>
              <li><Link href="/wishlist" className="hover:text-amber-600 transition-colors">My Wishlist (पसंदीदा)</Link></li>
              <li><Link href="/account" className="hover:text-amber-600 transition-colors">Account & Saved Addresses</Link></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">Doorstep COD Guidelines</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">7-Day Sahaj Return & Refund</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">Privacy & Data Security</a></li>
            </ul>
          </div>

          {/* Col 3: Swadeshi Mission */}
          <div className="col-span-2 space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
              <span>🇮🇳 The SWADESH Promise • ॥ अतिथिदेवो भवः ॥</span>
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SWADESH Luxe connects millions of Indian artisans, master weavers, and indigenous creators directly with discerning families across 29,000+ pin codes. Built with pride, precision, and the sacred spirit of Atithi Devo Bhava (॥ अतिथिदेवो भवः ॥).
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/20">
                🇮🇳 #VocalForLocal
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
                ✨ Make in India
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-500/20">
                🛡️ 100% Genuine Guarantee
              </span>
            </div>
          </div>

          {/* Col 4: Trust & Helpline */}
          <div className="space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground">
              24×7 Guest Concierge
            </h5>
            <div className="p-4 rounded-2xl bg-card border space-y-2">
              <p className="text-[11px] text-muted-foreground font-semibold">Toll Free Helpline (24×7):</p>
              <p className="text-sm font-black text-foreground flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" /> 1800-SWADESH (Toll Free)
              </p>
              <p className="text-[11px] text-muted-foreground">Email: support@swadeshluxe.in</p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-1 border-t">
                <CheckCircle2 className="w-3 h-3" /> Available in English, Hindi & Regional Languages
              </p>
            </div>
          </div>
        </div>

        {/* 3. Popular Indian Searches */}
        <div className="pt-8 border-t space-y-3">
          <h5 className="text-[11px] font-black uppercase tracking-widest text-foreground">
            TRENDING SEARCHES IN INDIA (लोकप्रिय खोज)
          </h5>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {POPULAR_SEARCHES.map((item, idx) => (
              <span key={item} className="flex items-center gap-3">
                <Link href={`/products?search=${encodeURIComponent(item)}`} className="hover:text-amber-600 transition-colors">
                  {item}
                </Link>
                {idx < POPULAR_SEARCHES.length - 1 && <span className="text-border">|</span>}
              </span>
            ))}
          </div>
        </div>

        {/* 4. Bottom Strip (Tricolor Accent & National Pride) */}
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-semibold">
            <span>© {new Date().getFullYear()} SWADESH Luxe — The Indian Store. All rights reserved.</span>
          </p>
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span>Crafted with Pride in India (गर्व से भारत में निर्मित)</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
