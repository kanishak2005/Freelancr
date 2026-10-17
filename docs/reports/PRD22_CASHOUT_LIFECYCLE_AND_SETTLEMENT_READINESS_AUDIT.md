# PRD 22 — Freelancer Cashout Lifecycle and Settlement Readiness Audit

**Audit Date**: 2026-10-18  
**Auditor**: Antigravity Autonomous Security & Financial Systems Auditor  
**Audit Scope**: Read-Only Financial State & Architecture Audit of Freelancer Cashout Lifecycle, Wallet Reservations, Ledger Event Architecture, and Settlement Readiness.  
**Mode**: **STRICTLY READ-ONLY**. No database writes, application code modifications, schema migrations, or live financial transactions were initiated.

---

## 1. Executive Summary

This independent read-only audit evaluated the end-to-end freelancer cashout lifecycle within Freelancr. Specifically, it assessed how wallet funds are reserved upon cashout request, what backend services and entities exist to process those reservations, whether any automated or administrative settlement mechanisms exist to disburse reserved funds to external bank accounts, and what architectural and operational gaps must be resolved to safely complete cashouts.

### Key Audit Findings:
1. **Cashout Requests are In-App Escrow Reservations, Not Bank Transfers**:
   When a freelancer requests a cashout via `POST /api/v1/payments/wallet/cashout`, the system atomically deducts the requested amount from `wallets.availableBalanceMinor`, increments `wallets.reservedCashoutMinor`, writes an immutable `financialledgers` record with `eventType: "cashout_requested"`, and creates an audit log. **No external bank transfer is initiated or scheduled at this time.**
2. **Zero Settlement Infrastructure Exists Today**:
   There is currently **no backend service method, controller action, admin UI route, cron task, or payment gateway worker** implemented to settle, disburse, fail, or reverse a reserved cashout. The funds remain locked indefinitely in `wallets.reservedCashoutMinor` unless manual database intervention or future code changes are implemented.
3. **No Persistent Cashout Request Entity**:
   There is no standalone `CashoutRequest` or `Disbursement` collection/document in MongoDB. Cashouts are tracked exclusively through three synchronized artifacts:
   - The numerical accumulator `wallets.reservedCashoutMinor`.
   - The append-only ledger entry `financialledgers` (`eventType: "cashout_requested"`, `referenceId: "cashout_<userId>_<timestamp>"`).
   - The audit log entry `auditlogs` (`action: "CASHOUT_REQUESTED"`).
4. **Authoritative Mathematical Reconciliation of the Known Scenario**:
   For the previously audited freelancer `mohit sharma` (`6ad3a3105e6305b53ba98cb5`) and wallet `6ad3c77c4642f03865b3891e`:
   - Two contracts have been credited:
     - `6ad3ca717fd986e2fd5bda2c`: +₹1,000 (100,000 paise) from Payout `6ad3c7af4642f03865b38925`.
     - `6ad3d06a4c31b2bd2389d357`: +₹3,000 (300,000 paise) from Payout `6ad3cff14c31b2bd2389d347`.
     - **Lifetime Earnings**: **₹4,000.00** (400,000 paise).
   - Two cashouts have been requested:
     - `6ad3cb3a7fd986e2fd5bda32`: -₹1,000 (100,000 paise), `referenceId: cashout_6ad3a3105e6305b53ba98cb5_1792265018323`.
     - `6ad3d0a64c31b2bd2389d35b`: -₹2,000 (200,000 paise), `referenceId: cashout_6ad3a3105e6305b53ba98cb5_1792266406200`.
     - **Total Reserved Cashout**: **₹3,000.00** (300,000 paise).
   - **Remaining Available Balance**: **₹1,000.00** (100,000 paise).
   - **Total Withdrawn (Disbursed to Bank)**: **₹0.00** (0 paise).
   - Mathematical Parity: Available (100,000) + Reserved (300,000) = Lifetime (400,000). Drift is **0 paise**.
5. **No External Bank Disbursement Has Occurred**:
   Not a single rupee has been disbursed to any external bank account. All ₹4,000 remains within Freelancr internal platform escrow.

---

## 2. Answers to Required Questions

### Q1: What exact operation does a freelancer trigger when requesting a cashout?
A freelancer triggers `POST /api/v1/payments/wallet/cashout` with payload `{ "amount": <number> }`.
The request passes through `authenticate` (JWT verification), `authorize("freelancer")`, and `financialRateLimiter`. In `WalletService.requestCashout(userId, amount)`, the system:
1. Validates `amount > 0`.
2. Converts `amount` to integer paise: `requestedMinor = Math.round(amount * 100)`.
3. Opens a MongoDB multi-document transaction (`runInTransaction`).
4. Checks `wallet.availableBalanceMinor >= requestedMinor`. If insufficient, throws `HTTP 400 Bad Request`.
5. Mutates wallet document:
   - `wallet.availableBalanceMinor -= requestedMinor`
   - `wallet.reservedCashoutMinor += requestedMinor`
   - `wallet.save({ session })`
