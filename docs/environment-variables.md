# Environment Variables Reference

NovaStore uses a centralized root `.env` file along with scoped workspace configurations.

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | NestJS API listening port | `4000` |
| `API_PREFIX` | Base URI path for API endpoints | `api/v1` |
| `APP_URL` | Frontend Web application origin URL | `http://localhost:3000` |
| `API_URL` | Backend API origin URL | `http://localhost:4000` |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma ORM | `postgresql://postgres:postgrespassword@localhost:5432/ecommerce_db?schema=public` |
| `REDIS_HOST` | Redis cache hostname | `localhost` |
| `REDIS_PORT` | Redis cache port | `6379` |
| `REDIS_PASSWORD` | Redis authentication password (empty for dev) | `""` |
| `JWT_ACCESS_SECRET` | Secret key for signing short-lived access tokens | `super_secret_access_jwt_key_development_32chars_min_length` |
| `JWT_ACCESS_EXPIRATION` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `super_secret_refresh_jwt_key_development_32chars_min_length` |
| `JWT_REFRESH_EXPIRATION`| Refresh token lifespan | `7d` |
| `STRIPE_SECRET_KEY` | Stripe payment gateway secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification secret | `your_stripe_webhook_secret` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret | `mock_secret...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary asset storage cloud name | `mock_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `mock_secret` |
| `SMTP_HOST` | Mailpit / SMTP server hostname | `localhost` |
| `SMTP_PORT` | Mailpit / SMTP server port | `1025` |
| `EMAIL_FROM` | Sender address in outgoing transactional emails | `NovaStore Support <noreply@novastore.local>` |
| `NEXT_PUBLIC_API_URL` | Public API endpoint for Next.js browser client | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Public platform display name | `NovaStore` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public publishable key for Stripe.js Elements | `pk_test_...` |
