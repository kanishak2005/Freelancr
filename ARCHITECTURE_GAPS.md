# Freelancr — Architecture Gaps Analysis

> **Target Baseline Reference:** [PRD 00](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/docs/prd/00_PRD_MASTER_ROADMAP.md), [PRD 02](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/docs/prd/02_PRD_TARGET_ARCHITECTURE_NETWORKING.md), [Freelancr_Complete_Project_Architecture.md](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/Freelancr_Complete_Project_Architecture.md), and [Freelancr_UI_UX_Production_Product_Analysis.md](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/Freelancr_UI_UX_Production_Product_Analysis.md).
> **Status:** Strictly Read-Only Audit. No code modified.

---

## 1. Domain Coverage Gaps (Target Domain Map vs. Actual Code)

PRD 00 establishes the production marketplace domain map:
```text
auth users jobs proposals contracts
milestones deliverables
payments payouts refunds
disputes reviews chat notifications support uploads
admin analytics audit health
```

### Gap Comparison Matrix

| Target Domain | Current Repository Status | Gap Description |
| :--- | :--- | :--- |
| **`auth`** | ✅ Implemented | Complete with JWT, refresh token cookies, bcrypt, password reset. |
| **`users`** | ✅ Implemented | Profile, bio, resume, portfolio. Needs pagination on `findAll`. |
| **`jobs`** | ⚠️ Partial | Job CRUD, search, filter implemented. Missing role guard on creation, missing pagination. |
| **`proposals`** | ⚠️ Partial | Submissions, editing, withdrawals implemented. Counter sync missing; client acceptance missing in UI. |
| **`contracts`** | ⚠️ Partial | Model & service exist. Missing milestone/deliverable linkage; missing payment status linkage. |
| **`milestones`** | ❌ **Missing** | Zero models, routes, or services for contract milestones. |
| **`deliverables`**| ❌ **Missing** | Zero models, routes, or services for deliverable submission, review, or revisions. |
| **`payments`** | ⚠️ Partial | Razorpay order, verification, webhook, and refunds implemented. |
| **`payouts`** | ❌ **Missing** | Zero models, routes, or services for freelancer payouts or escrow release. |
| **`disputes`** | ❌ **Missing** | Zero models, routes, or services for arbitration, dispute tickets, or mediation. |
| **`reviews`** | ✅ Implemented | Mutual review post-contract. Missing pagination. |
| **`chat`** | ⚠️ Partial | Backend 1-to-1 messaging works. Frontend lacks attachment display; conversation endpoint is unbounded. |
| **`notifications`**| ⚠️ Partial | Backend notification pipeline complete. Zero UI or socket listeners on frontend. |
| **`support`** | ❌ **Missing** | Zero ticketing, helpdesk, or customer support modules. |
| **`uploads`** | ⚠️ Partial | Cloudinary integration works. Missing tracking of uploaded file ownership for generic `/upload`. |
| **`admin`** | ⚠️ Partial | User and job management works. Lacks financial operations, dispute resolution, and audit tracking. |
| **`analytics`** | ✅ Implemented | Platform counter aggregation implemented. |
| **`audit`** | ❌ **Missing** | Zero audit log model or middleware for recording administrative and financial mutations. |
| **`health`** | ⚠️ Minimal | Only returns `{ success: true, message: "running" }`. No DB, Redis, or external gateway health checks. |

---

## 2. Backend Structural & Transactional Gaps

### 2.1 Lack of ACID Transactions Across Multi-Document Transitions
- **Problem:** Several critical business mutations touch multiple collections simultaneously without using Mongoose/MongoDB sessions (`session.withTransaction()`):
  - `ContractService.createFromProposal`:
    1. Creates `Contract`
    2. Updates `Proposal.status = "accepted"`
    3. Updates `Job.status = "in_progress"`
    4. Creates `Notification`
    *Risk:* If the server crashes or MongoDB throws between step 1 and step 3, the database enters an inconsistent partial state where a contract exists but the job remains `open` or proposal remains `pending`.
  - `ContractService.completeContract`:
    1. Updates `Contract.status = "completed"`
    2. Updates `Job.status = "completed"`
    3. Creates `Notification`
  - `ContractService.cancelContract`:
    1. Updates `Job.status = "cancelled"`
    2. Updates `Contract.status = "cancelled"`
    3. Creates `Notification`

### 2.2 Decoupled Contract State vs. Payment State
- **Problem:** In [contract.model.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/contracts/contract.model.ts), the contract status is set to `"active"` immediately upon proposal acceptance:
  ```typescript
  status: {
    type: String,
    enum: ["active", "completed", "cancelled", "disputed"],
    default: "active"
  }
  ```
