# PRD 01 — Baseline, Change Safety & Upgrade Guardrails

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Create an evidence-backed baseline before behavior changes so AI agents can distinguish a regression from a pre-existing issue.

## Non-goals
No redesign, no schema redesign, no route renaming, no payment semantic change, no broad dependency upgrade.

## Required baseline documents
```text
docs/baseline/
  ROUTES_BASELINE.md
  MODELS_BASELINE.md
  SOCKET_EVENTS_BASELINE.md
  EXTERNAL_INTEGRATIONS_BASELINE.md
  ENVIRONMENT_VARIABLES_BASELINE.md
  BASELINE_TEST_RESULTS.md
```
Record environment variable names only, never values.

## Successive steps
1. Confirm clean/understood working tree with `git status` and `git diff --check`.
2. Install locked dependencies separately in `client/` and `server/` using the repository's actual package manager/lockfiles.
3. Run existing typecheck/build/test scripts; do not invent missing scripts—record gaps.
4. Snapshot current `/api/v1` routes, auth requirements, roles, input validators, response shapes.
5. Snapshot Mongoose models, indexes, enum states, relationships.
6. Snapshot Socket.IO connection setup and event names.
7. Snapshot Razorpay order/verification/refund/webhook flow, especially raw-body middleware ordering.
8. Snapshot Cloudinary upload/delete behavior and file limits.
9. Capture SMTP password-reset path.
10. Add/verify smoke tests for auth, client, freelancer, admin, payment/refund, reviews, chat, uploads.
11. Add negative tests: no token, invalid/expired token, wrong role, wrong owner, inactive account, invalid ObjectId, invalid body, oversized upload, bad MIME, duplicate review, duplicate payment verification, over-refund, second pending refund, invalid webhook signature, unrelated chat access.
12. Store sanitized golden request/response samples for critical flows.
13. Tag or record the exact known-good baseline commit.

## Optional feature-flag scaffold
If none exists, add a minimal, typed feature-flag layer. Server flags are authoritative for business capabilities; client flags only control presentation. Risky new features start disabled.

## Commit sequence
1. `docs: capture baseline routes models and integrations`
2. `test: add baseline critical-flow coverage`
3. `test: add negative authorization and payment regression cases`
4. `chore: add feature-flag scaffold` (only if needed)

## Acceptance criteria
- Current app builds or pre-existing failures are explicitly documented.
- Critical current flow is reproducible.
- Negative security baseline exists.
- Route/model/socket/integration inventories exist.
- No intended behavior changed.
- Rollback baseline is known.
