# PRD 12 — AI / Antigravity Agent Execution Protocol

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Purpose
Provide deterministic instructions for autonomous coding agents so each change is bounded, architecture-consistent, and reviewable.

## Read before editing
Read `PROJECT_STRUCTURE.md`, relevant architecture section, relevant product-analysis section, relevant PRD, then actual files to modify. Documentation may be stale; if code and docs differ, report the discrepancy before changing behavior.

## Mandatory pre-change manifest
```text
Feature:
Current behavior:
Target behavior:
Files inspected:
Files to modify/add:
API/schema changes:
Security implications:
Networking implications:
Migration/backfill:
Tests:
Rollback:
Unknowns/risks:
```

## Change sizing
One task = one bounded capability. Do not combine UI redesign + model migration + route rename + auth change + dependency upgrade + payment change. Split.

## Placement rules
Backend business rules -> service; DB queries -> repository; HTTP mapping -> controller; middleware order/path -> routes; validation -> validation file; schema -> model. Frontend server state -> TanStack Query; global/client auth -> existing Redux pattern; HTTP -> centralized service/Axios; socket -> global provider; pages compose; reusable domain UI -> features/components.

## Prohibited patterns
No direct Mongoose from controller where module uses service/repository; no Razorpay/Cloudinary from React; no per-feature Axios/socket; no trusting body userId/role/amount/status; no arbitrary Mongo filters/sorts; no client-set financial state; no secrets in health; no disabling validation to pass tests; no silent catches; no infinite retries; no unbounded lists.

## Mutation checklist
For every mutation answer: auth? role? owner? input? current-state precondition? atomic transition? idempotency? side effects? notification? audit? concurrency? error codes? rollback/compensation?

## Networking checklist
Single HTTP client, finite timeout, correct retry, search cancellation, stable query keys, no duplicate fetches, precise invalidation, socket cleanup/reconnect reconciliation, bounded pagination.

## Security checklist
No client secret, safe projection, role+owner tests, no mass assignment/query injection, proper file policy/rate limit/webhook verification, safe logs.

## Database checklist
Historical docs compatible? optional-first? defaults? backfill? indexes/duplicates? transaction needed? rollback?

## Risky change test order
For auth/payment/payout/admin/dispute: write/confirm negative tests -> implement -> focused tests -> full backend -> build/typecheck -> affected frontend tests/build -> diff review -> `git diff --check`.

## Completion report
Exact files changed, endpoints/models, migration executed/not, commands/results, security checks, known gaps, rollback. “No errors” alone is not completion.

## Stop conditions
Unknown provider payout/escrow capabilities, compliance implications, unclear token transport when changing auth, destructive migration without backup, code/docs conflict on money invariants, breaking API, undefined admin override semantics. Stop rather than invent.