6. Inserts immutable ledger entry into `financialledgers` with `eventType: "cashout_requested"`, `amountMinor: requestedMinor`, and unique `referenceId: "cashout_<userId>_<timestamp>"`.
7. Records an audit event `CASHOUT_REQUESTED` in `auditlogs`.
8. Returns HTTP 200 with `{ success: true, message: "Cashout request submitted successfully and awaiting disbursement processing", referenceId, ... }`.

### Q2: Where is the requested amount stored, and how is the reservation represented?
The requested amount is stored in:
- The wallet document field `wallets.reservedCashoutMinor` (an integer paise accumulator).
- The financial ledger document field `financialledgers.amountMinor` under `eventType: "cashout_requested"`.
- It is represented as an encumbered balance: it has been subtracted from `availableBalanceMinor` so it cannot be spent or re-requested, but has NOT been added to `totalWithdrawnMinor` because no disbursement has occurred.

### Q3: Is there a persistent cashout request entity, or are cashouts represented only by wallet balances, ledger events, and audit logs?
**There is NO persistent cashout request entity.** There is no `cashoutrequests` or `disbursements` collection in the MongoDB database. Cashouts exist solely as:
1. An aggregate number in `wallets.reservedCashoutMinor`.
2. Historical event records in `financialledgers` (`eventType: "cashout_requested"`).
3. Audit log documents in `auditlogs`.

### Q4: Which authorized admin action, service, or provider integration can settle a reserved cashout today?
**None.** There is no API route (e.g. `POST /api/v1/payments/admin/cashout/:id/settle`), no service method in `WalletService`, `PayoutService`, or `PlatformFinanceService`, and no administrative UI button to settle or complete a cashout. The codebase defines `cashout_paid`, `cashout_failed`, and `cashout_reversed` in the `LedgerEventType` TypeScript union in `financialLedger.model.ts`, but no code currently creates or transitions these ledger events.

### Q5: Is there an implemented, verified path from a reserved cashout to a confirmed external bank transfer?
**No.** There is no code path connecting `wallets.reservedCashoutMinor` or `cashout_requested` to Razorpay Payouts, Razorpay Route, IMPS, NEFT, or manual bank wire confirmation.

### Q6: How are provider timeouts, ambiguous responses, duplicate requests, retries, and reconciliation handled?
- **For Cashout Requests**:
  - Duplicate requests within the same millisecond timestamp are rejected by the unique MongoDB index on `financialledgers` (`{ eventType: 1, referenceId: 1 }`).
  - Network retries from the client with new timestamps would create separate cashout reservations, each deducting from `availableBalanceMinor`. If the balance is exhausted, subsequent requests fail with `HTTP 400 Insufficient available balance`.
  - Because no external provider request is initiated during cashout, provider timeouts do not occur at the cashout reservation stage.
- **For Milestone/Contract Payouts (`executePayout`)**:
  - `PayoutService.executePayout` catches gateway errors and checks for `ETIMEDOUT`, `ECONNRESET`, or timeout strings. If ambiguous, it holds the payout in `"processing"` (unresolved) and forbids blind retries until an administrator calls `reconcilePayout`.
  - However, this payout machinery applies strictly to contract milestone payouts, **not** to wallet cashout requests.

### Q7: Can a reservation become permanently stuck, be reserved twice, or be released without authoritative settlement evidence?
- **Permanently Stuck**: **YES (CURRENT STATE)**. Under current code, every cashout reservation remains permanently in `reservedCashoutMinor` because no settlement or cancellation endpoint exists.
- **Reserved Twice**: **NO**. The subtraction `wallet.availableBalanceMinor -= requestedMinor` inside an ACID MongoDB transaction ensures that the same paise cannot be reserved twice.
- **Released Without Settlement Evidence**: **NO**. There is currently no code that releases or decrements `reservedCashoutMinor` under any circumstances.

### Q8: Are wallet totals, reserved amounts, ledger entries, and payout records reconciled atomically?
- **Within a Cashout Request**: **YES**. `WalletService.requestCashout` executes within `runInTransaction(async (session) => { ... })`. The decrement of `availableBalanceMinor`, the increment of `reservedCashoutMinor`, and the insertion of the `financialledgers` document all share the same MongoDB session. If any step fails, the entire transaction rolls back.
- **Across the Entire Wallet Lifecycle**: **YES**. All ledger credits (`wallet_credited`) and debits (`cashout_requested`) mathematically sum to the exact integers in `wallets`.

