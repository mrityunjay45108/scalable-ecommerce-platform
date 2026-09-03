# E-Commerce → Courier & Logistics Platform Production Integration

## 1. Architecture Overview

This production integration connects the **NovaStore E-Commerce Platform** with the standalone **Courier & Logistics Platform (`courier-logistics-platform`)**.

The integration follows a clean, decoupled provider adapter pattern:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        NOVASTORE E-COMMERCE BACKEND                    │
│                                                                        │
│   ┌────────────────────┐          ┌────────────────────────────────┐   │
│   │   OrdersService    │─────────▶│        ShippingService         │   │
│   │ (Preview/Checkout) │          │(Shipment Lifecycle & Webhooks) │   │
│   └────────────────────┘          └────────────────────────────────┘   │
│                                                   │                    │
│                                                   ▼                    │
│                                     ┌───────────────────────────┐      │
│                                     │  ShippingProviderFactory  │      │
│                                     └───────────────────────────┘      │
│                                                   │                    │
│                        ┌──────────────────────────┼──────────────────┐ │
│                        ▼                          ▼                  ▼ │
│              ┌──────────────────┐       ┌──────────────────┐ ┌───────┐ │
│              │ShiprocketProvider│       │ CourierPlatform  │ │ Mock/ │ │
│              │  (Legacy/Direct) │       │     Provider     │ │StdExp │ │
│              └──────────────────┘       └──────────────────┘ └───────┘ │
└───────────────────────────────────────────────────┬────────────────────┘
                                                    │ Server-to-Server
                                                    │ HTTPS / API Key
                                                    ▼
                             ┌───────────────────────────────────────────┐
                             │        COURIER & LOGISTICS PLATFORM       │
                             │        (courier-logistics-platform)       │
                             └───────────────────────────────────────────┘
