# Freelancr PRD 14 Discovery & Root-Cause Audit Report

## 1. Verified Current Behavior vs Required Outcomes

Freelancr has implemented foundational modules across PRDs 01–12 and the FE-01 UI overhaul. However, auditing the system against PRD 14 revealed critical operational, architectural, and financial gaps across four main areas:

1. **Notifications**:
   - The notification infrastructure (database model, repository, controller, and routes) is built, and `GET /api/v1/notifications/unread-count` is polled.
   - Socket event constants (`NOTIFICATION_CREATED`) and listeners exist.
   - **Crucial Gap**: There is **no UI notification bell dropdown or notifications page** anywhere in the frontend application. In `MainLayout.tsx`, the bell icon is an inert `<div>` with an unread badge that opens nothing when clicked! Users cannot view notifications, see their details, click action links, or mark them as read.

2. **Razorpay & Payments**:
   - Backend order creation (`POST /api/v1/payments/create-order`), client-side signature verification (`POST /api/v1/payments/verify`), and HMAC SHA-256 webhook processing (`POST /api/v1/payments/webhook`) are implemented.
   - Payout records, eligibility rules, and admin payout execution (`/admin/payouts`) are implemented.
   - **Crucial Gaps**:
     - There is no user-facing **Payment History / Transactions page** for clients and freelancers to view their paid orders, transactions, and refund statuses.
     - There is no admin **Gateway Health & Diagnostics view** to inspect whether Razorpay credentials, webhook endpoints, and capabilities are configured without leaking secrets.

3. **Admin UI Architecture**:
   - Admin routes (`/admin`, `/admin/users`, `/admin/jobs`, `/admin/payouts`, `/admin/analytics`) exist, but the navigation is fragmented and missing crucial operational domains:
     - No direct link or view for **Payments & Transactions**.
     - No direct view for **Platform Commission Accounting**.
     - No view for **Gateway & System Health / Diagnostics**.
     - Missing clear overview financial metrics (Gross Volume, Commission Earned, Commission Settled).

4. **Platform Commission Accounting**:
   - Currently, `Payment.amount` records the gross contract amount paid by the client.
   - In `PayoutEligibilityService` and `payout.model.ts`, `platformFee` exists as a schema field but is hardcoded to `0` ("No platform fee invented").
   - There is **no persistent source of truth for platform commission**: no dedicated fee record, no fee rate configuration, and no distinction between **Commission Earned** (upon verified contract payment capture), **Commission Settled/Received** (funds actually transferred to platform bank), and **Commission Refunded/Reversed**.

---

## 2. Root Cause Analysis Supported by Code References

### A. Notifications
- **Inert Bell Component**: In `client/src/layouts/MainLayout.tsx` (lines 169–193), the bell icon is rendered as:
  ```tsx
  <div className="p-1.5 rounded-lg text-slate-600 ... relative cursor-pointer" title="...">
    <svg ... />
    {unreadCount > 0 && <span ...>{unreadCount}</span>}
  </div>
  ```
  It has no `onClick` handler, no dropdown menu, and no router link to a `/notifications` page.
- **Missing Action Links in Notification Payload**: `server/src/modules/notifications/notification.model.ts` only stores `recipient`, `sender`, `title`, `message`, `type`, and `isRead`. It lacks a `link` or `targetId` / `targetType` field to enable deep linking to relevant contracts, proposals, or tickets when the user clicks a notification.
- **Missing Real-Time Notification Bell Integration**: While `socket.on(SOCKET_EVENTS.NOTIFICATION_CREATED)` invalidates the unread count in `MainLayout.tsx`, the user has no way to view the newly arrived notification toast or list.

### B. Razorpay & Payments Visibility
- **No Client Payment History UI**: `GET /api/v1/payments/my-payments` exists in `PaymentController.myPayments`, and `getMyPayments()` is exposed in `client/src/services/payments.api.ts`, but no user page routes to or renders it.
- **Gateway Configuration Mystery**: In `server/src/config/env.ts`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are required. However, admins have no operational view to check if test/live keys are active, if webhooks are receiving traffic, or when the last payment was captured.

