export const APP_CONFIG = {
  name: 'NovaStore',
  description: 'Enterprise Scalable Modular E-Commerce Platform',
  version: '1.0.0',
  defaultPageSize: 12,
  maxPageSize: 100,
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 0.18, // 18% standard GST
  freeShippingThreshold: 999.0, // ₹999 for free delivery across India
  defaultShippingCost: 99.0,
  jwt: {
    accessTokenExpiration: '15m',
    refreshTokenExpiration: '7d',
  },
  redis: {
    ttl: 3600, // 1 hour default cache TTL
    sessionPrefix: 'sess:',
    cartPrefix: 'cart:',
    productCachePrefix: 'product:',
    categoryCachePrefix: 'category:',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;
