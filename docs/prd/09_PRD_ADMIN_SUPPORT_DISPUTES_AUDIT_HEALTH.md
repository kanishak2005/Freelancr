# PRD 09 — Admin Operations, Support, Disputes, Audit & System Health

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Build an operations center with explicit privileged workflows instead of unrestricted admin CRUD.

## SupportTicket
Fields: user, category, subject, description, status, priority, optional assignedAdmin, attachments, lastActivityAt, timestamps. Status: open, in_progress, waiting_for_user, resolved, closed. User can create/list/view own; replies are scoped; admin assignment/resolution are explicit protected actions.

## Dispute
Fields: contract, openedBy, reason, description, evidence, status, resolution, resolvedBy, opened/resolved timestamps. Status: open, under_review, awaiting_evidence, resolved, rejected, cancelled. Participant only may open. Resolution is an explicit admin action with reason and audit; do not auto-refund when opened.

## Blocking effects
Open blocking dispute must prevent payout eligibility/release and any unsafe auto-completion. Contract may use documented disputed state or a compatibility flag. Resolution explicitly drives downstream transitions.

## Evidence
Use private upload policy, authorization, type/size/count limits, immutable association after resolution unless an audited correction exists.

## AuditLog
Fields: actor, actorRole, action, entityType, entityId, requestId, minimized before/after or metadata, createdAt. Append-oriented; no ordinary mutation endpoint. Never store passwords/tokens/secrets/raw payment credentials/private file bodies.

## Admin user drill-down
Show safe profile, role/active status, marketplace counts, reviews, payment/payout summary, support/dispute/moderation history. Never password hash/reset token/secrets.

## Analytics/insights
Charts: user growth, job lifecycle, contract outcomes, payment/refund/payout, GMV, real fee revenue only if model exists, category demand, support/dispute backlog. Operational insights must be computed and link to filtered tables.

## Health
Use `/health/live`, `/health/ready`, and protected `/api/v1/admin/health`. Public health is minimal. Admin health may show sanitized service status, DB/API latency, socket count, request/error rates, process memory, uptime. Never return connection strings/env values/secrets/internal stack traces.

## Admin privilege design
Keep current admin role initially but structure explicit services so later finance/support/super-admin separation is possible. Every high-impact override produces audit record and reason where applicable.

## Tests
Support owner/other-user/admin assignment/resolution; dispute participant/non-participant/duplicate/open-blocking/resolution; health public-minimal/admin-protected/secrets-absent; audit emission and user denial.

## Acceptance criteria
Operational admin UI, stateful support/disputes, payout blocking, auditable privileged actions, useful health without secret leakage, and no generic admin status editing.
