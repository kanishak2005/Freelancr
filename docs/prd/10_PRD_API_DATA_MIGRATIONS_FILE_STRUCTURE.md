# PRD 10 — API Contracts, Data Migrations & Canonical File Structure

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Keep implementation structure coherent and make every API/schema change backward-compatible and reversible where possible.

## Canonical root
```text
Freelancr/
  client/
  server/
  docs/
    baseline/ implementation/ api/ realtime/ prd/
  README.md
  PROJECT_STRUCTURE.md
```
Do not move the whole repository just for aesthetics.

## Backend module template
`routes`, `controller`, `service`, `repository`, `model`, `types`, `validation` as needed. Preserve existing shared `ApiResponse`, `ApiError`, `asyncHandler`, status conventions.

## DTOs/projections
Separate request DTO, internal entity/model type, and public response projection. Never return raw Mongoose documents wholesale when they include private fields.

## API evolution
Safe: new endpoint, optional field, optional query parameter. Risky: renaming/removing field, type/semantic/status/auth change. Risky changes use add -> frontend migration -> observe -> deprecate -> later remove.

## Mongo migration discipline
Every change specifies old/new shape, defaults for historical docs, read/write compatibility, backfill, index impact, rollback. Use expand-migrate-contract; never introduce an immediately required field that old docs lack.

## Index discipline
Document query supported, uniqueness semantics, duplicate pre-scan, rollout impact, rollback. Likely candidates: saved `(user,job)` unique; payout provider reference unique sparse; payable-unit uniqueness; notification recipient/read/time; support user/status/time; dispute contract/status; audit entity/time; chat conversation/time.

## Cross-document integrity
Services validate contract-proposal-job relationship; milestone-contract; deliverable-milestone-contract; payout-payment-contract-freelancer; dispute-contract-participant. Mongoose refs alone are not enough.

## Deletion/retention
Do not introduce universal soft delete. Financial/dispute/audit data may require longer retention; file deletion must clean provider resources. Destructive privileged actions create audit events.

## API docs
Create/update per-domain docs under `docs/api/`: auth, users, jobs, proposals, contracts, milestones, deliverables, payments, payouts, reviews, chat, notifications, support, disputes, admin, health. Each endpoint documents method/path/auth/role/ownership/request/response/errors/side effects/audit/idempotency/rate-limit.

## Environment
`server/.env.example` contains names/placeholders only. `VITE_*` contains only browser-safe values such as API base/public checkout key ID if required. Never server secrets.

## Acceptance criteria
Consistent placement/layering, backward-compatible API evolution, migration/rollback plan for each schema change, justified indexes, safe projections, synchronized documentation.
