# Freelancr Production Upgrade — Master PRD & Execution Roadmap

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Objective
Upgrade the current modular MERN marketplace into the target production-oriented product without a rewrite. Keep the documented backend flow `route -> middleware -> controller -> service -> repository -> model`, and evolve it domain-by-domain.

## Current protected baseline
Existing domains: auth, users, jobs, proposals, contracts, payments/refunds, reviews, chat, notifications, uploads, admin, analytics. Existing external systems: MongoDB Atlas, Razorpay, Cloudinary, SMTP/mail, Socket.IO.

Existing invariants that MUST remain true:
1. Server-side RBAC and resource ownership checks.
2. Payment amount is derived from contract data, never trusted from the browser.
3. Razorpay payment/webhook signatures are verified.
4. Refunds are bounded, duplicate-safe, and synchronized against provider truth.
5. Users cannot access unrelated contracts, messages, notifications, or private resources.
6. Public user responses use safe projections.
7. Inactive accounts are blocked.
8. Secrets are never exposed through API/admin health UI.

## Target domain map
```text
auth users jobs proposals contracts
milestones deliverables
payments payouts refunds
disputes reviews chat notifications support uploads
admin analytics audit health
```
`refunds` may remain inside `payments` until separation materially improves maintainability. UI pages do not automatically justify backend modules.

## Mandatory phase order
### Phase 0 — Baseline and safety
PRDs 01, 02, 03, 10, 11, 12. Capture routes/models/socket events, test critical flows, establish safe networking, security gates, migration discipline, observability, rollback.

### Phase 1 — UX foundation
PRD 04: role layouts, collapsed role-aware sidebar, dashboards, notification center, loading/empty/error/accessibility states.

### Phase 2 — Discovery and trust
PRD 05: richer job cards, server filters/sorts, saved jobs, deterministic match score, trust metrics, anonymous review presentation.

### Phase 3 — Work lifecycle
PRD 06: deliverables, milestones, approval/change-request, contract timeline, concurrency-safe transitions.

### Phase 4 — Money
PRD 07: payment UX, payout entity/state, payout eligibility, admin payout operations, refund history, financial timeline.

### Phase 5 — Operations
PRDs 08–09: chat/notification/upload hardening, support, disputes, audit logs, admin operations, system health.

### Phase 6 — Differentiation
PRD 13 only after P0/P1 stability: recommendations, advanced/saved search, alerts, repeat-hire, templates, portfolio case studies, carefully controlled AI.

## Definition of Done for every feature
Every implementation must document: purpose, files changed, API, schema, auth matrix, validation, state machine, networking behavior, cache behavior, error/loading states, audit events, rate limits, observability, unit/integration/E2E/security tests, migration, rollback, and docs.

## Stop conditions for autonomous agents
Stop for review rather than guessing if a change would: break an existing public route, change token transport, change payment/refund/payout semantics, weaken RBAC, expose new public fields, alter webhook raw-body handling, create another Axios/socket singleton, perform destructive migration without backup, or imply unsupported provider/legal escrow behavior.

## Pack contents
- `01_PRD_BASELINE_CHANGE_SAFETY.md`
- `02_PRD_TARGET_ARCHITECTURE_NETWORKING.md`
- `03_PRD_SECURITY_RBAC_CYBERSECURITY.md`
- `04_PRD_UX_FOUNDATION_DASHBOARDS.md`
- `05_PRD_MARKETPLACE_DISCOVERY_TRUST.md`
- `06_PRD_CONTRACT_DELIVERABLES_MILESTONES.md`
- `07_PRD_PAYMENTS_PAYOUTS_REFUNDS.md`
- `08_PRD_CHAT_NOTIFICATIONS_UPLOADS.md`
- `09_PRD_ADMIN_SUPPORT_DISPUTES_AUDIT_HEALTH.md`
- `10_PRD_API_DATA_MIGRATIONS_FILE_STRUCTURE.md`
- `11_PRD_TESTING_OBSERVABILITY_DEPLOYMENT.md`
- `12_AI_AGENT_EXECUTION_PROTOCOL.md`
- `13_PRD_DIFFERENTIATION_FUTURE_FEATURES.md`
