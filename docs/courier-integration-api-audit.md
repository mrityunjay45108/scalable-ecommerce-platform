# E-Commerce → Courier Platform API Audit
**Document Version:** 1.0.0  
**Target Integration Platform:** `courier-logistics-platform`  
**Audited Codebase:** `scalable-ecommerce-platform` (NovaStore E-Commerce)  
**Audit Date:** 2026-09-03  
**Auditor:** Antigravity Engineering (Automated Strict Codebase Audit)  

---

## 1. Existing Architecture Overview

The audited repository is a high-performance Monorepo architecture containing:
* **Backend API (`apps/api`)**: NestJS 10.x RESTful application with modular domain architecture.
* **Database & ORM (`packages/database`)**: PostgreSQL managed via Prisma ORM 6.x.
* **Shared Types (`packages/types`)**: Isomorphic TypeScript domain contracts, enums, DTOs, and API response wrappers.
* **Frontend Web Application (`apps/web`)**: Next.js 15 App Router e-commerce storefront & admin console.
* **Caching & Queue Layer**: Redis / Upstash with in-memory fallback.

---

## 2. Complete API Inventory (114 Endpoints Audited)

Every existing API endpoint across the 20 application controllers is documented below:

### 2.1 Root & Health Domain
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1` | Root | `AppController` | Public | All | API root metadata and documentation link |
| `GET` | `/api/v1/health` | Health | `HealthController` | Public | All | Deep liveness check (PostgreSQL raw query `SELECT 1` & Redis ping) |

### 2.2 Authentication Domain (`/api/v1/auth`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Auth | `AuthController` | Public (Rate-Limited 10/min) | All | Creates `User`, hashes password (bcrypt 12), sets HTTP-only refresh cookie |
| `POST` | `/api/v1/auth/login` | Auth | `AuthController` | Public (Rate-Limited 10/min) | All | Validates password, generates JWT pair, saves `RefreshToken` in DB |
| `POST` | `/api/v1/auth/firebase-login` | Auth | `AuthController` | Public | All | Verifies Firebase Google token, provisions user if new, issues JWTs |
| `POST` | `/api/v1/auth/refresh` | Auth | `AuthController` | Public (Cookie/Body) | All | Rotates refresh token, invalidates old token, issues new access token |
| `POST` | `/api/v1/auth/logout` | Auth | `AuthController` | JWT Bearer | All | Revokes `RefreshToken` in DB, clears HTTP-only cookie |
| `POST` | `/api/v1/auth/forgot-password` | Auth | `AuthController` | Public (Rate-Limited 5/min) | All | Generates reset token, stores hash in Redis (TTL 1hr), sends reset email |
| `POST` | `/api/v1/auth/reset-password` | Auth | `AuthController` | Public (Rate-Limited 5/min) | All | Verifies token in Redis, updates `User.passwordHash`, revokes refresh tokens |
| `POST` | `/api/v1/auth/verify-email` | Auth | `AuthController` | Public | All | Verifies token in Redis, sets `User.isEmailVerified = true` |
| `POST` | `/api/v1/auth/send-verification-email` | Auth | `AuthController` | JWT Bearer | All | Generates fresh email verification token in Redis, sends email |
| `PATCH` | `/api/v1/auth/change-password` | Auth | `AuthController` | JWT Bearer | All | Validates old password, updates `User.passwordHash`, revokes all active sessions |
| `GET` | `/api/v1/auth/me` | Auth | `AuthController` | JWT Bearer | All | Returns authenticated user profile, permissions, and roles |

### 2.3 User & Address Domain (`/api/v1/users`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Retrieves full user profile and notification preferences |
| `PUT` | `/api/v1/users/me` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Updates `firstName`, `lastName`, `phone`, `avatarUrl` |
| `GET` | `/api/v1/users/me/addresses` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Returns all saved delivery addresses for user |
| `POST` | `/api/v1/users/me/addresses` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Creates new `Address` record in DB |
| `PUT` | `/api/v1/users/me/addresses/:id` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Updates specific `Address` record (IDOR protected) |
| `DELETE` | `/api/v1/users/me/addresses/:id` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Deletes specific `Address` record (IDOR protected) |
| `POST` | `/api/v1/users/me/addresses/:id/default` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Sets target address as `isDefault = true`, unsets others |
| `POST` | `/api/v1/users/me/addresses/validate` | Users | `UsersController` | JWT Bearer | Customer/Staff/Admin | Validates postal code and address schema |
| `GET` | `/api/v1/users/admin/all` | Users | `UsersController` | JWT Bearer | `ADMIN` | Admin: Paginated list of all users with search |
| `PUT` | `/api/v1/users/admin/:id/toggle-status` | Users | `UsersController` | JWT Bearer | `ADMIN` | Admin: Toggles `User.isActive` flag |
| `PUT` | `/api/v1/users/admin/:id/role` | Users | `UsersController` | JWT Bearer | `ADMIN` | Admin: Assigns role (`CUSTOMER`, `STAFF`, `ADMIN`) with AuditLog |

### 2.4 Catalog & Categories Domain (`/api/v1/categories`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | Categories | `CategoriesController` | Public | All | Returns recursive nested category tree with active product counts |
| `GET` | `/api/v1/categories/flat` | Categories | `CategoriesController` | Public | All | Returns flat category list for dropdown selectors |
| `GET` | `/api/v1/categories/:slug` | Categories | `CategoriesController` | Public | All | Returns single category details and child hierarchy |
| `POST` | `/api/v1/categories` | Categories | `CategoriesController` | JWT Bearer | `ADMIN` | Creates new `Category` record |
| `PUT` | `/api/v1/categories/:id` | Categories | `CategoriesController` | JWT Bearer | `ADMIN` | Updates `Category` name, slug, description, image, parent |
| `DELETE` | `/api/v1/categories/:id` | Categories | `CategoriesController` | JWT Bearer | `ADMIN` | Soft deletes `Category` (`deletedAt = now()`) |

### 2.5 Products & Variants Domain (`/api/v1/products`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | Products | `ProductsController` | Public | All | Paginated published catalog with search, price, category filters |
| `GET` | `/api/v1/products/featured` | Products | `ProductsController` | Public | All | Featured showcase products for homepage |
| `GET` | `/api/v1/products/:slug` | Products | `ProductsController` | Public | All | Full product detail with variants, images, specifications, review counts |
| `GET` | `/api/v1/products/admin/all` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: List all products (published + unpublished) |
| `GET` | `/api/v1/products/admin/item/:id` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Single product details by UUID for edit form |
| `POST` | `/api/v1/products` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Creates `Product`, `ProductVariant`s, `Inventory`, and `ProductImage`s |
| `PUT` | `/api/v1/products/:id` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Updates product title, description, category, pricing, specs |
| `DELETE` | `/api/v1/products/:id` | Products | `ProductsController` | JWT Bearer | `ADMIN` | Soft deletes `Product` (`deletedAt = now()`) |
| `POST` | `/api/v1/products/:id/images` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Attaches new `ProductImage` record to product |
| `DELETE` | `/api/v1/products/:id/images/:imageId` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Deletes `ProductImage` record |
| `PATCH` | `/api/v1/products/:id/images/:imageId/primary` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Sets primary cover image for product |
| `PUT` | `/api/v1/products/:id/images/reorder` | Products | `ProductsController` | JWT Bearer | `ADMIN`, `STAFF` | Reorders image display sort index |

### 2.6 Inventory & Stock Domain (`/api/v1/inventory`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/admin/all` | Inventory | `InventoryController` | JWT Bearer | `ADMIN` | Lists inventory stock across all variants |
| `GET` | `/api/v1/inventory/low-stock` | Inventory | `InventoryController` | JWT Bearer | `ADMIN` | Lists variants where `quantity <= lowStockAlert` |
| `GET` | `/api/v1/inventory/admin/logs` | Inventory | `InventoryController` | JWT Bearer | `ADMIN` | Paginated stock adjustment logs (`InventoryLog`) |
| `POST` | `/api/v1/inventory/adjust` | Inventory | `InventoryController` | JWT Bearer | `ADMIN` | Adjusts physical stock quantity with audit log |
| `POST` | `/api/v1/inventory/admin/update` | Inventory | `InventoryController` | JWT Bearer | `ADMIN` | Updates threshold and location properties |