### Q9: Does the UI accurately distinguish Available, Reserved for Cashout, Cashout Processing, Cashout Failed, and Bank Transfer Confirmed?
- **Freelancer Wallet UI (`client/src/pages/FreelancerWalletPage.tsx`)**:
  - Accurately displays **Available to Withdraw** (`wallet.availableBalance`), **Processing Cashouts** (`wallet.reservedCashout`), **Lifetime Approved Earnings**, and **Total Disbursed** (`wallet.totalWithdrawn`).
  - Transaction table renders distinct badges: `Earnings Credited` (green), `Cashout Reserved` (amber), `Disbursed to Bank` (blue), and `Failed / Reversed` (red).
  - Explicitly states: *"Reserved awaiting admin transfer"* and *"Transfers are processed by the platform administrator via verified banking rails."* It does **not** falsely claim money has reached the bank.
- **Admin Payouts UI (`client/src/pages/AdminPayoutsPage.tsx`)**:
  - Accurately distinguishes `Credited to Wallet`, `Awaiting External Transfer`, `Transfer Processing`, `Bank Transfer Confirmed`, `Transfer Failed`, and `Reconciliation Required`.
  - Does **not** display cashout requests at all because no cashout management UI exists yet.

### Q10: What operational prerequisites remain for Razorpay Route, beneficiary onboarding, recipient KYC, and provider account configuration?
To execute real automated transfers:
1. **Razorpay Marketplace / Route Activation**: The platform Razorpay merchant account must have linked-account marketplace transfer permissions enabled.
2. **User Model Schema Expansion**: The `User` schema currently lacks fields for `razorpayAccountId`, `bankAccount`, `ifscCode`, `beneficiaryName`, and `kycStatus`.
3. **Freelancer Onboarding / KYC Workflow**: Freelancers must submit verified bank account details and undergo identity verification.
4. **Beneficiary Account Linking**: The platform must register the freelancer as a linked account (`acc_...`) or create a Razorpay Fund Account (`fa_...`) before initiating disbursements.

---

## 3. Financial Invariants Audit Matrix

| Invariant | Status | Evidence & Code Verification |
| :--- | :--- | :--- |
| **Integer-Paise Arithmetic** | **PASS** | In `wallet.service.ts`: `requestedMinor = Math.round(amount * 100)`. All schema balance fields (`availableBalanceMinor`, `reservedCashoutMinor`, `lifetimeEarningsMinor`, `totalWithdrawnMinor`, `amountMinor`) are integer numbers with `min: 0`. |
| **Server-Side Authorization & Validation** | **PASS** | Route `POST /wallet/cashout` enforces `authenticate`, `authorize("freelancer")`, and `financialRateLimiter`. User identity is extracted exclusively from `req.user!.id`. |
| **Balance Overdraw Prevention** | **PASS** | Validates `wallet.availableBalanceMinor >= requestedMinor` inside transaction. Throws `HTTP 400` if requested exceeds available. Schema enforces `min: 0`. |
| **Idempotency & Duplicate Prevention** | **PASS** | Unique compound MongoDB index on `financialledgers` `{ eventType: 1, referenceId: 1 }`. Balances decremented atomically. |
| **Double-Spending Prevention** | **PASS** | Deducted immediately from `availableBalanceMinor` upon reservation. Cannot be re-used for another cashout. |
| **Settlement Requires Evidence** | **PASS (By Non-Implementation)** | No code exists that marks funds settled. Funds remain in `reservedCashoutMinor` until explicit settlement architecture is introduced. |
| **Ambiguous Outcomes Kept Pending** | **PASS** | Payout service marks ambiguous timeouts as `"processing"`, blocking retries. In cashout flow, reservations remain in `reservedCashoutMinor`. |
| **Safe Failure Release** | **NOT VERIFIED / NOT IMPLEMENTED** | No cashout reversal service exists. If a cashout fails, there is currently no implemented method to credit `availableBalanceMinor` back and decrement `reservedCashoutMinor`. |
| **Immutable Ledger Auditability** | **PASS** | All balance mutations are accompanied by an immutable `FinancialLedger` entry. No balance changes occur without a corresponding ledger event. |
| **Concurrency Protection** | **PASS** | All wallet mutations run within `runInTransaction(async (session) => { ... })`. MongoDB ACID document locking prevents concurrent race conditions on the wallet document. |
| **Truthful UI Representation** | **PASS** | The UI labels reserved funds as *"Processing Cashouts - Reserved awaiting admin transfer"*. No claim of external bank completion is made. |

