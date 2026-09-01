// ==========================================
// SHARED DOMAIN ENUMS
// ==========================================

export enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MODERATOR = 'MODERATOR',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  COD = 'COD',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

// ==========================================
// API ENVELOPES & PAGINATION
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ==========================================
// USER & AUTH TYPES
// ==========================================

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number; // in seconds
}

export interface AuthResponse {
  user: UserDto;
  tokens: AuthTokens;
}

export interface AddressDto {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ==========================================
// CATALOG & PRODUCT TYPES
// ==========================================

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  parent?: CategoryDto | null;
  children?: CategoryDto[];
  productsCount?: number;
}

export interface ProductImageDto {
  id: string;
  productId: string;
  url: string;
  publicId: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  title: string;
  price: number;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
  attributes: Record<string, string>;
}

export interface ProductDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  category?: CategoryDto;
  basePrice: number;
  comparePrice?: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  variants: ProductVariantDto[];
  images: ProductImageDto[];
  inStock?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProductFilterQuery extends PaginationParams {
  categorySlug?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStockOnly?: boolean;
  isFeatured?: boolean;
}

// ==========================================
// CART & WISHLIST TYPES
// ==========================================

export interface CartItemDto {
  id: string;
  cartId: string;
  variantId: string;
  variant: ProductVariantDto & {
    product: {
      id: string;
      title: string;
      slug: string;
      images: ProductImageDto[];
    };
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartDto {
  id: string;
  userId?: string | null;
  items: CartItemDto[];
  subtotal: number;
  totalItems: number;
}

export interface WishlistItemDto {
  id: string;
  wishlistId: string;
  productId: string;
  product: ProductDto;
  createdAt: string | Date;
}

export interface WishlistDto {
  id: string;
  userId: string;
  items: WishlistItemDto[];
}

// ==========================================
// ORDER & CHECKOUT TYPES
// ==========================================

export interface OrderItemDto {
  id: string;
  orderId: string;
  variantId: string;
  variantTitle: string;
  productTitle: string;
  productSlug: string;
  productImage?: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  transactionId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string | Date;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  userId: string;
  user?: UserDto;
  shippingAddress: AddressDto;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string | null;
  status: OrderStatus;
  payment?: PaymentDto | null;
  items: OrderItemDto[];
  trackingNumber?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CheckoutInput {
  addressId: string;
  paymentProvider: PaymentProvider;
  couponCode?: string;
  notes?: string;
}

// ==========================================
// COUPON & REVIEW TYPES
// ==========================================

export interface CouponDto {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
}

export interface ReviewDto {
  id: string;
  productId: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  rating: number;
  title?: string | null;
  comment: string;
  isApproved: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ==========================================
// ADMIN DASHBOARD & ANALYTICS TYPES
// ==========================================

export interface AdminDashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  lowStockProductsCount: number;
  salesByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  recentOrders: OrderDto[];
  topSellingProducts: Array<{
    productId: string;
    title: string;
    slug: string;
    totalSold: number;
    revenue: number;
  }>;
}