### 2.7 Shopping Cart Domain (`/api/v1/cart`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cart` | Cart | `CartController` | Public/JWT | All | Returns user cart or guest session cart from Redis/DB |
| `POST` | `/api/v1/cart/items` | Cart | `CartController` | Public/JWT | All | Adds item variant with requested quantity |
| `PATCH` | `/api/v1/cart/items/:id` | Cart | `CartController` | Public/JWT | All | Updates quantity for specific cart item |
| `DELETE` | `/api/v1/cart/items/:id` | Cart | `CartController` | Public/JWT | All | Removes item from cart |
| `DELETE` | `/api/v1/cart/clear` | Cart | `CartController` | Public/JWT | All | Clears all items from cart |
| `POST` | `/api/v1/cart/apply-coupon` | Cart | `CartController` | Public/JWT | All | Validates promo code and attaches discount |
| `DELETE` | `/api/v1/cart/remove-coupon` | Cart | `CartController` | Public/JWT | All | Removes attached coupon |
| `POST` | `/api/v1/cart/validate` | Cart | `CartController` | JWT Bearer | Customer/Staff | Validates live available inventory for all items in cart |
| `POST` | `/api/v1/cart/merge` | Cart | `CartController` | JWT Bearer | Customer/Staff | Merges guest cart items into authenticated user cart |

### 2.8 Customer Wishlist Domain (`/api/v1/wishlist`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/wishlist` | Wishlist | `WishlistController` | JWT Bearer | Customer | Lists user saved wishlist products |
| `POST` | `/api/v1/wishlist/:productId` | Wishlist | `WishlistController` | JWT Bearer | Customer | Toggles product in/out of wishlist |
| `POST` | `/api/v1/wishlist/add/:productId` | Wishlist | `WishlistController` | JWT Bearer | Customer | Adds product to wishlist (idempotent) |
| `DELETE` | `/api/v1/wishlist/:productId` | Wishlist | `WishlistController` | JWT Bearer | Customer | Removes product from wishlist |
| `POST` | `/api/v1/wishlist/:productId/move-to-cart` | Wishlist | `WishlistController` | JWT Bearer | Customer | Atomically transfers item from wishlist into shopping cart |
| `DELETE` | `/api/v1/wishlist/clear/all` | Wishlist | `WishlistController` | JWT Bearer | Customer | Clears all items from wishlist |

### 2.9 Promotions & Coupons Domain (`/api/v1/coupons`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/coupons/active` | Coupons | `CouponsController` | Public | All | Returns active public coupon codes |
| `POST` | `/api/v1/coupons/apply` | Coupons | `CouponsController` | JWT Bearer | Customer | Validates coupon rules, dates, user limits, calculates discount |
| `GET` | `/api/v1/coupons/admin/all` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: List all coupons with usage stats |
| `POST` | `/api/v1/coupons/admin` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: Creates new discount coupon |
| `PUT` | `/api/v1/coupons/admin/:id` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: Updates coupon properties |
| `PATCH` | `/api/v1/coupons/admin/:id/toggle` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: Toggles coupon active state |
| `GET` | `/api/v1/coupons/admin/:id/usages` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: Lists individual user order usages for coupon |
| `DELETE` | `/api/v1/coupons/admin/:id` | Coupons | `CouponsController` | JWT Bearer | `ADMIN` | Admin: Soft deletes coupon (`deletedAt = now()`) |

### 2.10 Orders Domain (`/api/v1/orders`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders/preview` | Orders | `OrdersController` | JWT Bearer | Customer | Pre-checkout order calculation: subtotal, tax, shipping, discount |
| `POST` | `/api/v1/orders/checkout` | Orders | `OrdersController` | JWT Bearer | Customer | **Primary Order Creation**: Reserves inventory, creates `Order`, `OrderItem`s, `Payment`, `CODTransaction`, clears cart, emits AuditLog |
| `GET` | `/api/v1/orders` | Orders | `OrdersController` | JWT Bearer | Customer | Lists customer orders with pagination & status filter |
| `GET` | `/api/v1/orders/:id` | Orders | `OrdersController` | JWT Bearer | Customer/Admin | Returns detailed order, items, tracking status, payment info |
| `POST` | `/api/v1/orders/:id/cancel` | Orders | `OrdersController` | JWT Bearer | Customer/Admin | Cancels order, releases inventory reservation, creates AuditLog |
| `GET` | `/api/v1/orders/admin/all` | Orders | `OrdersController` | JWT Bearer | `ADMIN` | Admin: Paginated list of all system orders |
| `PATCH` | `/api/v1/orders/admin/:id/status` | Orders | `OrdersController` | JWT Bearer | `ADMIN` | Admin: Advances order lifecycle status (enforces state machine) |