- **Architectural Gap:**
  - A contract has no `paymentStatus` field (`unfunded`, `escrow_funded`, `released`, `refunded`).
  - `ContractService.completeContract` does not check if the contract was ever paid! A client can complete an active contract without ever depositing escrow funds.
  - The payment model points to the contract, but the contract model has no reference or index pointing to its payments.

### 2.3 Memory Leak & Performance Bottleneck in `createOrder`
- In [payment.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.service.ts) line 425:
  ```typescript
  const existingPayments = await PaymentRepository.findByUser(userId);
  const alreadyPaid = existingPayments.some(
    (payment: any) =>
      payment.contract?._id?.toString() === contract._id.toString() &&
      payment.status === "paid"
  );
  ```
  Instead of issuing an indexed query `Payment.findOne({ contract: contractId, status: "paid" })`, the backend fetches all historic payments for that user and iterates over them in Node.js memory.

### 2.4 Missing Database Indexes on Foreign Keys
The following high-frequency query paths lack indexes in Mongoose schemas:
- `Job`: Missing index on `{ client: 1 }` and `{ status: 1 }`.
- `Contract`: Missing index on `{ client: 1 }` and `{ freelancer: 1 }`.
- `Payment`: Missing index on `{ contract: 1 }`, `{ client: 1 }`, `{ freelancer: 1 }`, `{ razorpayPaymentId: 1 }`.
- `Review`: Missing index on `{ reviewee: 1 }` and `{ job: 1 }`.

---

## 3. Frontend Architecture Gaps

### 3.1 Total Bypass of TanStack Query
- **Intended Design (PRD 02, PRD 12):** TanStack Query (`@tanstack/react-query`) must own server state caching, pagination, request deduplication, and cache invalidation.
- **Current State:**
  - Configured in [client/src/app/providers.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/app/providers.tsx), but **used 0 times** in the entire codebase.
  - Every page (`JobsPage`, `ContractsPage`, `JobDetailsPage`, `ProposalDetailsPage`, `AdminDashboardPage`, `AnalyticsPage`) re-implements boilerplate `useState`, `useEffect`, `try/catch`, manual loading flags, and manual error strings.
  - No background revalidation, no query caching, and no cancellation of stale search requests.

### 3.2 Missing Proposal Acceptance Flow in the UI
- **Intended Flow:** Client views proposals on their job $\rightarrow$ clicks "Accept / Hire" $\rightarrow$ triggers contract creation.
- **Current State:**
  - Neither [JobProposalsPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/JobProposalsPage.tsx) nor [ProposalDetailsPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/ProposalDetailsPage.tsx) contains an "Accept" button.
  - [contracts.api.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/services/contracts.api.ts) does not export a `createContract()` function.
  - The client UI cannot transition a proposal into a contract.

### 3.3 Completely Disconnected Razorpay Checkout Component
- **Intended Flow:** Client visits active contract $\rightarrow$ clicks "Fund Escrow / Pay Now" $\rightarrow$ Razorpay modal opens $\rightarrow$ payment verified $\rightarrow$ contract marked funded.
- **Current State:**
  - [RazorpayCheckout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/payment/RazorpayCheckout.tsx) exists in the filesystem but is **never imported or rendered by any page or component**.
  - Its payment handler only executes `console.log("Payment successful:", paymentResponse)` and never calls `/api/v1/payments/verify`.
  - There is no payment API service file (`services/payments.api.ts`) in the frontend.

### 3.4 Missing Role-Based Navigation & Layouts (PRD 04 Gap)
- In [MainLayout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/layouts/MainLayout.tsx), all navigation links (`Find Jobs`, `My Jobs`, `My Proposals`, `Contracts`, `Analytics`) are rendered in a horizontal bar without role segmentation.
- Freelancers see client-specific links (`My Jobs`), clients see freelancer-specific links (`My Proposals`), and non-admin users see the `/admin/analytics` link.

### 3.5 Missing Notification Center
- While the backend creates and emits notifications across 6 events, the frontend has no notification bell, no drawer, no unread badge, and no listener for `notification` socket events.

---

## 4. Multi-Instance & Cloud Deployment Gaps

1. **In-Memory Socket.IO State:**
   - [server/src/services/socket.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/services/socket.service.ts) binds Socket.IO directly to the single Node HTTP server process.
   - Without `@socket.io/redis-adapter` or MongoDB adapter, users connected to different server instances cannot exchange messages or receive real-time notifications.
2. **In-Memory Rate Limiting:**
   - `express-rate-limit` stores counters in Node.js process memory. In a multi-node cluster, limits are divided per instance rather than shared globally.
3. **In-Memory Multer File Buffering:**
   - `multer.memoryStorage()` stores uploads in the V8 heap. Under high concurrency or multiple 10MB PDF uploads, this can cause heap out-of-memory crashes.
