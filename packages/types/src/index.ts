// ==========================================
// SHARED DOMAIN ENUMS & CONSTANTS (TypeScript & Node 24 Compatible)
// ==========================================

export const Role = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  MODERATOR: 'MODERATOR',
  SELLER: 'SELLER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  RETURN_PICKED_UP: 'RETURN_PICKED_UP',
  RETURN_RECEIVED: 'RETURN_RECEIVED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  RETURN_REJECTED: 'RETURN_REJECTED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  COD_PENDING: 'COD_PENDING',
  COD_COLLECTED: 'COD_COLLECTED',
  COD_SETTLED: 'COD_SETTLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentProvider = {
  STRIPE: 'STRIPE',
  RAZORPAY: 'RAZORPAY',
  COD: 'COD',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const ShipmentStatus = {
  PENDING: 'PENDING',
  LABEL_CREATED: 'LABEL_CREATED',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  RTO_INITIATED: 'RTO_INITIATED',
  RTO_DELIVERED: 'RTO_DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const ReturnStatus = {
  REQUESTED: 'REQUESTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKED_UP: 'PICKED_UP',
  RECEIVED: 'RECEIVED',
  QUALITY_CHECK: 'QUALITY_CHECK',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  REPLACEMENT_PENDING: 'REPLACEMENT_PENDING',
  REPLACED: 'REPLACED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export const ReturnReason = {
  DAMAGED: 'DAMAGED',
  WRONG_PRODUCT: 'WRONG_PRODUCT',
  SIZE_ISSUE: 'SIZE_ISSUE',
  DEFECTIVE: 'DEFECTIVE',
  NOT_AS_DESCRIBED: 'NOT_AS_DESCRIBED',
  OTHER: 'OTHER',
} as const;
export type ReturnReason = (typeof ReturnReason)[keyof typeof ReturnReason];

export const ReturnAction = {
  REFUND: 'REFUND',
  REPLACEMENT: 'REPLACEMENT',
} as const;
export type ReturnAction = (typeof ReturnAction)[keyof typeof ReturnAction];

export const QualityCheckResult = {
  PENDING: 'PENDING',
  PASSED_RESTOCKABLE: 'PASSED_RESTOCKABLE',
  PASSED_DAMAGED_NO_RESTOCK: 'PASSED_DAMAGED_NO_RESTOCK',
  FAILED_FRAUD_OR_MISMATCH: 'FAILED_FRAUD_OR_MISMATCH',
} as const;
export type QualityCheckResult = (typeof QualityCheckResult)[keyof typeof QualityCheckResult];

export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const CODStatus = {
  COD_PENDING: 'COD_PENDING',
  COD_COLLECTED: 'COD_COLLECTED',
  COD_SETTLED: 'COD_SETTLED',
  COD_FAILED: 'COD_FAILED',
} as const;
export type CODStatus = (typeof CODStatus)[keyof typeof CODStatus];

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  FREE_SHIPPING: 'FREE_SHIPPING',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const StockStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

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
  discountAmount?: number;
  coupon?: any;
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
// ORDER, PAYMENT, SHIPPING, COD & RETURN TYPES
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

export interface ShipmentTrackingEventDto {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location?: string | null;
  activity: string;
  timestamp: string | Date;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  courierProvider: string;
  awbNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  status: ShipmentStatus;
  weight?: number | null;
  isCod: boolean;
  codAmount?: number | null;
  dispatchedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  estimatedDelivery?: string | Date | null;
  trackingEvents?: ShipmentTrackingEventDto[];
  createdAt: string | Date;
}

export interface CODTransactionDto {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: CODStatus;
  collectedAt?: string | Date | null;
  settledAt?: string | Date | null;
  collectedBy?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
}

export interface ReturnItemDto {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
  reason?: ReturnReason | null;
  restocked: boolean;
}

export interface ReturnRequestDto {
  id: string;
  returnNumber: string;
  orderId: string;
  userId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  action: ReturnAction;
  customerNote?: string | null;
  adminNote?: string | null;
  evidenceImages: string[];
  pickupAwb?: string | null;
  qcResult: QualityCheckResult;
  qcNotes?: string | null;
  items: ReturnItemDto[];
  requestedAt: string | Date;
  approvedAt?: string | Date | null;
  completedAt?: string | Date | null;
}

export interface RefundDto {
  id: string;
  refundNumber: string;
  orderId: string;
  paymentId?: string | null;
  returnRequestId?: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  gatewayRefundId?: string | null;
  completedAt?: string | Date | null;
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
  shipment?: ShipmentDto | null;
  codTransaction?: CODTransactionDto | null;
  returnRequests?: ReturnRequestDto[];
  refunds?: RefundDto[];
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