### 2.11 Payments & COD Domain (`/api/v1/payments`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-intent` | Payments | `PaymentsController` | JWT Bearer | Customer | Initializes Razorpay Order / Stripe PaymentIntent or registers COD |
| `POST` | `/api/v1/payments/verify` | Payments | `PaymentsController` | JWT Bearer | Customer | Verifies cryptographic signature (HMAC-SHA256), captures payment, commits stock |
| `POST` | `/api/v1/payments/retry` | Payments | `PaymentsController` | JWT Bearer | Customer | Re-initiates payment intent for failed/pending payment |
| `GET` | `/api/v1/payments/:orderId/status` | Payments | `PaymentsController` | JWT Bearer | Customer/Admin | Returns current payment capture status |
| `POST` | `/api/v1/payments/confirm` | Payments | `PaymentsController` | JWT Bearer | `ADMIN` | Admin: Manually marks online payment as CAPTURED |
| `GET` | `/api/v1/payments/admin/cod/all` | Payments | `PaymentsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: COD transactions list, reconciliation ledger, uncollected metrics |
| `POST` | `/api/v1/payments/admin/cod/:orderId/collect` | Payments | `PaymentsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin/Courier: Confirms doorstep cash collection |
| `POST` | `/api/v1/payments/admin/cod/:orderId/settle` | Payments | `PaymentsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Marks collected COD funds settled to merchant bank |
| `POST` | `/api/v1/payments/:orderId/refund` | Payments | `PaymentsController` | JWT Bearer | `ADMIN` | Initiates gateway refund via Stripe/Razorpay |
| `POST` | `/api/v1/payments/webhooks/:provider` | Payments | `PaymentsController` | Public | All | Inbound gateway webhook receiver (Stripe/Razorpay signature verified) |

### 2.12 Shipping & Logistics Domain (`/api/v1/shipments`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/shipments` | Shipping | `ShippingController` | JWT Bearer | `ADMIN`, `STAFF` | **Manifests courier shipment**: Calls provider, generates AWB, creates `Shipment` & initial `ShipmentTrackingEvent`, advances order to `READY_TO_SHIP` |
| `GET` | `/api/v1/shipments/admin/all` | Shipping | `ShippingController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Paginated shipment list with carrier/status filters |
| `PATCH` | `/api/v1/shipments/admin/:id/status` | Shipping | `ShippingController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Updates shipment status, appends tracking event, synchronizes `Order.status` |
| `GET` | `/api/v1/shipments/:id` | Shipping | `ShippingController` | JWT Bearer | Customer/Admin | Returns shipment details, carrier, AWB, timestamps, addresses |
| `GET` | `/api/v1/shipments/:id/tracking` | Shipping | `ShippingController` | JWT Bearer | Customer/Admin | Returns live tracking event timeline and checkpoints |
| `POST` | `/api/v1/shipments/:id/cancel` | Shipping | `ShippingController` | JWT Bearer | `ADMIN`, `STAFF` | Cancels courier pickup/manifest at provider and DB |
| `POST` | `/api/v1/shipments/:id/label` | Shipping | `ShippingController` | JWT Bearer | `ADMIN`, `STAFF` | Generates/retrieves PDF printable barcode shipping label |
| `POST` | `/api/v1/shipments/webhooks/:provider` | Shipping | `ShippingController` | Public | All | **Inbound courier webhook receiver**: Cryptographically verified, Redis deduplication (`cacheKey = webhook_shipping:${eventId}`), syncs shipment and order status |

### 2.13 Returns & Reverse Logistics Domain (`/api/v1/returns`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/returns` | Returns | `ReturnsController` | JWT Bearer | Customer | Submits return/replacement request for delivered order |
| `GET` | `/api/v1/returns` | Returns | `ReturnsController` | JWT Bearer | Customer | Customer lists own return requests |
| `GET` | `/api/v1/returns/admin/all` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Lists all return requests |
| `PATCH` | `/api/v1/returns/admin/:id/approve` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Approves return, manifests reverse courier pickup AWB |
| `PATCH` | `/api/v1/returns/admin/:id/reject` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Rejects return with mandatory reason |
| `PATCH` | `/api/v1/returns/admin/:id/receive` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Marks reverse parcel received at warehouse |
| `PATCH` | `/api/v1/returns/admin/:id/quality-check` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Records QC inspection result, auto-restocks inventory |
| `PATCH` | `/api/v1/returns/admin/:id/replacement` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Dispatches outbound replacement order item |
| `POST` | `/api/v1/returns/:id/retry-pickup` | Returns | `ReturnsController` | JWT Bearer | `ADMIN`, `STAFF` | Reschedules reverse courier pickup |
| `GET` | `/api/v1/returns/:id` | Returns | `ReturnsController` | JWT Bearer | Customer/Admin | Returns return request details |
| `POST` | `/api/v1/returns/:id/cancel` | Returns | `ReturnsController` | JWT Bearer | Customer | Cancels return request before reverse pickup |
| `POST` | `/api/v1/returns/webhooks/:provider` | Returns | `ReturnsController` | Public | All | Inbound reverse logistics courier webhook receiver |

### 2.14 Refunds Domain (`/api/v1/refunds`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/refunds` | Refunds | `RefundsController` | JWT Bearer | Customer/Admin | Initiates refund for cancelled order or approved return |
| `GET` | `/api/v1/refunds/admin/all` | Refunds | `RefundsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Lists all refunds with summary ledger totals |
| `POST` | `/api/v1/refunds/admin/:id/process` | Refunds | `RefundsController` | JWT Bearer | `ADMIN`, `STAFF` | Admin: Retries or forces processing of pending refund |
| `GET` | `/api/v1/refunds/order/:orderId` | Refunds | `RefundsController` | JWT Bearer | Customer/Admin | Lists refunds associated with specific order |
| `GET` | `/api/v1/refunds/:id` | Refunds | `RefundsController` | JWT Bearer | Customer/Admin | Retrieves single refund details |

### 2.15 Customer Reviews Domain (`/api/v1/reviews`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reviews/product/:productId` | Reviews | `ReviewsController` | Public | All | Paginated customer reviews for product |
| `POST` | `/api/v1/reviews` | Reviews | `ReviewsController` | JWT Bearer | Customer | Submits verified customer review (updates product avg rating) |
| `PUT` | `/api/v1/reviews/:id` | Reviews | `ReviewsController` | JWT Bearer | Customer | Updates customer review |
| `DELETE` | `/api/v1/reviews/:id` | Reviews | `ReviewsController` | JWT Bearer | Customer | Deletes own review |
| `GET` | `/api/v1/reviews/admin/all` | Reviews | `ReviewsController` | JWT Bearer | `ADMIN` | Admin: Review moderation list |
| `PATCH` | `/api/v1/reviews/admin/:id/toggle-hide` | Reviews | `ReviewsController` | JWT Bearer | `ADMIN` | Admin: Hides/unhides review |
| `DELETE` | `/api/v1/reviews/admin/:id` | Reviews | `ReviewsController` | JWT Bearer | `ADMIN` | Admin: Hard deletes review |

### 2.16 Customer Notifications Domain (`/api/v1/notifications`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Notifications | `NotificationsController` | JWT Bearer | Customer | Lists user notifications |
| `GET` | `/api/v1/notifications/unread-count` | Notifications | `NotificationsController` | JWT Bearer | Customer | Returns unread notification count badge |
| `PATCH` | `/api/v1/notifications/:id/read` | Notifications | `NotificationsController` | JWT Bearer | Customer | Marks notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | Notifications | `NotificationsController` | JWT Bearer | Customer | Marks all user notifications as read |
| `GET` | `/api/v1/notifications/preferences` | Notifications | `NotificationsController` | JWT Bearer | Customer | Retrieves email and push notification preferences |
| `PUT` | `/api/v1/notifications/preferences` | Notifications | `NotificationsController` | JWT Bearer | Customer | Updates notification preferences |

### 2.17 Admin Analytics & Storage Domain
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics/dashboard` | Analytics | `AnalyticsController` | JWT Bearer | `ADMIN`, `STAFF` | Revenue, AOV, order velocity, top products |
| `POST` | `/api/v1/storage/upload` | Storage | `StorageController` | JWT Bearer | `ADMIN` | Uploads base64 images to Cloudinary CDN |

### 2.18 Brand Spotlights Domain (`/api/v1/brands`)
| HTTP Method | Full Path | Module | Controller | Auth | Role | Purpose / DB Mutation / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/brands` | Brands | `BrandsController` | Public | All | Returns active homepage brand spotlight tiles |
| `GET` | `/api/v1/brands/admin` | Brands | `BrandsController` | JWT Bearer | `ADMIN` | Admin: Lists all brand spotlights |
| `GET` | `/api/v1/brands/:id` | Brands | `BrandsController` | Public | All | Returns single brand spotlight details |
| `POST` | `/api/v1/brands` | Brands | `BrandsController` | JWT Bearer | `ADMIN` | Admin: Creates new brand spotlight |
| `PUT` | `/api/v1/brands/:id` | Brands | `BrandsController` | JWT Bearer | `ADMIN` | Admin: Updates brand name, offer tag, logo URL, priority |
| `DELETE` | `/api/v1/brands/:id` | Brands | `BrandsController` | JWT Bearer | `ADMIN` | Admin: Soft deletes brand spotlight |

