# PRD 11 — Testing, Observability, Deployment & Rollback

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Make every production change verifiable, observable, deployable, and reversible.

## Test layers
Unit: match scoring, payout eligibility, money math, validators, state guards. Integration: repository/service/ownership/transitions. API: middleware/auth/validation/status/webhooks. E2E: critical marketplace journeys only.

## Critical E2E
Client: register/login -> create job -> receive/accept proposal -> contract -> pay -> approve work -> complete -> review. Freelancer: profile -> discover -> apply -> contract -> submit work -> approval -> payout history -> review. Refund: verified payment -> request -> provider webhook -> DB/UI sync. Dispute: open -> payout blocked -> admin resolve -> downstream state. Chat: persist -> real-time delivery -> refresh history.

## Security regression
Wrong role/owner, inactive account, forged IDs, malformed/mass-assignment payload, NoSQL operator attempt, invalid/replayed webhook/critical mutation, private file access, admin by normal user, secret-field response scan.

## Structured logs
Log timestamp/level/requestId/method/route/status/duration and safe identifiers. Do NOT log authorization headers/JWT/password/reset token/provider secrets/raw signatures/private content. Central errors return safe message/code/request ID; full internal stack remains server-side.

## Metrics
Requests, latency, 4xx/5xx, DB latency, socket connections, payment verification failures, webhook signature failures, refund/payout failures, support/dispute backlog. Avoid high-cardinality user IDs in metrics.

## Backups
Before destructive migration: verified DB backup/snapshot, restore procedure, staging rehearsal, migration counts/errors.

## Environments
Local, CI/test, staging, production. Tests never use production DB or live payment mode.

## Safe deploy order
1. additive compatible backend;
2. compatible migration/backfill;
3. frontend using capability;
4. monitor;
5. enable feature flag;
6. deprecate old behavior later.
Avoid brittle simultaneous frontend/backend cutovers.

## Health and rollback
Deployment uses minimal liveness/readiness. Each release records last good commit, schema migrations, feature flags, rollback procedure, data reconciliation. Never roll code back across incompatible irreversible schema without analysis.

## CI gate
Locked install -> lint -> typecheck -> unit -> integration -> build -> dependency/security scan -> secret scan if available. Payment/security suites are mandatory gates.

## Acceptance criteria
Automated critical/security coverage, safe logs/metrics, staging validation, additive-first release, verified backup for destructive migration, explicit rollback.
