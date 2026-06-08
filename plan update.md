# 🚀 Dynamic Hub — Phase 15–16 Implementation Prompt (Enquiry → Order → Offline Payment WITHOUT Proof)

---

# 📌 Project Context

We are building a **large-scale B2B industrial catalog platform (McMaster-style)** with:

* NestJS (API)
* PostgreSQL (Prisma)
* Redis + BullMQ
* SeaweedFS (S3 storage)
* Meilisearch
* Next.js (admin + frontend)

---

# ✅ Current Status (Completed)

* Product + Variant system
* SKU-based architecture
* Image ingestion pipeline (ZIP → worker → SeaweedFS → DB)
* BullMQ workers fully working
* Admin catalog UI

---

# 🎯 Objective

Implement a complete:

## 👉 Enquiry → Quote → Order → Offline Payment System

⚠️ Payment is handled **outside the platform** (UPI / bank / manual),
so **NO payment gateway and NO proof upload required**

---

# 🧠 System Flow

```text
Browse Products
→ Add to Enquiry (basket)
→ Submit Enquiry
→ Admin Reviews
→ Admin Adds Pricing (Quote)
→ User Confirms
→ Payment Done Offline
→ Admin Marks as Paid
→ Order Processing
→ Completed
```

---

# 🧱 DATABASE DESIGN (Prisma)

## Enquiry

```ts
model Enquiry {
  id              String   @id @default(uuid())
  enquiryNumber   String   @unique

  customerName    String
  companyName     String?
  email           String
  phone           String?

  status          EnquiryStatus
  paymentStatus   PaymentStatus

  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           EnquiryItem[]
}
```

---

## EnquiryItem

```ts
model EnquiryItem {
  id          String   @id @default(uuid())

  enquiryId   String
  enquiry     Enquiry  @relation(fields: [enquiryId], references: [id])

  productId   String
  variantId   String
  sku         String

  quantity    Int

  price       Float?   // added during quote
  total       Float?

  notes       String?

  createdAt   DateTime @default(now())
}
```

---

## Enums

```ts
enum EnquiryStatus {
  SUBMITTED
  IN_PROGRESS
  QUOTED
  AWAITING_CONFIRMATION
  CONFIRMED
  PAYMENT_PENDING
  PAID
  PROCESSING
  COMPLETED
  CLOSED
}

enum PaymentStatus {
  PENDING
  MARKED_PAID
}
```

---

# ⚙️ BACKEND (NestJS)

## Modules

* EnquiryModule
* EnquiryService
* EnquiryController
* AdminEnquiryController

---

## API ENDPOINTS

### Customer

```http
POST   /enquiries                  → create enquiry
GET    /enquiries/my              → list user enquiries
GET    /enquiries/:id             → enquiry details
POST   /enquiries/:id/confirm     → confirm order
```

---

### Admin

```http
GET    /admin/enquiries
GET    /admin/enquiries/:id

PATCH  /admin/enquiries/:id/status
PATCH  /admin/enquiries/:id/notes

POST   /admin/enquiries/:id/quote        → add pricing
POST   /admin/enquiries/:id/mark-paid    → mark payment done
```

---

# 🧠 BUSINESS LOGIC

## 1️⃣ Enquiry Creation

* User submits enquiry with items
* Status → `SUBMITTED`

---

## 2️⃣ Admin Processing

* Status → `IN_PROGRESS`
* Admin reviews items

---

## 3️⃣ Quote

* Admin sets:

  * price per item
  * total per item
* Status → `QUOTED`

---

## 4️⃣ User Confirmation

* User clicks:
  👉 “Confirm Order”

* Status →
  `CONFIRMED → PAYMENT_PENDING`

---

## 5️⃣ Offline Payment

User pays outside platform:

* UPI / Bank Transfer / etc.

---

## 6️⃣ Admin Marks Paid

* Admin manually verifies payment
* Sets:

```ts
paymentStatus = MARKED_PAID
status = PAID
```

---

## 7️⃣ Order Processing

* Status → `PROCESSING`
* Final → `COMPLETED`

---

# 🖥️ FRONTEND (Next.js)

---

## 1️⃣ Enquiry Basket (Cart-like UX)

* Local state (or global store)
* Add items:

  * variantId
  * sku
  * quantity

Features:

* Update qty
* Remove item
* Submit enquiry

---

## 2️⃣ Submit Enquiry Page

Form:

* Name
* Company
* Email
* Phone

Button:

👉 “Request Quote”

---

## 3️⃣ User Dashboard

## 👉 “My Orders” (IMPORTANT — NOT “Enquiries”)

Each item shows:

* Enquiry Number
* Status
* Total (after quote)
* Created date

---

## 4️⃣ Order Detail Page

Sections:

### Items

* SKU
* Product
* Quantity
* Price (after quote)
* Total

---

### Status Timeline

```text
Submitted → In Progress → Quoted → Confirmed → Paid → Processing → Completed
```

---

### Action Buttons

* If QUOTED:
  👉 Confirm Order

---

### Payment Info Section

Show:

```text
Please complete payment using:
UPI ID: your@upi
Reference: ENQ-000123
Amount: ₹XXXX
```

---

## 5️⃣ Admin Dashboard

---

### Enquiry List

* Enquiry Number
* Customer
* Status
* Date

Filters:

* Status
* Search

---

### Enquiry Detail

Sections:

#### Customer Info

#### Items Table

#### Pricing Editor

* Input price per item

#### Notes

#### Status Control

Buttons:

* Mark as Quoted
* Mark as Paid
* Move to Processing
* Complete Order

---

# 🔴 IMPORTANT RULES

1. Always store SKU in EnquiryItem (snapshot)
2. Do NOT rely on product price
3. Do NOT build payment gateway
4. Keep admin flow fast (<30 sec per enquiry)
5. UI should say “Orders”, not “Enquiries”

---

# 🚀 FUTURE PHASES

Next:

* Email notifications (status updates)
* File attachments (PDF drawings)
* Convert Enquiry → Order table (optional later)
* Analytics dashboard

---

# 🧭 FINAL GOAL

A system where:

* Users feel like placing an order
* Admin controls pricing and flow
* Payments are handled offline
* Platform scales to large B2B operations

---

# END
