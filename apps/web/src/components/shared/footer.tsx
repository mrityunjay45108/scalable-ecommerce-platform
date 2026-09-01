import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 pt-12 pb-8 mt-20">
      <div className="container mx-auto px-4">
        {/* Value props */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Free Express Shipping</h4>
              <p className="text-xs text-muted-foreground">On all orders over $100</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Secure Payment</h4>
              <p className="text-xs text-muted-foreground">256-bit encrypted checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">30-Day Returns</h4>
              <p className="text-xs text-muted-foreground">Hassle-free guarantee</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">24/7 Support</h4>
              <p className="text-xs text-muted-foreground">Dedicated customer care</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-10">
          <div className="col-span-2 space-y-3">
            <span className="font-bold text-lg text-primary tracking-tight">NovaStore</span>
            <p className="text-sm text-muted-foreground max-w-sm">
              Engineered for seamless shopping. Discover world-class audio gear, premium apparel, and ergonomic lifestyle essentials.
            </p>
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-3">Shop</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">All Catalog</Link></li>
              <li><Link href="/products?categorySlug=electronics" className="hover:text-foreground">Electronics</Link></li>
              <li><Link href="/products?categorySlug=apparel-fashion" className="hover:text-foreground">Apparel</Link></li>
              <li><Link href="/products?categorySlug=home-living" className="hover:text-foreground">Home & Living</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-3">Account</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/orders" className="hover:text-foreground">Order Tracking</Link></li>
              <li><Link href="/cart" className="hover:text-foreground">Shopping Cart</Link></li>
              <li><Link href="/wishlist" className="hover:text-foreground">Wishlist</Link></li>
              <li><Link href="/account" className="hover:text-foreground">Profile Settings</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold mb-3">Company</h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About NovaStore</a></li>
              <li><a href="#" className="hover:text-foreground">Sustainability</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} NovaStore Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Stripe Verified</span>
            <span>•</span>
            <span>Razorpay Secure</span>
            <span>•</span>
            <span>PCI-DSS Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