---

## 3. Order Creation API Audit

* **HTTP Method**: `POST`
* **Full Endpoint**: `/api/v1/orders/checkout`
* **Authentication**: `JWT Bearer` (User extracted from token: `@CurrentUser('id') userId: string`).
* **Request Headers**: `Authorization: Bearer <jwt_token>`, `Content-Type: application/json`.
* **Request Body Schema**:
  ```json
  {
    "addressId": "0e5b7218-e327-4a7b-a256-621fa79e9432",
    "paymentProvider": "COD", // "STRIPE" | "RAZORPAY" | "COD"
    "couponCode": "WELCOME20", // Optional
    "notes": "Please deliver before 5 PM" // Optional
  }
  ```
* **Order Item Source**: Items are fetched directly from the authenticated user's database cart (`CartItem` table) with variant prices, titles, SKUs, and primary image URLs.
* **Returned Critical Identifiers**:
  * `id`: **YES** (`order.id` UUID)
  * `orderNumber`: **YES** (`order.orderNumber`, e.g. `ORD-2026-894123`)
  * `userId` / `customerId`: **YES** (`order.userId`)
  * `addressId` / `shippingAddressId`: **YES** (`order.addressId`)
  * `shippingAddress`: **YES** (full address object returned)
  * `totalAmount`, `subtotal`, `tax`, `shippingCost`, `discountAmount`: **YES**
  * `status`: **YES** (`CONFIRMED` for COD, `PENDING_PAYMENT` for Online Gateway)
  * `payment`: **YES** (includes `id`, `provider`, `amount`, `status`, `currency`)
  * `codTransaction`: **YES** (for COD orders: `id`, `amount`, `status`, `currency`)

---

## 4. Order Status Audit

### 4.1 Status State Machine Map
The application enforces strict transitions via `apps/api/src/modules/orders/order-state-machine.ts`:

| Order Status | Meaning | Who Sets It | Changing Service | Allowed Next States | History Event Logged | Customer Visible |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PENDING_PAYMENT` | Order created, awaiting gateway payment | Customer (Checkout) | `OrdersService.checkout` | `PAID`, `CONFIRMED`, `PROCESSING`, `CANCELLED`, `PAYMENT_FAILED` | `ORDER_CREATED` in `AuditLog` | Yes |
| `PAID` | Online payment captured | Gateway / Payment Verifier | `PaymentsService.verifyPayment` | `CONFIRMED`, `PROCESSING`, `PACKED`, `READY_TO_SHIP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `PAYMENT_CAPTURED` in `AuditLog` | Yes |
| `CONFIRMED` | COD order confirmed or merchant confirmed | Checkout (COD) / Admin | `OrdersService.checkout` | `PROCESSING`, `PACKED`, `READY_TO_SHIP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `ORDER_CREATED` in `AuditLog` | Yes |
| `PROCESSING` | Warehouse picked & item verification | Admin / Warehouse | `OrdersService.updateOrderStatus` | `PACKED`, `READY_TO_SHIP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `ORDER_STATUS_UPDATED` in `AuditLog` | Yes |
| `PACKED` | Parcel boxed & taped | Admin / Warehouse | `OrdersService.updateOrderStatus` | `READY_TO_SHIP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `ORDER_STATUS_UPDATED` in `AuditLog` | Yes |
| `READY_TO_SHIP` | Manifest generated, AWB assigned, awaiting courier pickup | Shipment Creator / Admin | `ShippingService.createShipment` | `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` | `SHIPMENT_CREATED` in `AuditLog` | Yes |
| `SHIPPED` | Handed to courier, package in transit | Courier Webhook / Admin | `ShippingService.updateShipmentStatus` | `OUT_FOR_DELIVERY`, `DELIVERED` | `SHIPMENT_STATUS_UPDATED` in `AuditLog` | Yes |
| `OUT_FOR_DELIVERY` | Out with delivery executive for doorstep delivery | Courier Webhook / Admin | `ShippingService.updateShipmentStatus` | `DELIVERED` | `SHIPMENT_STATUS_UPDATED` in `AuditLog` | Yes |
| `DELIVERED` | Delivered to recipient (COD collected if applicable) | Courier Webhook / Admin | `ShippingService.updateShipmentStatus` | `RETURN_REQUESTED`, `RETURN_APPROVED` | `SHIPMENT_STATUS_UPDATED` in `AuditLog` | Yes |
| `CANCELLED` | Order terminated, inventory reservation released | Customer / Admin | `OrdersService.cancelOrder` | None (Terminal) | `ORDER_CANCELLED` in `AuditLog` | Yes |
| `RETURN_REQUESTED` | Customer filed return request | Customer | `ReturnsService.createReturnRequest` | `RETURN_APPROVED`, `RETURN_REJECTED`, `RETURN_PICKED_UP`, `RETURN_RECEIVED`, `CANCELLED` | `RETURN_REQUESTED` in `AuditLog` | Yes |
| `RETURN_APPROVED` | Merchant approved return, reverse pickup scheduled | Admin | `ReturnsService.approveReturn` | `RETURN_PICKED_UP`, `RETURN_RECEIVED`, `REFUND_PENDING`, `REFUNDED`, `CANCELLED` | `RETURN_APPROVED` in `AuditLog` | Yes |
| `RETURN_PICKED_UP` | Reverse courier collected parcel from customer | Courier Webhook / Admin | `ReturnsService.updateReturnStatus` | `RETURN_RECEIVED`, `REFUND_PENDING`, `REFUNDED` | `RETURN_PICKED_UP` in `AuditLog` | Yes |
| `RETURN_RECEIVED` | Returned parcel delivered to merchant warehouse | Admin / Warehouse | `ReturnsService.markReturnReceived` | `REFUND_PENDING`, `REFUNDED`, `RETURN_REJECTED` | `RETURN_RECEIVED` in `AuditLog` | Yes |
| `REFUND_PENDING` | QC passed, awaiting bank/gateway payout | Admin / QC | `ReturnsService.performQualityCheck` | `REFUNDED` | `REFUND_PENDING` in `AuditLog` | Yes |
| `REFUNDED` | Payout sent to customer | Admin / Gateway | `RefundsService.processRefundAdmin` | None (Terminal) | `REFUND_COMPLETED` in `AuditLog` | Yes |

### 4.2 Status Compatibility with Courier Platform
| Requested Status | Status in E-Commerce DB | Compatibility Assessment |
| :--- | :--- | :--- |
| `CONFIRMED` | `OrderStatus.CONFIRMED` | **READY** |
| `PROCESSING` | `OrderStatus.PROCESSING` | **READY** |
| `SHIPPED` | `OrderStatus.SHIPPED` | **READY** |
| `IN_TRANSIT` | `ShipmentStatus.IN_TRANSIT` (Maps to `OrderStatus.SHIPPED`) | **READY** (Mapped) |
| `OUT_FOR_DELIVERY` | `OrderStatus.OUT_FOR_DELIVERY` / `ShipmentStatus.OUT_FOR_DELIVERY` | **READY** |
| `DELIVERED` | `OrderStatus.DELIVERED` / `ShipmentStatus.DELIVERED` | **READY** |
| `DELIVERY_FAILED` | `ShipmentStatus.FAILED_DELIVERY` | **READY** (Stored on Shipment model) |
| `CANCELLED` | `OrderStatus.CANCELLED` / `ShipmentStatus.CANCELLED` | **READY** |
| `RETURNING` | `ShipmentStatus.RTO_INITIATED` / `OrderStatus.RETURN_PICKED_UP` | **READY** (Mapped) |
| `RETURNED` | `ShipmentStatus.RTO_DELIVERED` / `OrderStatus.RETURN_RECEIVED` | **READY** (Mapped) |

---

## 5. Shipping Address Audit

### 5.1 Database Fields in `Address` Table
| Field | Type | DB Column | Available? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | String | `recipientName` | **YES** | Full customer recipient name |
| Phone | String | `phone` | **YES** | Recipient contact mobile number |
| Email | String | — | **MISSING on Address** | Available via relation `User.email` |
| Address Line 1 | String | `street` | **YES** | House/Flat/Street details |
| Address Line 2 | String | — | **MISSING** | Combined in `street` field |
| Landmark | String | — | **MISSING** | Combined in `street` field |
| City | String | `city` | **YES** | Destination city |
| State | String | `state` | **YES** | Destination state / province |
| Country | String | `country` | **YES** | Defaults to `IN` / `US` |
| Pincode | String | `postalCode` | **YES** | 6-digit postal code |
| Latitude | Decimal | — | **MISSING** | Geo-coordinates not stored |
| Longitude | Decimal | — | **MISSING** | Geo-coordinates not stored |

### 5.2 Address Stability & Snapshots
* **Order Link**: Linked via `Order.addressId` foreign key referencing `Address.id`.
* **Shipment Snapshot**: `Shipment.shippingAddress` stores an immutable frozen JSON snapshot (`{ name, phone, street, city, state, postalCode, country }`).
* **Post-Creation Mutation**: The `Order` address cannot be changed via customer API after creation. The courier platform receives the frozen snapshot.

---

## 6. Seller / Warehouse / Pickup Address Audit

* **Dedicated Database Model**: `MISSING` (No dedicated `Warehouse` or `SellerAddress` table in database schema).
* **Current Implementation**:
  * Managed via environment variables: `SHIPROCKET_PICKUP_LOCATION` (default: `'Primary'`).
  * In fallback shipping service: default string `'Central Fulfillment Hub - Warehouse 1 (Gurugram, HR)'`.
  * `Shipment.pickupAddress`: JSON field available in schema to store origin snapshot when manifested.
* **Courier Integration Requirement**: Courier Platform must either accept the configured `pickupLocation` code or provide a default pickup hub identifier.

---

## 7. Order Item Audit

### 7.1 Existing Fields in `OrderItem` Table
| Field | Field Name in DB | Available? | Notes |
| :--- | :--- | :--- | :--- |
| Product ID | `variant.productId` | **YES** | Via relation to `ProductVariant` |
| Variant ID | `variantId` | **YES** | Direct UUID |
| SKU | `sku` | **YES** | Stored on `OrderItem.sku` and `ProductVariant.sku` |
| Product Name | `productTitle` | **YES** | Frozen snapshot on `OrderItem` |
| Variant Name | `variantTitle` | **YES** | Frozen snapshot on `OrderItem` (e.g. `UK 9 / White`) |
| Quantity | `quantity` | **YES** | Item count ordered |
| Unit Price | `unitPrice` | **YES** | Decimal selling price |
| Total Price | `totalPrice` | **YES** | `unitPrice * quantity` |
| Image URL | `imageUrl` | **YES** | Primary product photo |
| Weight | — | **MISSING in OrderItem** | Provided via `CreateShipmentDto.weightKg` or default 0.5kg |
| Dimensions | — | **MISSING in OrderItem** | Provided via `CreateShipmentDto.dimensions` |

---

## 8. Package & Weight Audit

| Property | Catalog Level (`Product`/`Variant`) | Shipment Level (`Shipment`) | Status |
| :--- | :--- | :--- | :--- |
| Weight (KG) | Missing | Available (`Shipment.weight` Decimal) | **PARTIALLY AVAILABLE** |
| Length (CM) | Missing | Available (`Shipment.dimensions.lengthCm`) | **PARTIALLY AVAILABLE** |
| Width (CM) | Missing | Available (`Shipment.dimensions.widthCm`) | **PARTIALLY AVAILABLE** |
| Height (CM) | Missing | Available (`Shipment.dimensions.heightCm`) | **PARTIALLY AVAILABLE** |
| Package Type | Missing | Missing | **MISSING** |

* **Analysis for Courier Platform**: When creating a courier shipment, if the physical package weight/dimensions are not entered by admin in `CreateShipmentDto`, the backend defaults to standard dimensions (`0.5 KG`, `10x10x10 CM`).

---

## 9. Payment & COD Audit

### 9.1 Payment Modes & Fields
* **Payment Providers Supported**: `STRIPE`, `RAZORPAY`, `COD`.
* **Database Fields Available**:
  * `paymentMethod` / `provider`: `Payment.provider` (`STRIPE` / `RAZORPAY` / `COD`).
  * `paymentStatus`: `Payment.status` (`PENDING`, `AUTHORIZED`, `CAPTURED`, `PAID`, `FAILED`, `COD_PENDING`, `COD_COLLECTED`, `COD_SETTLED`, `REFUND_PENDING`, `REFUNDED`).
  * `amount`: `Payment.amount` (Decimal).
  * `transactionId`: `Payment.transactionId` (Unique gateway ID / Payment Intent).
  * `codAmount`: `Shipment.codAmount` and `CODTransaction.amount`.
  * `isCod`: `Shipment.isCod` (Boolean).
* **Payment Secrets Security**: All gateway secrets (`STRIPE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`) are server-only. No sensitive payment information or credit card numbers are ever stored in database.

---

## 10. Inventory Lifecycle Audit

```text
1. Customer Checkout (POST /api/v1/orders/checkout)
   └── InventoryService.reserveStock(orderNumber, items)
       └── Atomically increments ProductVariant.reservedStock & Inventory.reserved

2. Payment Verification / Order Confirmation
   ├── If Prepaid (POST /api/v1/payments/verify):
   │   └── PaymentsService verifies signature -> InventoryService.commitStock() (deducts stockQuantity & clears reservedStock)
   └── If COD:
       └── Inventory committed immediately at checkout (Order status = CONFIRMED)

3. Courier Shipment Creation (POST /api/v1/shipments)
   └── Triggered ONLY when Order status is CONFIRMED / PROCESSING / PACKED / READY_TO_SHIP
   └── Courier AWB and Label generated

4. Order Cancellation (POST /api/v1/orders/:id/cancel)
   └── InventoryService.releaseStock(orderNumber, items) (restores available stock)