---

## 4. Findings on Known Scenario (Freelancer `mohit sharma`)

- **User ID**: `6ad3a3105e6305b53ba98cb5`
- **Wallet Document ID**: `6ad3c77c4642f03865b3891e`

### Complete Ledger Inflow & Outflow Timeline:

| Date & Time (UTC) | Event Type | Amount (paise) | Reference ID | Description / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2026-10-17 19:20:17** | `wallet_credited` | +100,000 (₹1,000) | `wallet_credit_6ad3c7af4642f03865b38925` | Contract `"Build a responsive React website"` approved earnings credited to in-app wallet. |
| **2026-10-17 19:23:38** | `cashout_requested` | -100,000 (₹1,000) | `cashout_6ad3a3105e6305b53ba98cb5_1792265018323` | Freelancer requested cashout of ₹1,000. Funds reserved. |
| **2026-10-17 19:45:47** | `wallet_credited` | +300,000 (₹3,000) | `wallet_credit_6ad3cff14c31b2bd2389d347` | Contract `"Build a React Website"` approved earnings credited to in-app wallet. |
| **2026-10-17 19:46:46** | `cashout_requested` | -200,000 (₹2,000) | `cashout_6ad3a3105e6305b53ba98cb5_1792266406200` | Freelancer requested cashout of ₹2,000. Funds reserved. |

### Current Authoritative Wallet State:
- `availableBalanceMinor`: **100,000** (₹1,000.00 liquid balance)
- `reservedCashoutMinor`: **300,000** (₹3,000.00 pending cashout reservations)
- `lifetimeEarningsMinor`: **400,000** (₹4,000.00 total contract earnings)
- `totalWithdrawnMinor`: **0** (₹0.00 external disbursements)

**Discrepancy / Drift**: **Exact 0 paise**.

---

## 5. Architectural Gap Analysis: What is Missing to Complete Cashouts

```
Existing Flow (Implemented):
[Contract Completed] 
       │
       ▼ (Admin: Credit to Wallet)
[Wallet: availableBalanceMinor += ₹1,000] ──> [Ledger: wallet_credited]
       │
       ▼ (Freelancer: Request Cashout)
[Wallet: availableBalanceMinor -= ₹1,000]
[Wallet: reservedCashoutMinor += ₹1,000]  ──> [Ledger: cashout_requested]
       │
       ▼
   [ STUCK ]  <── Gaps Begin Here
   
Missing Settlement Flow (To Be Designed in PRD 23+):
       │
       ├─────────────────────────────────────────┐
       ▼ (Admin Approves / Settles)              ▼ (Admin Rejects / Fails)
[External Bank Transfer (Manual/API)]      [Cancellation / Failure]
       │                                         │
       ▼                                         ▼
[Wallet: reservedCashoutMinor -= ₹1,000]   [Wallet: reservedCashoutMinor -= ₹1,000]
[Wallet: totalWithdrawnMinor += ₹1,000]    [Wallet: availableBalanceMinor += ₹1,000]
       │                                         │
       ▼                                         ▼
[Ledger: cashout_paid]                     [Ledger: cashout_reversed / failed]
       │                                         │
       ▼                                         ▼
[Notification: Funds Disbursed]            [Notification: Cashout Reverted]
```

### Key Structural Deficiencies:
1. **Absence of a Cashout Entity**:
   Because cashout requests are not stored as individual documents with lifecycle states (`pending`, `processing`, `completed`, `rejected`), administrators cannot review or settle individual cashout requests.
2. **Missing Administrative Settlement Endpoints**:
   There are no endpoints for an admin to view pending cashout requests or record a settlement (e.g. providing an IMPS/NEFT bank reference number or UTR).
3. **Missing Reversal / Cancellation Mechanism**:
   If an administrator rejects an erroneous cashout request, or if a bank transfer bounces, there is no method to return the funds from `reservedCashoutMinor` back to `availableBalanceMinor`.
4. **No Freelancer Bank Account Registration**:
   The `User` model does not store beneficiary bank account numbers or IFSC codes, meaning even an administrator doing manual bank transfers has no in-app way to view where to send the funds.

---

## 6. Minimal Safe Implementation Plan (For Future Implementation)

*Note: In accordance with audit guardrails, no modifications were implemented.*

