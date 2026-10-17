# Freelancr — Payment & Financial Risk Register

> **Target Baseline Reference:** [PRD 07 — Payments, Payouts, Escrow & Refunds](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/docs/prd/07_PRD_PAYMENTS_PAYOUTS_REFUNDS.md), [Freelancr_Complete_Project_Architecture.md](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/Freelancr_Complete_Project_Architecture.md) Section 12, and [Freelancr_UI_UX_Production_Product_Analysis.md](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/Freelancr_UI_UX_Production_Product_Analysis.md) Section 11.
> **Status:** Strictly Read-Only Audit. No code modified.

---

## Executive Financial Risk Summary

Freelancr implements a server-validated Razorpay order creation and HMAC webhook verification flow for client deposits. However, critical gaps exist: **the platform has no payout/release mechanism to pay freelancers**, the **frontend checkout component never verifies payments**, **contracts can be marked completed without any payment**, and the **payment UI is completely disconnected from all pages**.

---

## Detailed Risk Register

### RISK-PAY-01: Zero Freelancer Payout / Fund Release Mechanism (Escrow Black Hole)
- **Severity:** **CRITICAL**
- **Likelihood:** **CERTAIN (100%)**
- **Invariant Impact:** Invariant #1 & Market Viability (Freelancers cannot be paid).
- **Code Location:** [server/src/modules/payments/](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/)
- **Description:**
  While the system allows clients to deposit money via Razorpay orders, there is **zero implementation of payouts or fund transfers to freelancers**. The backend lacks a Payout entity, Payout routes, bank account/VPA collection, or integration with Razorpay Route / Razorpay Payouts (X).
- **Scenario:**
  A client pays ₹50,000 for a project. The contract is executed and marked "completed". The funds sit in the platform's Razorpay merchant account indefinitely. The freelancer has no balance, no payout button, and no mechanism to withdraw their earnings.
- **Mitigation Path (PRD 07):**
  Create a dedicated `Payout` domain entity with states (`pending_milestone`, `eligible`, `queued`, `processing`, `paid`, `failed`). Integrate Razorpay Route / Linked Accounts or Razorpay Payouts with strict idempotency and dual-approval admin operations.

---

### RISK-PAY-02: Frontend Never Calls Payment Verification Endpoint
- **Severity:** **HIGH**
- **Likelihood:** **HIGH**
- **Invariant Impact:** Payment State Synchronization (Client-side verification failure).
- **Code Location:** [client/src/components/payment/RazorpayCheckout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/payment/RazorpayCheckout.tsx) lines 73–82.
- **Description:**
  When the Razorpay modal successfully processes a client's card/UPI payment, its `handler` callback receives `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`. The current component only executes `console.log("Payment successful:", paymentResponse)`. It **never calls `POST /api/v1/payments/verify`**.
- **Scenario:**
  A client pays successfully. The modal closes. The frontend does not notify the backend. The payment record in MongoDB remains in `created` status until/unless the Razorpay webhook arrives asynchronously. If webhooks are delayed or fail, the payment is never marked `paid`.
- **Mitigation Path:**
  Implement `verifyPayment()` call inside the checkout handler to immediately call `POST /api/v1/payments/verify` and update application state.

---

### RISK-PAY-03: Razorpay Checkout Component Completely Disconnected from UI
- **Severity:** **HIGH**
- **Likelihood:** **CERTAIN (100%)**
- **Invariant Impact:** Platform Usability (Clients cannot initiate payments).
- **Code Location:** [client/src/components/payment/RazorpayCheckout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/payment/RazorpayCheckout.tsx)
- **Description:**
  `RazorpayCheckout.tsx` is defined in the codebase, but is **never imported or rendered by any page or component** (not on `ContractDetailsPage`, `ContractsPage`, or anywhere else).
- **Scenario:**
  A client accepts a proposal and views their contract at `/contracts/:id`. There is no "Pay" or "Deposit Escrow" button anywhere on the screen. The client has no UI path to pay for the contract.
- **Mitigation Path:**
  Integrate payment trigger into contract details and actions components with proper role checks (`isClient`).