### C. Admin Experience
- **Incomplete Metrics**: `AdminService.getDashboardStats()` counts Users, Jobs, and PRD 09 Disputes/Support Tickets, but returns zero payment or financial metrics.
- **Disjointed Navigation**: `MainLayout.tsx` has links to `/admin`, `/admin/payouts`, `/admin/analytics`, but lacks a unified sidebar or tabbed admin layout encompassing Users, Jobs, Payments, Payouts, Commission, Gateway, and System Health.

### D. Platform Commission
- **Absent Ledger**: Neither `Payment` nor `Payout` tracks platform fee deductions accurately.
- **Undefined Policy**: The commission percentage is currently unset.
- **Financial Ambiguity**: Labeling commission as "received" when Razorpay captures an order is dangerous; Razorpay settles payments to the platform merchant account on a T+2 or T+3 rolling schedule, minus gateway processing fees.

---

## 3. Existing Capabilities to Reuse

1. **Notifications**:
   - `NotificationService.createNotification`, `NotificationRepository.findByRecipient`, `NotificationController.markAsRead`, and `NotificationController.markAllAsRead`.
   - `client/src/services/notifications.api.ts` with typed methods.
   - `SocketContext.tsx` and centralized Socket.IO event emitter.
2. **Payments & Checkout**:
   - `PaymentService.createOrder` and `PaymentService.verifyPayment` using authoritative contract amounts.
   - `PaymentService.handleWebhook` with idempotent deduplication via `ProcessedWebhook`.
   - `RazorpayCheckout.tsx` modal on the client.
3. **Admin & Operations**:
   - `AdminLayout` / admin routes with `AdminRoute` and backend `authorize("admin")`.
   - `AdminPayoutsPage.tsx` with real execute and reconcile actions.
   - `AdminController.getHealth` and `AdminController.getAuditLogs`.

---

## 4. Missing Capabilities & Required Changes

1. **Notification System**:
   - Add optional `link` field to `Notification` schema, repository, and controller.
   - Build a dropdown modal and `/notifications` page in the client with mark-as-read, mark-all-read, pagination, and direct navigation.
   - Add notification dispatch on all key contract, payment, and milestone events (Milestone approved, Deliverable requested, Refund processed).
2. **Payment History & Gateway Diagnostics**:
   - Build a user-facing `/payments` page accessible to clients and freelancers displaying past payments, order IDs, timestamps, and refund badges.
   - Build an admin-facing `/admin/gateway` view displaying sanitized gateway status (configured/missing keys, webhook secret presence, test vs live key mode, last captured payment timestamp, zero secret leakage).
3. **Unified Admin Experience**:
   - Upgrade `AdminDashboardPage.tsx` with a cohesive navigation shell and financial summary cards (Gross volume, Commission, Active disputes, Payouts).
   - Add `/admin/payments` and `/admin/commission` pages.
4. **Platform Commission Accounting**:
   - Add a deterministic commission policy (e.g. 10% platform fee on completed contracts/milestones).
   - Create `Commission` model or ledger entry tracking:
     - `paymentId`, `contractId`, `grossAmount`, `commissionRate`, `commissionAmountMinor`, `status` (`earned`, `pending_settlement`, `settled`, `refunded`).
   - Distinguish earned commission from settled/received bank funds.

---

## 5. Security & Financial Invariants

- **Zero Secret Exposure**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must never be sent to the browser or displayed in UI or logs.
- **Authoritative Calculations**: Commission and payout amounts are strictly computed on the backend using integer minor units (paise) to eliminate floating-point rounding errors.
- **Idempotency**: Webhook and payment verification duplicate events must never record double commission or double payouts.
- **Provider Honesty**: Commission must not be marked as "Received in Bank" without settlement reconciliation evidence.

Proceeding to Stage 1 implementation.
