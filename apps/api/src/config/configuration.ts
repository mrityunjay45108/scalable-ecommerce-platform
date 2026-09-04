export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/ecommerce_db?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' || !!process.env.REDIS_URL?.startsWith('rediss://'),
  },
  upstash: {
    restUrl: process.env.UPSTASH_REDIS_REST_URL || undefined,
    restToken: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'super_secret_access_jwt_key_dev',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_dev',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || 'mock_stripe_key',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'mock_stripe_webhook_secret',
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
    apiKey: process.env.CLOUDINARY_API_KEY || '123456789',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'mock_secret',
  },
  shipping: {
    provider: process.env.SHIPPING_PROVIDER || 'STANDARD_EXPRESS',
    apiKey: process.env.SHIPPING_API_KEY || undefined,
    apiSecret: process.env.SHIPPING_API_SECRET || undefined,
    webhookSecret: process.env.SHIPPING_WEBHOOK_SECRET || process.env.SHIPROCKET_WEBHOOK_SECRET || 'mock_shipping_webhook_secret',
    timeoutMs: parseInt(process.env.SHIPPING_TIMEOUT_MS || '10000', 10),
    shiprocket: {
      baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
      email: process.env.SHIPROCKET_EMAIL || undefined,
      password: process.env.SHIPROCKET_PASSWORD || undefined,
      webhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET || process.env.SHIPPING_WEBHOOK_SECRET || 'mock_shiprocket_webhook_secret',
      pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    },
    courierPlatform: {
      baseUrl: process.env.COURIER_API_BASE_URL || 'http://localhost:5000',
      apiKey: process.env.COURIER_API_KEY || undefined,
      webhookSecret: process.env.COURIER_WEBHOOK_SECRET || process.env.SHIPPING_WEBHOOK_SECRET || 'mock_courier_webhook_secret',
      timeoutMs: parseInt(process.env.COURIER_TIMEOUT_MS || process.env.SHIPPING_TIMEOUT_MS || '10000', 10),
      enabled: process.env.COURIER_ENABLED === 'true' || process.env.SHIPPING_PROVIDER === 'COURIER_PLATFORM',
      providerName: process.env.COURIER_PROVIDER_NAME || 'COURIER_PLATFORM',
      trackingBaseUrl: process.env.COURIER_FRONTEND_BASE_URL || 'http://localhost:5000/track',
      pickupPincode: process.env.COURIER_PICKUP_PINCODE || '110001',
    },
  },
  returns: {
    windowDays: (() => {
      const parsed = parseInt(process.env.RETURN_WINDOW_DAYS || '14', 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 14;
    })(),
  },
  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true' || (!!process.env.KAFKA_BROKERS && process.env.KAFKA_ENABLED !== 'false'),
    brokers: process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(',').map((b) => b.trim())
      : ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'ecommerce-api',
    groupId: process.env.KAFKA_GROUP_ID || 'ecommerce-service',
    username: process.env.KAFKA_USERNAME || undefined,
    password: process.env.KAFKA_PASSWORD || undefined,
    ssl: process.env.KAFKA_SSL === 'true' || process.env.KAFKA_SSL === '1' || !!process.env.KAFKA_USERNAME,
    saslMechanism: (process.env.KAFKA_SASL_MECHANISM as 'scram-sha-256' | 'plain') || (process.env.KAFKA_USERNAME ? 'scram-sha-256' : undefined),
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT_MS || '10000', 10),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT_MS || '30000', 10),
    outbox: {
      batchSize: parseInt(process.env.KAFKA_OUTBOX_BATCH_SIZE || '50', 10),
      pollIntervalMs: parseInt(process.env.KAFKA_OUTBOX_POLL_INTERVAL_MS || '2000', 10),
      maxRetries: parseInt(process.env.KAFKA_OUTBOX_MAX_RETRIES || '5', 10),
    },
  },
});
