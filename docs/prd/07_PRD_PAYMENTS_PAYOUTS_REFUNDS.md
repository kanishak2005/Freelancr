# PRD 07 — Payments, Payouts, Refunds & Financial History

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Separate client payment from freelancer payout and make every money transition explicit, provider-aware, atomic, and auditable.

## Critical semantic rule
`payment = paid` means the platform/provider accepted the client's payment according to verified provider state. It does NOT mean the freelancer was paid. Client payment status and freelancer payout status are separate.

## Existing payment lifecycle
Preserve created, paid, partially_refunded, refunded, failed. Preserve signature verification, provider amount/currency/status checks, pending refund lock, HMAC webhook verification, idempotency, and provider refunded amount as truth.

## Payout entity
Fields: payment, contract, optional milestone, freelancer, grossAmount, optional platformFee, netAmount, currency, status, eligibleAt, processingAt, processedAt, failedAt/failureCode, externalReference, idempotencyKey, timestamps. Statuses: not_due, held, eligible, processing, paid, failed, refunded. Do not invent a platform fee if no real fee model exists.

## Money representation
Use integer minor units for provider-facing arithmetic; never floating point for money. Formatting is presentation-only.

## Eligibility service
One authoritative server function checks verified payment, approved/completed work, no blocking dispute/refund, active/eligible freelancer, unpaid balance, optional hold period. UI/admin must not duplicate this logic.

## Payout execution
Atomically claim `eligible -> processing`, invoke supported provider transfer/payout API, persist external reference, confirm via provider response/webhook/reconciliation, transition to paid/failed. Unique constraints prevent duplicate payout for the same payable unit/provider reference/idempotency key.

## Provider/legal caveat
If current Razorpay account/product setup does not support the desired marketplace hold/release flow, do NOT simulate real escrow or freelancer settlement by changing DB labels. Keep internal state as held/eligible until a supported provider and compliance model is implemented. Avoid the word “escrow” in UI unless legally/provider-correct.

## Refund interaction
Before refund, compute refundable balance, payout state, disputes. Automatic refund of money already irreversibly paid out must be blocked/escalated unless a defined recovery mechanism exists. Initial safe policy: paid-out amounts require admin/dispute resolution.

## APIs
Keep current payment order/verification/refund routes compatible. Add read-only own payout endpoints and explicit admin payout actions such as inspect/retry failed safe operation/reconcile. Never expose generic payment/payout status patch.

## UI language
Client: Awaiting Payment -> Processing -> Paid to Platform -> Work in Progress -> Delivered -> Review -> Completed/Refund state. Freelancer: Not Due -> Held -> Eligible -> Processing -> Paid/Failed.

## Admin operations
Table includes payment, contract, client, freelancer, amount, payment status, payout status, refund amount, provider sync timestamp. Actions are inspect/reconcile/retry-approved-failure/open related case, never arbitrary edit.

## Financial history
Expose immutable-style timeline: payment.created/verified, refund.requested/processed/failed, payout.eligible/processing/paid/failed.

## Concurrency/webhooks
Expected-state atomic updates, event dedupe, provider/reference matching, raw-body signature verification, safe structured logs. Transactions where multiple local documents must move together.

## Tests
Wrong client contract, amount tamper, freelancer payout trigger denied, other user's payout denied, duplicate verification/refund/payout, invalid webhook, race conditions, paid-out refund escalation, no admin status-forging endpoint.

## Acceptance criteria
Unambiguous money states, provider truth respected, no fake settlement, idempotent/atomic transitions, audit trail, safe refund/payout interaction.
