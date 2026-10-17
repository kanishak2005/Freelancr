# Freelancr External Integrations Baseline

> **Generated:** Baseline Capture for PRD 01  
> **Integrations Covered:** Razorpay, Cloudinary, Nodemailer (SMTP), MongoDB (Mongoose)

---

## 1. Razorpay Payment Gateway

- **SDK:** `razorpay@2.9.8`
- **Client Key:** `VITE_RAZORPAY_KEY_ID` (Frontend)
- **Server Credentials:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Currency:** `INR` (all amounts converted to paise via `Math.round(amount * 100)`)

### 1.1. Order Creation Flow (`POST /api/v1/payments/create-order`)
1. Validates that caller is the client on the active contract.
2. Checks that contract has not already been paid.
3. Retrieves `amount` strictly from the contract record in the database—never from client request body.
4. Creates order via `razorpay.orders.create({ amount: Math.round(amount * 100), currency: "INR", receipt: `contract_${contract._id}` })`.
5. Inserts a `Payment` record with status `"created"`.

### 1.2. Payment Verification Flow (`POST /api/v1/payments/verify`)
1. Client submits `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
2. Server verifies caller is the client owner of the payment record.
3. Guards against re-verification if already `"paid"` or `"partially_refunded"`.
4. Computes HMAC SHA-256:
   ```typescript
   crypto
     .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
     .update(`${payment.razorpayOrderId}|${razorpay_payment_id}`)
     .digest("hex");
   ```
5. Uses `crypto.timingSafeEqual` with matched buffer lengths to prevent timing attacks.
6. Fetches payment from Razorpay API (`razorpay.payments.fetch(razorpay_payment_id)`) to verify:
   - `order_id` matches expected order.
   - `amount` matches expected paise amount.
   - `currency` matches expected currency (`INR`).
   - `status === "captured"`.
7. Transitions payment status to `"paid"`, sets `paidAt`, and sends payment notification to freelancer.

### 1.3. Webhook Flow (`POST /api/v1/payments/webhook`)
- **Middleware Ordering:** Must execute `express.raw({ type: "application/json" })` **prior** to global `express.json()`.
- **Signature Check:** Validates `x-razorpay-signature` header against HMAC SHA-256 of `rawBody` using `env.RAZORPAY_WEBHOOK_SECRET` with `crypto.timingSafeEqual`.
- **Supported Events:**
  - `payment.captured`: Updates payment status to `"paid"` and sets `paidAt` if not already paid/refunded.
  - `payment.failed`: Sets payment status to `"failed"` if not already paid.
  - `refund.created`: Sets `pendingRefundId` and `pendingRefundAmount`.
  - `refund.processed`: Fetches Razorpay payment details, validates idempotency against current `refundedAmount`, updates status to `"refunded"` or `"partially_refunded"`, and clears pending refund fields.
  - `refund.failed`: Clears `pendingRefundAmount` and `pendingRefundId`.

### 1.4. Refund Flow (`PATCH /api/v1/payments/refund/:id`)
- Only contract client can request refund.
- Payment status must be `"paid"` or `"partially_refunded"`.
- Guards against concurrent refund requests (`pendingRefundAmount > 0 || pendingRefundId !== ""`).
- Fetches live payment from Razorpay to calculate remaining refundable amount: `remainingAmount = originalAmount - amountAlreadyRefunded`.
- Rejects refund amounts exceeding `remainingAmount` or amounts `<= 0`.
- Issues refund via `razorpay.payments.refund(payment.razorpayPaymentId, { amount: refundAmount })`.
- If immediately processed by Razorpay, updates status and `refundedAmount`; otherwise sets pending refund fields awaiting webhook.

---

## 2. Cloudinary Media Storage

- **SDK:** `cloudinary@2.10.0`
- **Config:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Upload Mechanism:** Multer memory storage (`multer.memoryStorage()`) streaming via `cloudinary.uploader.upload_stream`.
- **File Size Limit:** 10MB (`10 * 1024 * 1024` bytes) enforced in Multer.

### 2.1. File Filtering Policies
- **General / Portfolio Uploads (`upload`):**
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
  - Cloudinary resource type: `"image"` / `"auto"`.
  - Folder: `"freelancr"`.
- **Resume Uploads (`resumeUpload`):**
  - Allowed MIME types: `application/pdf`.
  - Cloudinary resource type: `"raw"`.
  - Folder: `"freelancr/resumes"`.

### 2.2. Deletion Policy (`DELETE /api/v1/upload/:publicId`)
- Caller must be authenticated.
- Verifies that the authenticated user actually owns the file (checks `user.resumePublicId === publicId` or portfolio item `item.publicId === publicId`).
- Resolves correct `resourceType` (`"raw"` for resume, `"image"` for portfolio).
- Invokes `cloudinary.uploader.destroy(publicId, { resource_type })`.

---

## 3. Nodemailer & SMTP Email Service

- **SDK:** `nodemailer@10.0.15`
- **Config:** `MAIL_HOST`, `MAIL_PORT` (default 587), `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`
- **Primary Use Case:** Password reset notification emails.

### Password Reset Flow:
1. `POST /api/v1/auth/forgot-password` generates 32-byte cryptographically secure random token (`crypto.randomBytes(32).toString("hex")`).
2. Hashes token using SHA-256 (`crypto.createHash("sha256").update(token).digest("hex")`) and persists hashed token with expiration timestamp on user document.
3. Constructs client link: `${CLIENT_URL}/reset-password?token=${plainToken}`.
4. Transmits email with both HTML and plain text alternatives via Nodemailer.
5. `POST /api/v1/auth/reset-password` receives `plainToken`, hashes it with SHA-256, looks up user with matching unexpired token, updates password, and invalidates reset token.

---

## 4. MongoDB & Mongoose Driver

- **Driver:** `mongoose@9.7.4`
- **Config:** `MONGODB_URI`
- **Connection Strategy:** Single shared connection established at server launch via `connectDB()`.
- **Invariants:**
  - Strict typing via TypeScript interfaces and Mongoose schemas.
  - Password, reset tokens, and refresh tokens configured with `select: false` to avoid accidental leakage in queries.
  - Compound unique constraints on `Proposal` (`job` + `freelancer`) and `Review` (`reviewer` + `contract`).