```

---

## 11. Order History & Audit Logging Audit

* **AuditLog Model**:
  * `id`: UUID
  * `userId`: Actor UUID (Customer ID, Admin ID, or `'SYSTEM_COURIER_WEBHOOK'`)
  * `action`: Action string (`ORDER_CREATED`, `ORDER_STATUS_UPDATED`, `ORDER_CANCELLED`, `SHIPMENT_CREATED`, `SHIPMENT_STATUS_UPDATED`, `RETURN_APPROVED`)
  * `entity`: `'Order'` | `'Shipment'` | `'ReturnRequest'` | `'Refund'`
  * `entityId`: Target resource UUID
  * `details`: Structured JSON storing previous status, new status, AWB number, courier carrier, and tracking notes
  * `createdAt`: Timestamp
* **ShipmentTrackingEvent Model**:
  * `id`: UUID
  * `shipmentId`: Foreign key to `Shipment`
  * `status`: `ShipmentStatus` enum
  * `location`: Location string (e.g. `'Delhi Sort Hub'`)
  * `activity`: Activity description (e.g. `'Departed facility'`)
  * `timestamp`: Event occurrence timestamp
  * `eventId`: Unique string for webhook deduplication

---

## 12. Webhook Inbound Audit

* **Shipment Webhook Endpoint**: `POST /api/v1/shipments/webhooks/:provider`
* **Security & Verification**:
  * Publicly accessible endpoint with HMAC-SHA256 signature verification.
  * Extracted headers: `x-shiprocket-signature`, `x-courier-signature`, or bearer secret token.
* **Idempotency & Replay Protection**:
  * Extracts unique `eventId` or generates `evt_${awb}_${status}`.
  * Queries Redis (`webhook_shipping:${eventId}`). If found, returns `{ received: true, idempotent: true }` with status 200 without duplicate processing.
  * Caches processed event IDs in Redis with a 7-day TTL (`604,800s`).
* **Database Updates on Webhook**:
  1. Finds `Shipment` record by `awbNumber`.
  2. Updates `Shipment.status`, `dispatchedAt`, `deliveredAt`.
  3. Appends new `ShipmentTrackingEvent`.
  4. Automatically synchronizes parent `Order.status` (`SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`).
  5. If COD delivered, automatically updates `Payment.status = COD_COLLECTED` and `CODTransaction.status = COD_COLLECTED`.

---

## 13. Outbound Webhook / Callback Audit

* **In-Process Events**: NestJS `EventEmitter2` (`@nestjs/event-emitter`) is configured and active.
* **External HTTP Webhook Dispatcher**: `NOT IMPLEMENTED` (There is currently no background worker/queue like BullMQ sending outbound HTTP POST requests to third-party subscribers).

---

## 14. HTTP Client Audit

* **Implementation**: Native Global `fetch` with `AbortController` in `ShiprocketProvider`.
* **Timeout Management**: Enforces configurable `timeoutMs` (defaults to `10000ms` via `SHIPPING_TIMEOUT_MS`).
* **Token Rotation & Retries**: Automatically detects HTTP 401 token expiration, requests fresh JWT, and retries the outbound request once.
* **Global HTTP Client Service**: `LOCAL TO PROVIDER` (Built into provider class; not a standalone global NestJS module).

---

## 15. Idempotency Audit

| Operation | Header / Mechanism | Storage | Status |
| :--- | :--- | :--- | :--- |
| Courier Webhooks | `eventId` / `idempotencyKey` | Redis (`webhook_shipping:*`, TTL 7 days) | **READY** |
| Tracking Events | `ShipmentTrackingEvent.eventId` | PostgreSQL unique constraint | **READY** |
| Gateway Refunds | `Refund.idempotencyKey` | PostgreSQL unique constraint | **READY** |
| Order Checkout | Transaction isolation | Cart item deletion in transaction | **PARTIALLY IMPLEMENTED** (No generic `Idempotency-Key` header table) |

---

## 16. Order & Shipment Database Field Audit

### 16.1 Fields in `Order` Table
* `id` (String UUID) — **AVAILABLE**
* `orderNumber` (String Unique) — **AVAILABLE**
* `userId` (String) — **AVAILABLE**
* `addressId` (String) — **AVAILABLE**
* `subtotal` (Decimal) — **AVAILABLE**
* `tax` (Decimal) — **AVAILABLE**
* `shippingCost` (Decimal) — **AVAILABLE**
* `discountAmount` (Decimal) — **AVAILABLE**
* `totalAmount` (Decimal) — **AVAILABLE**
* `status` (OrderStatus enum) — **AVAILABLE**
* `trackingNumber` (String Nullable) — **AVAILABLE**

### 16.2 Fields in `Shipment` Table
* `id` (String UUID) — **AVAILABLE**
* `orderId` (String Unique) — **AVAILABLE**
* `courierProvider` (String) — **AVAILABLE**
* `awbNumber` (String Unique) — **AVAILABLE**
* `trackingUrl` (String Nullable) — **AVAILABLE**
* `labelUrl` (String Nullable) — **AVAILABLE**
* `status` (ShipmentStatus enum) — **AVAILABLE**
* `pickupAddress` (Json Nullable) — **AVAILABLE**
* `shippingAddress` (Json Nullable) — **AVAILABLE**
* `weight` (Decimal Nullable) — **AVAILABLE**
* `dimensions` (Json Nullable) — **AVAILABLE**
* `codAmount` (Decimal Nullable) — **AVAILABLE**
* `isCod` (Boolean) — **AVAILABLE**
* `dispatchedAt` (DateTime Nullable) — **AVAILABLE**
* `deliveredAt` (DateTime Nullable) — **AVAILABLE**
* `estimatedDelivery` (DateTime Nullable) — **AVAILABLE**
* `failureReason` (String Nullable) — **AVAILABLE**
* `metadata` (Json Nullable) — **AVAILABLE**

---

## 17. Customer Order & Tracking APIs Audit

* **`GET /api/v1/orders/:id`**: Returns order summary, item list, address, payment, and `tracking: { trackingNumber, status, steps: [...] }`.
* **`GET /api/v1/shipments/:id/tracking`**: Returns full checkpoint history, carrier name, AWB number, live location, and estimated delivery date.
* **Customer Status**: **READY**.

---

## 18. Admin Order & Courier Operations Audit

| Operation | Existing API Endpoint | Method | Status |
| :--- | :--- | :--- | :--- |
| View All Orders | `/api/v1/orders/admin/all` | `GET` | **READY** |
| Update Order Status | `/api/v1/orders/admin/:id/status` | `PATCH` | **READY** |
| Cancel Order | `/api/v1/orders/:id/cancel` | `POST` | **READY** |
| Create Courier Shipment | `/api/v1/shipments` | `POST` | **READY** |
| View All Shipments | `/api/v1/shipments/admin/all` | `GET` | **READY** |
| Get Printable Label | `/api/v1/shipments/:id/label` | `POST` | **READY** |
| Cancel Shipment | `/api/v1/shipments/:id/cancel` | `POST` | **READY** |
| Manual Tracking Sync | `/api/v1/shipments/admin/:id/status` | `PATCH` | **READY** |
| COD Ledger & Reconciliation | `/api/v1/payments/admin/cod/all` | `GET` | **READY** |

---

## 19. Shipping Cost Calculation Audit

* **Current Implementation**:
  * Located in `apps/api/src/modules/orders/orders.service.ts` (`previewCheckout` & `checkout`).
  * Rule: Flat calculation: `const shippingCost = subtotal >= 100 ? 0 : 10;`.
* **Courier Quote Injection**:
  * `POST /api/v1/orders/preview` can easily accept a dynamic rate quote hook from the Courier Platform by querying courier serviceability with origin pincode and customer `destinationPincode`.

---

## 20. Checkout Flow Audit

```text
1. Shopping Cart (`/cart`)
       ↓