---

### RISK-PAY-04: Contract Completion Allowed Without Payment
- **Severity:** **HIGH**
- **Likelihood:** **HIGH**
- **Invariant Impact:** Financial Fairness & Escrow Protection.
- **Code Location:** [server/src/modules/contracts/contract.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/contracts/contract.service.ts) line 154 (`completeContract`).
- **Description:**
  `completeContract` verifies only that `contract.client === userId` and `contract.status === "active"`. It **never checks whether payment was ever created or paid** for this contract.
- **Scenario:**
  Client accepts proposal. Contract becomes `active`. Client never pays. Freelancer does work. Client clicks "Complete Contract". Contract is marked `completed`, job is marked `completed`, and client leaves a review, having paid ₹0.
- **Mitigation Path:**
  Add precondition in `completeContract`: verify that an associated `Payment` exists with status `paid` (or escrow funded).

---

### RISK-PAY-05: Double Order Creation Concurrency Window
- **Severity:** **MEDIUM**
- **Likelihood:** **MEDIUM**
- **Invariant Impact:** Provider Truth & Database Consistency.
- **Code Location:** [server/src/modules/payments/payment.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.service.ts) lines 424–440.
- **Description:**
  In `PaymentService.createOrder`:
  ```typescript
  const existingPayments = await PaymentRepository.findByUser(userId);
  const alreadyPaid = existingPayments.some(...);
  if (alreadyPaid) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This contract has already been paid");
  ```
  This check only prevents creating orders if a payment is already `paid`. It does not prevent creating multiple orders if previous orders are in `created` status. If a user double-clicks or triggers concurrent requests, multiple Razorpay orders and MongoDB payment records are created for the exact same contract.
- **Mitigation Path:**
  Check for active pending/created orders or enforce unique index on `{ contract: 1, status: 1 }`.

---

### RISK-PAY-06: Asynchronous Webhook `payment.captured` Does Not Notify Freelancer
- **Severity:** **LOW**
- **Likelihood:** **HIGH**
- **Invariant Impact:** Notification Invariant.
- **Code Location:** [server/src/modules/payments/payment.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.service.ts) lines 90–117.
- **Description:**
  When a payment is captured via webhook (`handleWebhook`), the backend updates `PaymentRepository.updateByOrderId(orderId, { status: "paid" })`, but **omits calling `NotificationService.createNotification`**.
  In contrast, the synchronous `verifyPayment` method (lines 683–697) does notify the freelancer.
- **Scenario:**
  If a payment is settled asynchronously through Razorpay webhook (e.g. UPI, NetBanking delay), the freelancer never receives a real-time or persistent notification that funds have been secured.
- **Mitigation Path:**
  Synchronize notification emission in both synchronous verification and asynchronous webhook capture.

---

### RISK-PAY-07: Inefficient Full-History Memory Scan in `createOrder`
- **Severity:** **MEDIUM**
- **Likelihood:** **HIGH** (Grows with system usage)
- **Invariant Impact:** Performance & Memory Scalability.
- **Code Location:** [server/src/modules/payments/payment.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.service.ts) line 425.
- **Description:**
  To check whether a single contract has been paid, `createOrder` retrieves ALL payments the user has ever made across the entire platform via `findByUser(userId)` and loops through them in Node.js memory.
- **Mitigation Path:**
  Replace with direct database query: `Payment.findOne({ contract: contractId, status: "paid" })`.

---

### RISK-PAY-08: Absence of Database Transactions Across Payment Status Changes
- **Severity:** **MEDIUM**
- **Likelihood:** **LOW**
- **Invariant Impact:** Atomicity across Payment, Contract, and Notification.
- **Code Location:** [server/src/modules/payments/payment.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.service.ts)
- **Description:**
  Payment verification and refund status transitions update MongoDB documents and dispatch notifications sequentially without Mongoose sessions or transactions. If an unhandled network error occurs mid-operation, payment records and notification states diverge.
- **Mitigation Path:**
  Wrap multi-collection updates in `session.withTransaction()`.
