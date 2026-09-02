import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Headphones, IndianRupee } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 pt-14 pb-8 mt-20">
      <div className="container mx-auto px-4">
        {/* Value props */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Free Express Shipping</h4>
              <p className="text-xs text-muted-foreground">On all prepaid orders over ₹999</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">100% Secure Checkout</h4>
              <p className="text-xs text-muted-foreground">UPI, RuPay, Cards & NetBanking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">7-Day Easy Returns</h4>
              <p className="text-xs text-muted-foreground">Doorstep pickup & quick refund</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">24/7 Dedicated Support</h4>
              <p className="text-xs text-muted-foreground">Call, WhatsApp & Email help</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-10">
          <div className="col-span-2 space-y-3">
            <span className="font-black text-xl text-primary tracking-tight">NovaStore</span>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              India&apos;s premier destination for high-performance audio equipment, modern performance footwear, and luxury streetwear essentials.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border">
                🇮🇳 Made for India
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                ⚡ COD Available
              </span>
            </div>
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider mb-3 text-foreground">Explore Categories</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary transition-colors">All Catalog</Link></li>
              <li><Link href="/products?categorySlug=footwear" className="hover:text-primary transition-colors">Footwear & Sneakers</Link></li>
              <li><Link href="/products?categorySlug=electronics" className="hover:text-primary transition-colors">Studio Audio & Tech</Link></li>
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-primary transition-colors">Streetwear Apparel</Link></li>
              <li><Link href="/products?categorySlug=home-living" className="hover:text-primary transition-colors">Home & Ergonomics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider mb-3 text-foreground">Customer Service</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/orders" className="hover:text-primary transition-colors">Track Order Status</Link></li>
              <li><Link href="/cart" className="hover:text-primary transition-colors">View Cart</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary transition-colors">My Wishlist</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">Profile & Addresses</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider mb-3 text-foreground">Company & Legal</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About NovaStore</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sustainability</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p suppressHydrationWarning>© {new Date().getFullYear()} NovaStore Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-bold">UPI / GPay</span>
            <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-bold">RuPay</span>
            <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-bold">Visa / Mastercard</span>
            <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-bold">Cash on Delivery</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">256-Bit SSL Encrypted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
