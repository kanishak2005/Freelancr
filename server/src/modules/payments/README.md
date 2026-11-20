# Legacy Financial Subsystem (`server/src/modules/payments/`)

> [!WARNING]
> **ARCHITECTURAL NOTICE: LEGACY CODEBASE WITH ACTIVE ROUTE MOUNTING**
> Under Freelancr's owner-approved product model, project execution, deliverables, milestones, and project payments are handled directly and independently between clients and freelancers off-platform. The platform does NOT act as a custodial escrow clearinghouse.

---

## 1. Purpose of this Document

This document clarifies the status and architectural boundaries of the `server/src/modules/payments/` directory for human developers and autonomous AI coding agents.

## 2. Historical Context

Earlier product specifications (e.g. historical PRD 06, PRD 07, PRD 23) envisioned Freelancr managing custodial milestone escrow, internal wallet credits (`Wallet`), and bank payouts via Razorpay Route (`Payout`, `CashoutRequest`). The modules in this directory were developed to implement that earlier vision.

## 3. Current Owner-Approved Project-Engagement Boundary

1. **Marketplace Scope:** User registration, onboarding, job discovery, job postings, proposals, real-time messaging, and hiring handoffs take place on-platform.
2. **Direct Engagement Model:** After the hiring handoff, clients and freelancers independently manage their project milestones, deliverables, files, and project payments directly off-platform.
3. **No Custodial Escrow:** Freelancr does not hold custodial funds, process milestone escrow releases, manage freelancer wallet balances, or disburse bank payouts for project work.

## 4. Active Route Mounting & Source Exposure

As established in the Phase 1J Task 3A source audit, **this subsystem is NOT dormant, decoupled, or unmounted**:
- `server/src/app.ts:144` mounts `payment.routes.ts` at `/api/v1/payments`.
- `server/src/app.ts:50-54` mounts the webhook endpoint at `/api/v1/payments/webhook`.
- 21 HTTP route declarations are registered in Express: one standalone webhook mounted in `server/src/app.ts` and 20 routes registered through `server/src/modules/payments/payment.routes.ts`. This describes source-level route mounting and exposure, not verified production operation.
- `server/src/modules/contracts/contract.service.ts` imports and invokes `PayoutService.syncPayoutStatus()`.
- Frontend navigation (`navigationConfig.tsx`, `AdminLayout.tsx`) and pages (`/payments`, `/wallet`, `/admin/payouts`) actively link to these endpoints.

## 5. Distinction Between Source Reachability and Verified Production Operation

While these routes and pages are reachable at the source level, passing mocked unit tests (e.g., `prd07`) in a disconnected test harness does NOT prove operational readiness for live multi-party settlement or Razorpay Route linked accounts.

## 6. Prohibited Actions for Developers & AI Agents

1. **No Activation or Expansion:** Do NOT activate, expand, or build new features on top of legacy escrow, wallet, cashout, or payout modules based on historical PRDs.
2. **No Unilateral Modification:** Existing financial code must remain untouched unless explicit owner authorization is granted.
3. **No Fee Confusion:** Platform monetization (client job-posting fees, subscriptions, and statutory taxes) is a completely separate concern from project payments. A job-posting fee is NOT a commission on project payments.
4. **Governing Rules:** Refer to `.agents/rules/ARCHITECTURE_GUARDRAILS.md` for mandatory layering and commercial boundary requirements. Any decoupling, unmounting, or removal of this subsystem requires a dedicated, owner-approved implementation plan.