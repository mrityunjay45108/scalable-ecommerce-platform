# 🚀 Staging Deployment Guide — NovaStore Platform

This guide provides step-by-step instructions to deploy the complete NovaStore e-commerce platform to the **Staging Environment**.

---

## 🏗️ Staging Architecture Overview

| Component | Target Staging Platform | Configuration Method |
| :--- | :--- | :--- |
| **Frontend Web** | **Vercel** | Next.js 15 App Router (`apps/web`), Root Directory: Monorepo |
| **Backend API** | **Render** | Node.js Web Service (`apps/api`), Blueprint: [`render.yaml`](file:///c:/Users/kumar/OneDrive/Pictures/Desktop/E%20commerce%20website/render.yaml) |
| **Database** | **Neon PostgreSQL** | Serverless PostgreSQL with PgBouncer connection pooling |
| **Cache & Sessions** | **Upstash Redis** | Serverless Redis via TLS connection (`rediss://`) & REST API |
| **Media Storage** | **Cloudinary** | Cloud asset storage for catalog media and user avatars |
| **Payment Gateway** | **Razorpay (TEST MODE)** | Test mode transactions with mock test cards / UPI |
| **Email Dispatch** | **Resend** | Transactional email provider for auth & orders |

---

## 📋 1. Staging Environment Variables Checklist

Ensure these environment variables are populated in your hosting dashboards:

### A. Render (Backend API Service)

```env
# Runtime & Networking
NODE_ENV=staging
PORT=4000
API_PREFIX=api/v1
APP_URL=https://staging.novastore.com # Or your Vercel staging URL

# Database (Neon PostgreSQL)
# Runtime PgBouncer pooled connection:
DATABASE_URL="postgresql://user:password@ep-staging-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
# Direct session connection for Prisma migrations:
DIRECT_URL="postgresql://user:password@ep-staging.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Redis Cache (Upstash)
UPSTASH_REDIS_REST_URL="https://staging-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
REDIS_URL="rediss://default:password@staging-redis.upstash.io:6379"

# Authentication Tokens
JWT_ACCESS_SECRET="staging_jwt_access_secret_key_min_32_characters"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_SECRET="staging_jwt_refresh_secret_key_min_32_characters"
JWT_REFRESH_EXPIRATION="7d"

# Payment Gateway (Razorpay TEST Mode Only)
RAZORPAY_KEY_ID="rzp_test_yourStagingKeyId"
RAZORPAY_KEY_SECRET="yourStagingRazorpaySecret"
RAZORPAY_WEBHOOK_SECRET="yourStagingWebhookSecret"

# Cloudinary Asset Storage
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

# Transactional Email (Resend)
RESEND_API_KEY="re_staging_yourResendApiKey"
EMAIL_FROM="NovaStore Staging <onboarding@resend.dev>"
```

### B. Vercel (Frontend Web Application)

```env
NEXT_PUBLIC_API_URL="https://novastore-api-staging.onrender.com/api/v1"
NEXT_PUBLIC_APP_NAME="NovaStore (Staging)"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyYourStagingKey"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="e-commerce-app-27cea.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="e-commerce-app-27cea"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="e-commerce-app-27cea.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="116950186256"
NEXT_PUBLIC_FIREBASE_APP_ID="1:116950186256:web:stagingAppId"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-99MVTDTTVZ"
```

---

## 🛠️ 2. Step-by-Step Deployment Procedure

### Step 1: Database Provisioning & Migrations
1. Create a new database project on [Neon Console](https://console.neon.tech).
2. Copy both the **Pooled connection string** (`DATABASE_URL`) and **Direct connection string** (`DIRECT_URL`).
3. Run migrations against staging database:
   ```bash
   DATABASE_URL="<pooled_url>" DIRECT_URL="<direct_url>" pnpm db:migrate:deploy
   ```

### Step 2: Deploy Backend to Render
1. In Render Dashboard, click **New + > Web Service** (or use **Blueprint** connecting [`render.yaml`](file:///c:/Users/kumar/OneDrive/Pictures/Desktop/E%20commerce%20website/render.yaml)).
2. Connect your Git repository.
3. Configure:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm turbo run build --filter=@ecommerce/api`
   - **Start Command**: `pnpm --filter=@ecommerce/api start:prod`
   - **Health Check Path**: `/api/v1/health`
4. Add the Staging Environment Variables listed above.
5. Deploy service and verify the health check at:
   `https://<render-service-name>.onrender.com/api/v1/health`

### Step 3: Deploy Frontend to Vercel
1. In Vercel Dashboard, click **Add New > Project** and import the repository.
2. Configure settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or `apps/web`)
   - **Build Command**: `pnpm --filter=@ecommerce/web build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`
3. Add Environment Variables (including `NEXT_PUBLIC_API_URL` pointing to your Render backend).
4. Deploy and verify at `https://<vercel-project-name>.vercel.app`.

---

## 🧪 3. Staging Verification & Test Execution Plan

| Flow | Steps to Verify | Expected Result |
| :--- | :--- | :--- |
| **Customer Journey** | Register → Verify Email → Login → Browse Catalog → Add to Cart → Apply Coupon → Checkout | Order generated with `PENDING_PAYMENT` state, stock reserved. |
| **Payment (Razorpay TEST)** | Trigger Razorpay Modal → Use Test Card / Mock UPI → Submit Payment | Server HMAC-SHA256 verification succeeds, order transitions to `PAID`. |
| **Inventory** | Verify stock count before & after purchase | Available quantity decremented, overselling prevented. |
| **Admin Operations** | Login as ADMIN → Open `/admin/dashboard` → Update Order Status → Upload Product Media | KPIs update in real-time, order status reflects `SHIPPED`/`DELIVERED`. |
| **Email Notification** | Trigger password reset / order creation | Email dispatched through Resend with non-blocking error handling. |

---

## 🛡️ Pre-Production Gate
> [!IMPORTANT]
> All staging tests must pass completely in the staging environment before initiating any production release.
