'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  ShoppingBag,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  AlertCircle,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Video,
  Sparkles,
  MapPin,
  Ruler,
  Tag,
  ThumbsUp,
  X,
} from 'lucide-react';
import { ProductDto, ProductVariantDto, ReviewDto } from '@ecommerce/types';
import { apiClient } from '@/lib/api-client';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<ProductDto | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDto | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Auto-Slide Gallery State
  const [isAutoSlide, setIsAutoSlide] = useState(true);
  const [isHoveredGallery, setIsHoveredGallery] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

  // Pincode Delivery Estimator
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  // Size Guide Modal
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewDistribution, setReviewDistribution] = useState<Record<number, number>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchProduct = async () => {
    try {
      const data = await apiClient.get(`/products/${slug}`);
      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      if (data.id) {
        const revRes = await apiClient.get(`/reviews/product/${data.id}`);
        setReviews(revRes.data || (Array.isArray(revRes) ? revRes : []));
        setReviewDistribution(revRes.distribution || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  // Auto-Slide Effect (every 4.5 seconds when not hovered or interacting)
  useEffect(() => {
    if (!product?.images || product.images.length <= 1 || !isAutoSlide || isHoveredGallery) {
      return;
    }

    const timer = setInterval(() => {
      setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [product?.images, isAutoSlide, isHoveredGallery]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square rounded-3xl bg-muted/40" />
          <div className="space-y-4">
            <div className="h-8 bg-muted/40 rounded w-3/4" />
            <div className="h-4 bg-muted/40 rounded w-1/4" />
            <div className="h-24 bg-muted/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested product could not be located.</p>
        <Button onClick={() => router.push('/products')}>Back to Catalog</Button>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const images =
    product.images?.length > 0
      ? product.images
      : [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', altText: 'Default' }];
  const activeMedia = images[selectedImageIndex] || images[0];
  const isVideo =
    activeMedia.altText === 'video' ||
    activeMedia.url.includes('.mp4') ||
    activeMedia.url.includes('youtube.com') ||
    activeMedia.url.includes('youtu.be');

  const availableStock = selectedVariant ? selectedVariant.availableStock : 0;
  const isOutOfStock = availableStock <= 0;
  const currentPrice = selectedVariant?.price ?? product.basePrice;
  const comparePrice = product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
  const savingsAmount = hasDiscount ? comparePrice - currentPrice : 0;

  const handleAddToCart = async () => {
    if (!selectedVariant || isOutOfStock) return;
    setIsAdding(true);
    try {
      await addToCart(selectedVariant.id, quantity);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) return;
    setIsCheckingPincode(true);
    setTimeout(() => {
      setIsCheckingPincode(false);
      setPincodeChecked(true);
    }, 500);
  };

  const handleNextSlide = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevSlide = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await apiClient.post('/reviews', {
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      setReviewComment('');
      setReviewTitle('');
      await fetchProduct();
    } catch (e: any) {
      alert(e.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-16">
      {/* Product Details Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN (7 Cols): Interactive Auto-Sliding Media Studio */}
        <div
          className="lg:col-span-7 space-y-4"
          onMouseEnter={() => setIsHoveredGallery(true)}
          onMouseLeave={() => setIsHoveredGallery(false)}
        >
          {/* Main Showcase Frame */}
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden border bg-muted/20 shadow-md group">
            {isVideo ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                {activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                  <iframe
                    src={activeMedia.url.replace('watch?v=', 'embed/')}
                    title="Product Video"
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeMedia.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <Image
                src={activeMedia.url}
                alt={activeMedia.altText || product.title}
                fill
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {hasDiscount && (
                <Badge className="bg-rose-600 text-white font-extrabold text-xs px-2.5 py-1 shadow-sm">
                  {discountPercent}% OFF
                </Badge>
              )}
              {product.isFeatured && (
                <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm">
                  ⭐ Featured
                </Badge>
              )}
            </div>

            {/* Image Index Counter */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10">
              {selectedImageIndex + 1} / {images.length}
            </div>

            {/* Slider Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Gallery Control Bar (Auto-slide indicator & Zoom) */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={() => setIsAutoSlide(!isAutoSlide)}
                className="p-2 rounded-xl bg-background/80 hover:bg-background text-foreground backdrop-blur text-xs font-bold shadow flex items-center gap-1.5"
                title={isAutoSlide ? 'Pause auto-slide' : 'Resume auto-slide'}
              >
                {isAutoSlide ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden sm:inline">{isAutoSlide ? 'Auto-Slide' : 'Paused'}</span>
              </button>
              <button
                onClick={() => setShowZoomModal(true)}
                className="p-2 rounded-xl bg-background/80 hover:bg-background text-foreground backdrop-blur shadow"
                title="Fullscreen Preview"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, i) => {
                const isItemVideo =
                  img.altText === 'video' ||
                  img.url.includes('.mp4') ||
                  img.url.includes('youtube.com');
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      selectedImageIndex === i
                        ? 'border-primary ring-2 ring-primary/30 scale-105 shadow-md'
                        : 'border-border/60 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isItemVideo ? (
                      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white">
                        <Video className="w-5 h-5 text-primary" />
                        <span className="text-[8px] font-bold mt-0.5">Video</span>
                      </div>
                    ) : (
                      <Image src={img.url} alt="Thumbnail" fill className="object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 Cols): Product Info, Pricing in ₹, Sizes & Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            {product.category && (
              <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                {product.category.name}
              </Badge>
            )}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {product.title}
            </h1>

            {/* Ratings & Social Share */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black">{Number(product.avgRating).toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({product.reviewCount || 0} customer ratings)
                </span>
              </div>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-2.5 rounded-full border transition-all ${
                  isWishlisted
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                }`}
                title="Add to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Pricing Box in Indian Rupees (₹ INR) */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(comparePrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Save {formatPrice(savingsAmount)} ({discountPercent}% OFF)
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inclusive of all taxes (GST) • Free Delivery on orders above ₹999
            </p>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          {/* SIZES / VARIANTS SELECTOR */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Select Size / Option:
                </h4>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5" /> Size Guide
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isVarOutOfStock = variant.availableStock <= 0;

                  return (
                    <button
                      key={variant.id}
                      disabled={isVarOutOfStock}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setQuantity(1);
                      }}
                      className={`min-w-[48px] h-10 px-3.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                          : isVarOutOfStock
                          ? 'border-border/40 bg-muted/20 text-muted-foreground line-through opacity-50 cursor-not-allowed'
                          : 'border-border bg-card hover:border-primary/50 text-foreground'
                      }`}
                    >
                      <span>{variant.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Indicator */}
          <div className="flex items-center gap-2 text-xs font-medium pt-1">
            {isOutOfStock ? (
              <span className="flex items-center gap-1 text-destructive font-bold">
                <AlertCircle className="w-4 h-4" /> Currently Out of Stock
              </span>
            ) : availableStock <= 5 ? (
              <span className="flex items-center gap-1 text-amber-600 font-bold animate-pulse">
                <AlertCircle className="w-4 h-4" /> Hurry! Only {availableStock} left in stock!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <Check className="w-4 h-4" /> In Stock ({availableStock} units ready to dispatch)
              </span>
            )}
          </div>

          {/* Quantity and Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="flex items-center border rounded-xl bg-muted/40 p-1 w-full sm:w-auto justify-between sm:justify-center">
              <button
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background disabled:opacity-40 text-sm font-bold"
              >
                -
              </button>
              <span className="w-12 text-center text-sm font-bold">{quantity}</span>
              <button
                disabled={quantity >= availableStock || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background disabled:opacity-40 text-sm font-bold"
              >
                +
              </button>
            </div>

            <Button
              size="lg"
              disabled={isOutOfStock || isAdding}
              onClick={handleAddToCart}
              className="flex-1 w-full rounded-2xl gap-2 font-bold shadow-lg h-12 text-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              {isAdding
                ? 'Adding to Bag...'
                : isOutOfStock
                ? 'Sold Out'
                : `Add to Bag • ${formatPrice(currentPrice * quantity)}`}
            </Button>
          </div>

          {/* INDIAN PINCODE DELIVERY ESTIMATOR */}
          <div className="rounded-2xl border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Check Delivery & Cash on Delivery:</span>
            </div>

            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-Digit Pincode (e.g. 110001)"
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, ''));
                  setPincodeChecked(false);
                }}
                className="flex-1 h-9 px-3 text-xs rounded-xl border bg-background font-mono"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={pincode.length !== 6 || isCheckingPincode}
                className="rounded-xl font-bold text-xs"
              >
                {isCheckingPincode ? 'Checking...' : 'Check'}
              </Button>
            </form>

            {pincodeChecked && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Free Delivery to {pincode} in 2-3 Business Days
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Cash on Delivery (COD) & Express Shipping available
                </p>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="p-3 rounded-2xl border bg-muted/10 space-y-1">
              <ShieldCheck className="w-5 h-5 text-primary mx-auto" />
              <p className="text-[10px] font-bold text-foreground">100% Genuine</p>
              <p className="text-[9px] text-muted-foreground">Direct Brand Source</p>
            </div>
            <div className="p-3 rounded-2xl border bg-muted/10 space-y-1">
              <RotateCcw className="w-5 h-5 text-primary mx-auto" />
              <p className="text-[10px] font-bold text-foreground">7-Day Returns</p>
              <p className="text-[9px] text-muted-foreground">Hassle-Free Pickup</p>
            </div>
            <div className="p-3 rounded-2xl border bg-muted/10 space-y-1">
              <Truck className="w-5 h-5 text-primary mx-auto" />
              <p className="text-[10px] font-bold text-foreground">Free Delivery</p>
              <p className="text-[9px] text-muted-foreground">On Orders ₹999+</p>
            </div>
          </div>
        </div>
      </div>

      {/* SIZE GUIDE MODAL */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border bg-card p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" /> Indian Size Chart & Measurements
              </h3>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Standard Indian apparel and footwear measurement chart (in inches & cm):</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground font-bold">
                    <tr>
                      <th className="p-2.5">Size</th>
                      <th className="p-2.5">Chest / Bust</th>
                      <th className="p-2.5">Waist</th>
                      <th className="p-2.5">Foot Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2.5 font-bold">S / UK 7</td>
                      <td className="p-2.5">38 in (96 cm)</td>
                      <td className="p-2.5">30 in (76 cm)</td>
                      <td className="p-2.5">25.5 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">M / UK 8</td>
                      <td className="p-2.5">40 in (101 cm)</td>
                      <td className="p-2.5">32 in (81 cm)</td>
                      <td className="p-2.5">26.5 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">L / UK 9</td>
                      <td className="p-2.5">42 in (106 cm)</td>
                      <td className="p-2.5">34 in (86 cm)</td>
                      <td className="p-2.5">27.5 cm</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">XL / UK 10</td>
                      <td className="p-2.5">44 in (111 cm)</td>
                      <td className="p-2.5">36 in (91 cm)</td>
                      <td className="p-2.5">28.5 cm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Button onClick={() => setShowSizeGuide(false)} className="w-full rounded-xl font-bold">
              Got It
            </Button>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOM PREVIEW MODAL */}
      {showZoomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowZoomModal(false)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full">
            <Image
              src={activeMedia.url}
              alt="Zoom Preview"
              fill
              className="object-contain"
            />
            <button
              onClick={() => setShowZoomModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMER REVIEWS SECTION */}
      <section className="space-y-8 border-t pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Customer Reviews</h2>
            <p className="text-xs text-muted-foreground">
              Verified customer ratings and experiences
            </p>
          </div>
          <Button
            onClick={() => setShowReviewModal(true)}
            className="rounded-xl font-bold shadow-md"
          >
            Write a Review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border bg-card space-y-2">
            <Star className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-sm">No reviews yet</h3>
            <p className="text-xs text-muted-foreground">Be the first to share your thoughts on this product!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-5 rounded-3xl border bg-card space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-xs">{rev.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDate(rev.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rev.comment}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold pt-1">
                  <Check className="w-3 h-3" /> Verified Buyer ({rev.user?.firstName || 'Customer'})
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WRITE REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border bg-card p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Write a Customer Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewRating(num)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Review Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent fit and super comfortable!"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Detailed Review</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us about the quality, size fit, and overall satisfaction..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-background"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full rounded-xl font-bold"
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