2. Address Selection (`/checkout`) -> User selects `Address` (has `postalCode`, `city`, `state`)
       ↓
3. [COURIER QUOTE INJECTION POINT] -> (Can query Courier Platform for estimated shipping cost & SLA)
       ↓
4. Payment Selection -> Selects `COD`, `RAZORPAY`, or `STRIPE`
       ↓
5. Order Creation (`POST /api/v1/orders/checkout`) -> Creates `Order` with `status: CONFIRMED` (COD) or `PENDING_PAYMENT`
       ↓
6. Fulfillment & Logistics (`POST /api/v1/shipments`) -> Admin/System manifests Courier Shipment with AWB
```

---

## 21. Customer → Courier Data Compatibility Matrix

| E-Commerce Data Requirement | Existing Database Field / Source | Available in Codebase? |
| :--- | :--- | :--- |
| External Order ID | `Order.id` (UUID) & `Order.orderNumber` (`ORD-2026-XXXXXX`) | **YES** |
| Customer Name | `Address.recipientName` | **YES** |
| Customer Phone | `Address.phone` | **YES** |
| Customer Email | `User.email` (via `Order.user.email`) | **YES** |
| Pickup Origin Address | `Shipment.pickupAddress` / `SHIPROCKET_PICKUP_LOCATION` env | **YES** |
| Delivery Address | `Address.street`, `Address.city`, `Address.state`, `Address.country` | **YES** |
| Destination Pincode | `Address.postalCode` | **YES** |
| Package Weight | `Shipment.weight` / `CreateShipmentDto.weightKg` (defaults to 0.5kg) | **PARTIALLY AVAILABLE** |
| Package Dimensions | `Shipment.dimensions` / `CreateShipmentDto.dimensions` | **PARTIALLY AVAILABLE** |
| Order Declared Value | `Order.totalAmount` (Decimal) | **YES** |
| Payment Mode | `Payment.provider` (`COD` / `PREPAID`) | **YES** |
| COD Collectable Amount | `Shipment.codAmount` / `Order.totalAmount` | **YES** |
| Item SKU List | `OrderItem.sku` (Array) | **YES** |
| Product Names | `OrderItem.productTitle` (Array) | **YES** |
| Item Quantities | `OrderItem.quantity` (Array) | **YES** |

---

## 22. Courier Response Storage Compatibility

| Courier Response Field | E-Commerce Database Storage Target | Available in Schema? |
| :--- | :--- | :--- |
| Courier Shipment ID | `Shipment.metadata.shipment_id` / `Shipment.id` | **YES** |
| Tracking Number | `Order.trackingNumber` & `Shipment.awbNumber` | **YES** |
| AWB Number | `Shipment.awbNumber` (Unique Index) | **YES** |
| Courier Carrier Provider | `Shipment.courierProvider` (String Index) | **YES** |
| Courier Status | `Shipment.status` (`ShipmentStatus` enum) | **YES** |
| Printable Label URL | `Shipment.labelUrl` (String) | **YES** |
| Tracking URL | `Shipment.trackingUrl` (String) | **YES** |
| Estimated Delivery Date | `Shipment.estimatedDelivery` (DateTime) | **YES** |
| Dispatch Timestamp | `Shipment.dispatchedAt` (DateTime) | **YES** |
| Delivery Timestamp | `Shipment.deliveredAt` (DateTime) | **YES** |
| Delivery Failure Reason | `Shipment.failureReason` (String) | **YES** |
| Raw Courier Payload | `Shipment.metadata` (JSON) | **YES** |

---

## 23. Status Mapping Matrix

| Courier Platform Status | Existing E-Commerce Shipment Status | Existing Order Status | Compatibility |
| :--- | :--- | :--- | :--- |
| `CREATED` / `MANIFESTED` | `ShipmentStatus.LABEL_CREATED` | `OrderStatus.READY_TO_SHIP` | **READY** |
| `PICKED_UP` | `ShipmentStatus.PICKED_UP` | `OrderStatus.SHIPPED` | **READY** |
| `IN_TRANSIT` | `ShipmentStatus.IN_TRANSIT` | `OrderStatus.SHIPPED` | **READY** |
| `OUT_FOR_DELIVERY` | `ShipmentStatus.OUT_FOR_DELIVERY` | `OrderStatus.OUT_FOR_DELIVERY` | **READY** |
| `DELIVERED` | `ShipmentStatus.DELIVERED` | `OrderStatus.DELIVERED` | **READY** |
| `DELIVERY_FAILED` | `ShipmentStatus.FAILED_DELIVERY` | `OrderStatus.SHIPPED` (Order intact) | **READY** |
| `RETURN_INITIATED` (RTO) | `ShipmentStatus.RTO_INITIATED` | `OrderStatus.RETURN_PICKED_UP` | **READY** |
| `RETURNED` (RTO Received) | `ShipmentStatus.RTO_DELIVERED` | `OrderStatus.RETURN_RECEIVED` | **READY** |
| `CANCELLED` | `ShipmentStatus.CANCELLED` | `OrderStatus.CANCELLED` | **READY** |

---

## 24. Security Audit

* **Authentication & Guards**:
  * Global `JwtAuthGuard` enforced across all routes by default via `APP_GUARD`.
  * Public endpoints explicitly annotated with `@Public()`.
  * Role authorization enforced via `@Roles(Role.ADMIN, Role.STAFF)` and `RolesGuard`.
* **IDOR Protection**:
  * Orders and Addresses strictly query by `userId` from authenticated JWT (`where: { id, userId }`).
* **Rate Limiting**:
  * Throttler module configured (`limit: 100 req/min` globally; strict `10/min` on auth endpoints).
* **CORS & Headers**:
  * Helmet security headers configured in `main.ts`.
  * CORS whitelist configured for frontend domains with credentials.
* **Webhook Signature Verification**:
  * Cryptographic HMAC signature verification enforced before processing inbound payloads.
* **Input Validation**:
  * Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

---

## 25. Environment Variables Audit

### 25.1 Existing Configured Variables (Sanitized)
```text
PORT = CONFIGURED
NODE_ENV = CONFIGURED
API_PREFIX = CONFIGURED
APP_URL = CONFIGURED
DATABASE_URL = CONFIGURED
DIRECT_URL = CONFIGURED
REDIS_URL = CONFIGURED
JWT_ACCESS_SECRET = CONFIGURED
JWT_ACCESS_EXPIRATION = CONFIGURED
JWT_REFRESH_SECRET = CONFIGURED
JWT_REFRESH_EXPIRATION = CONFIGURED
STRIPE_SECRET_KEY = CONFIGURED
STRIPE_WEBHOOK_SECRET = CONFIGURED
RAZORPAY_KEY_ID = CONFIGURED
RAZORPAY_KEY_SECRET = CONFIGURED
CLOUDINARY_CLOUD_NAME = CONFIGURED
CLOUDINARY_API_KEY = CONFIGURED
CLOUDINARY_API_SECRET = CONFIGURED
SHIPPING_PROVIDER = CONFIGURED
SHIPPING_WEBHOOK_SECRET = CONFIGURED
SHIPPING_TIMEOUT_MS = CONFIGURED
SHIPROCKET_BASE_URL = CONFIGURED
SHIPROCKET_EMAIL = CONFIGURED
SHIPROCKET_PASSWORD = CONFIGURED
SHIPROCKET_WEBHOOK_SECRET = CONFIGURED
SHIPROCKET_PICKUP_LOCATION = CONFIGURED
RETURN_WINDOW_DAYS = CONFIGURED
```

### 25.2 Target Courier Platform Variables (To be provisioned later)
```text
COURIER_PLATFORM_URL
COURIER_CLIENT_ID
COURIER_CLIENT_SECRET
COURIER_WEBHOOK_SECRET
COURIER_REQUEST_TIMEOUT_MS
```

---

## 26. API Response & Error Conventions

* **Standard Success Envelope (`TransformInterceptor`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation successful",
    "data": {},
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    },
    "timestamp": "2026-09-03T17:49:00.000Z"
  }
  ```