```

---

## 2. Server-Only Environment Variables

All Courier Platform secrets and credentials are server-only. **They are never exposed to the frontend browser bundle.**

Add these to backend configuration / `.env`:

```env
# Courier & Logistics Platform Integration
COURIER_API_BASE_URL="http://localhost:5000"
COURIER_API_KEY="your_production_courier_api_key"
COURIER_WEBHOOK_SECRET="your_production_webhook_secret"
COURIER_TIMEOUT_MS=10000
COURIER_ENABLED=true
COURIER_PROVIDER_NAME="COURIER_PLATFORM"
COURIER_FRONTEND_BASE_URL="http://localhost:5000/track"
COURIER_PICKUP_PINCODE="110001"
```

---

## 3. Provider Abstraction (`ShippingProviderInterface`)

The `CourierPlatformProvider` implements `ShippingProviderInterface` and is resolved by `ShippingProviderFactory`:

* **Provider Identifier**: `COURIER_PLATFORM` (also aliases `COURIER`, `COURIER_LOGISTICS`)
* **Fallback Behavior**: If credentials are unset in development, the provider executes realistic mock responses with deterministic AWB generation without throwing crashes.

---

## 4. Serviceability & Pricing Quote Integration

### 4.1 Order Preview Flow (`POST /api/v1/orders/preview`)
1. Customer enters delivery address on checkout.
2. `OrdersService.previewCheckout` calls `ShippingService.checkServiceability(address.postalCode, 'COURIER_PLATFORM')`.
3. If unserviceable, throws clean HTTP 400 error (`Delivery is not serviceable for postal code: XXXXXX`).
4. If serviceable, queries `POST /api/pricing/quote` with estimated package weight (0.5kg/item, min 1.5kg).
5. Dynamic `shippingCost` is applied to subtotal, tax, and order total.

### 4.2 Courier Quote Payload
```json
{
  "pickupPincode": "110001",
  "deliveryPincode": "201301",
  "weight": 1.5,
  "length": 25,
  "width": 20,
  "height": 15,
  "shipmentType": "COD",
  "codAmount": 1499
}
```

---

## 5. Order Confirmation → Shipment Creation

### 5.1 Trigger & Timing
* **Cash on Delivery (COD)**: Order is created with `status: CONFIRMED` and `paymentStatus: COD_PENDING`. Admin or auto-manifest triggers `POST /api/v1/shipments`.
* **Prepaid Orders**: Order is created with `status: PENDING_PAYMENT`. Once gateway payment is captured (`POST /api/v1/payments/verify`), order advances to `PAID` / `CONFIRMED`, and shipment can be manifested.

### 5.2 Outbound Courier Request
* **Endpoint**: `POST /api/shipments`
* **Headers**:
  * `X-Api-Key: <COURIER_API_KEY>`
  * `Idempotency-Key: courier-shipment:<orderNumber>`
  * `X-Request-Id: <uuid>`
  * `Content-Type: application/json`
* **Payload**:
  ```json
  {
    "externalOrderId": "ORD-2026-90481",
    "shipmentType": "COD",
    "codAmount": 1499,
    "notes": "Handle with care",
    "package": {
      "weight": 1.5,
      "length": 25,
      "width": 20,
      "height": 15,
      "packageType": "PARCEL",
      "description": "Footwear"
    },
    "pickupAddress": {
      "name": "E-Commerce Fulfillment Warehouse",
      "phone": "+919876543210",
      "addressLine1": "Plot 42, Industrial Area Phase 2",
      "city": "New Delhi",
      "state": "Delhi",
      "postalCode": "110001",
      "country": "India"
    },
    "deliveryAddress": {
      "name": "Jane Customer",
      "phone": "+919123456780",
      "addressLine1": "Flat 302, Green Valley Apartments",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "postalCode": "201301",
      "country": "India"
    }
  }
  ```

---

## 6. Idempotency & Failure Recovery

1. **Deterministic Idempotency Key**: Generated as `courier-shipment:${orderNumber}`.
2. **Network Timeout / 409 Conflict Recovery**: If an HTTP timeout (or 409 conflict) occurs, `CourierPlatformProvider` automatically queries `GET /api/shipments/by-external-order/:externalOrderId` to retrieve the registered shipment without creating duplicate shipments.

---

## 7. Shipment & Tracking Storage Mapping

| Courier Field | E-Commerce Database Storage | Notes |
| :--- | :--- | :--- |
| `trackingNumber` | `Shipment.metadata.carrierTrackingNumber` | Carrier tracking code |
| `awbNumber` | `Shipment.awbNumber` (Unique Index) | Assigned AWB identifier |
| `trackingUrl` | `Shipment.trackingUrl` | `<COURIER_FRONTEND_BASE_URL>/<trackingNumber>` |
| `label.url` | `Shipment.labelUrl` | Empty string if `LABEL_METADATA_ONLY` |
| `carrier` | `Shipment.metadata.carrier` | Assigned courier name |
| `status` | `Shipment.status` | Normalized `ShipmentStatus` enum |
| `estimatedDelivery` | `Shipment.estimatedDelivery` | Estimated delivery DateTime |

---

## 8. Webhook Ingestion & Signature Verification

### 8.1 Inbound Webhook Endpoint
* **Path**: `POST /api/v1/shipments/webhooks/courier` (or `courier-platform`)
* **Headers**:
  * `X-Courier-Event-Id`: Unique event UUID
  * `X-Courier-Timestamp`: Unix timestamp (seconds or ms)
  * `X-Courier-Signature`: `HMAC-SHA256(secret, timestamp + "." + rawBody)`

### 8.2 Security & Replay Protection
1. **Timestamp Staleness Check**: Rejects webhooks with timestamps older than 5 minutes (300 seconds).
2. **Constant-Time Verification**: Uses `crypto.timingSafeEqual` to prevent timing attacks.
3. **Redis Deduplication**: Caches `webhook_shipping:${eventId}` for 7 days (`TTL 604,800s`).
4. **Order State Machine Validation**: Uses `CourierStatusMappingService` to ensure invalid out-of-order transitions are safely ignored without corrupting order lifecycle.

---

## 9. Status Synchronization Table

| Courier Status | E-Commerce Shipment Status | E-Commerce Order Status | COD Action |
| :--- | :--- | :--- | :--- |
| `CREATED` / `MANIFESTED` | `LABEL_CREATED` | `READY_TO_SHIP` | None |
| `PICKUP_SCHEDULED` | `READY_FOR_PICKUP` | `READY_TO_SHIP` | None |
| `PICKED_UP` | `PICKED_UP` | `SHIPPED` | None |
| `IN_TRANSIT` | `IN_TRANSIT` | `SHIPPED` | None |
| `OUT_FOR_DELIVERY` | `OUT_FOR_DELIVERY` | `OUT_FOR_DELIVERY` | None |
| `DELIVERED` | `DELIVERED` | `DELIVERED` | **Auto-confirms COD Collection** |
| `DELIVERY_FAILED` | `FAILED_DELIVERY` | *Preserves current state* | None |
| `CANCELLED` | `CANCELLED` | `CANCELLED` | Releases inventory |
| `RETURN_INITIATED` | `RTO_INITIATED` | `RETURN_PICKED_UP` | None |
| `RETURNED` | `RTO_DELIVERED` | `RETURN_RECEIVED` | Ready for QC/Refund |

---

## 10. Background Reconciliation Audit

* **API**: `GET /api/v1/shipments/admin/reconcile?provider=COURIER_PLATFORM`
* **Behavior**:
  1. Queries Courier Platform `/api/integrations/shipments/reconciliation`.
  2. Compares courier state against local DB `Shipment` records.
  3. Applies status updates if courier state has newer timestamp without overwriting terminal states.