### Phase 1: Data Model & Schema Enhancement
1. Create a `CashoutRequest` model:
   - `user`: ObjectId (Freelancer)
   - `wallet`: ObjectId
   - `amountMinor`: Number (integer paise)
   - `currency`: String ("INR")
   - `status`: Enum (`"pending"`, `"processing"`, `"completed"`, `"rejected"`)
   - `referenceId`: String (unique)
   - `payoutMethod`: Enum (`"manual_bank_transfer"`, `"razorpay_payout"`)
   - `beneficiaryDetails`: Object (masked bank account, IFSC, holder name)
   - `externalReference`: String (bank UTR / IMPS reference)
   - `processedBy`: ObjectId (Admin user)
   - `processedAt`: Date
   - `rejectionReason`: String

2. Extend `User` schema:
   - Add encrypted/sanitized `payoutBankDetails`: `{ accountNumber, ifscCode, accountHolderName, bankName }`.

### Phase 2: Service & State Machine Implementation
1. In `WalletService`:
   - `settleCashout(cashoutRequestId, adminUserId, externalReference)`:
     - Atomically transitions cashout to `"completed"`.
     - Decrements `wallet.reservedCashoutMinor -= amountMinor`.
     - Increments `wallet.totalWithdrawnMinor += amountMinor`.
     - Creates `financialledgers` record with `eventType: "cashout_paid"`.
     - Emits `AuditService` and `NotificationService` events.
   - `rejectCashout(cashoutRequestId, adminUserId, reason)`:
     - Atomically transitions cashout to `"rejected"`.
     - Decrements `wallet.reservedCashoutMinor -= amountMinor`.
     - Restores `wallet.availableBalanceMinor += amountMinor`.
     - Creates `financialledgers` record with `eventType: "cashout_reversed"`.
     - Emits `AuditService` and `NotificationService` events.

### Phase 3: Admin & Freelancer UI
1. **Admin Cashout Management Console**:
   - List pending cashout requests with freelancer identity, amount, date, and bank details.
   - Action buttons: `Confirm Bank Transfer (Manual Settlement)` and `Reject & Return to Balance`.
2. **Freelancer Wallet Status Expansion**:
   - Show status badges on each cashout in the wallet page (`Under Review`, `Disbursed`, `Returned`).

---

## 7. Verification Tests Required for Future Implementation

Before any settlement code is accepted into production, the following test suite must be implemented:
1. **Atomic Settlement Test**:
   - Verify `settleCashout` decrements `reservedCashoutMinor` and increments `totalWithdrawnMinor` by exact paise without altering `availableBalanceMinor`.
   - Verify `cashout_paid` ledger entry is created with matching reference.
2. **Atomic Reversal Test**:
   - Verify `rejectCashout` decrements `reservedCashoutMinor` and increments `availableBalanceMinor` by exact paise without altering `totalWithdrawnMinor`.
   - Verify `cashout_reversed` ledger entry is created.
3. **Idempotent Settle/Reject Guard**:
   - Verify that calling `settleCashout` or `rejectCashout` on an already-settled or already-rejected cashout throws `HTTP 409 Conflict`.
4. **Overdraw & Concurrency Race Condition Test**:
   - Simulate concurrent calls to `requestCashout` and `rejectCashout`: verify ACID transaction rollback prevents balance corruption.
5. **Admin RBAC Enforcement**:
   - Verify non-admin users cannot call settlement or rejection endpoints (HTTP 403).

---

## 8. Inspected Files & Read-Only Confirmation

### Files Inspected:
- [server/src/modules/payments/wallet.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/wallet.service.ts)
- [server/src/modules/payments/wallet.model.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/wallet.model.ts)
- [server/src/modules/payments/financialLedger.model.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/financialLedger.model.ts)
- [server/src/modules/payments/payout.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payout.service.ts)
- [server/src/modules/payments/payout.repository.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payout.repository.ts)
- [server/src/modules/payments/payout.model.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payout.model.ts)
- [server/src/modules/payments/payment.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.routes.ts)
- [server/src/modules/payments/payment.controller.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.controller.ts)
- [server/src/modules/payments/payment.validation.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/payment.validation.ts)
- [server/src/modules/payments/platformFinance.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/payments/platformFinance.service.ts)
- [server/src/modules/users/user.model.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.model.ts)
- [client/src/pages/FreelancerWalletPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/FreelancerWalletPage.tsx)
- [client/src/pages/AdminPayoutsPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/AdminPayoutsPage.tsx)
- [server/test/prd21-wallet-platform-finance.test.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/test/prd21-wallet-platform-finance.test.ts)

### Explicit Confirmation:
**This audit made NO application code changes, executed NO database mutations or migrations, created NO indexes, altered NO configuration or environment files, and initiated NO financial transactions.**