* **Standard Error Envelope (`AllExceptionsFilter`)**:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Invalid courier webhook cryptographic signature",
    "path": "/api/v1/shipments/webhooks/custom",
    "timestamp": "2026-09-03T17:49:00.000Z"
  }
  ```

---

## 27. Integration Gap Analysis

### 27.1 READY (Fully Available & Operational)
1. **Order Manifestation & Creation (`POST /api/v1/orders/checkout`)**: Fully operational with customer ID, address snapshot, item SKU breakdown, total price, and COD registration.
2. **Shipment Manifest Storage (`POST /api/v1/shipments`)**: Database model, AWB generation, label storage, and initial tracking event creation.
3. **Inbound Courier Webhook (`POST /api/v1/shipments/webhooks/:provider`)**: Cryptographic signature verification, Redis replay protection (`TTL 7 days`), tracking checkpoint updates, and parent Order status sync.
4. **Customer Live Tracking (`GET /api/v1/shipments/:id/tracking`)**: Returns live checkpoint timeline, location, carrier name, and estimated delivery date.
5. **Admin Operations**: List all shipments, update tracking status, cancel shipment, print labels, and COD collection confirmation.

### 27.2 NEEDS FIX (Minor Adjustments Required for Courier Platform)
1. **Per-Product Weight & Dimensions**: `ProductVariant` table does not have `weightKg`, `lengthCm`, `widthCm`, `heightCm` columns (currently entered at shipment time in `CreateShipmentDto` or defaults to 0.5kg).
2. **Dynamic Courier Rate Quote at Checkout**: `POST /api/v1/orders/preview` uses flat shipping calculation (`subtotal >= 100 ? 0 : 10`); needs a hook to query courier platform for dynamic shipping quotes.
3. **Dedicated Warehouse/Origin Table**: Pickup origin is configured via env string rather than a database table for multiple seller warehouses.

### 27.3 MISSING (To be Connected via Courier Platform)
1. **Outbound External Webhook Dispatcher**: No background queue to dispatch real-time events to external third-party webhook subscribers.
2. **Generic Client-side Idempotency-Key Header on Checkout**: Relies on cart deletion in transaction rather than a dedicated idempotency cache table.

---

## 28. Most Important Final Audit Table

| Requirement | Existing API / Field | Method | Endpoint | Available? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Order** | `OrdersController.checkout` | `POST` | `/api/v1/orders/checkout` | **YES** | Returns orderId, orderNumber, customerId, addressId |
| **Get Order** | `OrdersController.findOrderById` | `GET` | `/api/v1/orders/:id` | **YES** | Returns full order, items, addresses, payment, tracking status |
| **Shipping Address** | `Address` model | `GET` / `POST` | `/api/v1/users/me/addresses` | **YES** | Recipient name, phone, street, city, state, postalCode, country |
| **Pickup Address** | `Shipment.pickupAddress` | `POST` | `/api/v1/shipments` | **PARTIALLY IMPLEMENTED** | Configured in env / default string; no multi-warehouse DB table |
| **Package Weight** | `Shipment.weight` / DTO | `POST` | `/api/v1/shipments` | **PARTIALLY IMPLEMENTED** | Stored on Shipment; missing on catalog Product table |
| **Cash on Delivery (COD)** | `Payment` & `CODTransaction` | `POST` | `/api/v1/orders/checkout` | **YES** | Full COD support with status tracking & reconciliation |
| **Shipping Quote** | `OrdersController.previewCheckout` | `POST` | `/api/v1/orders/preview` | **PARTIALLY IMPLEMENTED** | Currently flat rate; needs dynamic courier quote hook |
| **Courier Shipment ID Storage** | `Shipment.id` & `Shipment.metadata` | DB | `Shipment` Table | **YES** | Primary UUID + JSON metadata |
| **Tracking Number Storage** | `Order.trackingNumber` & `Shipment.awbNumber` | DB | `Order` & `Shipment` | **YES** | Indexed columns on both tables |
| **AWB Storage** | `Shipment.awbNumber` | DB | `Shipment` Table | **YES** | Unique indexed column |
| **Courier Status Storage** | `Shipment.status` | DB | `Shipment` Table | **YES** | Full `ShipmentStatus` enum |
| **Customer Tracking** | `ShippingController.getShipmentTracking` | `GET` | `/api/v1/shipments/:id/tracking` | **YES** | Real-time tracking events & checkpoints |
| **Courier Webhook** | `ShippingController.handleCourierWebhook` | `POST` | `/api/v1/shipments/webhooks/:provider` | **YES** | Signature verified, Redis deduplication, order sync |
| **Admin Courier Actions** | `ShippingController` | `POST`/`PATCH` | `/api/v1/shipments/*` | **YES** | Create shipment, cancel, print label, update status |
| **Idempotency** | Redis Key / Unique DB Constraints | Service | `ShipmentTrackingEvent.eventId` | **YES** | 7-day replay protection on webhooks |

---

## 29. Recommended Safe Integration Contract

When connecting `courier-logistics-platform`:
1. **Shipment Booking**: Admin or system triggers `POST /api/v1/shipments` with `orderId`. E-Commerce prepares payload with recipient name, phone, delivery address, pincode, items, and COD amount, then sends outbound booking to `courier-logistics-platform`.
2. **AWB & Label Ingestion**: `courier-logistics-platform` returns `{ awbNumber, labelUrl, trackingUrl, status: 'LABEL_CREATED' }`, which E-Commerce saves in `Shipment` and updates `Order.status = 'READY_TO_SHIP'`.
3. **Status Sync via Webhooks**: `courier-logistics-platform` posts real-time status updates to `POST /api/v1/shipments/webhooks/courier-platform`. E-Commerce validates the signature, deduplicates `eventId` in Redis, appends `ShipmentTrackingEvent`, and updates `Order.status`.
