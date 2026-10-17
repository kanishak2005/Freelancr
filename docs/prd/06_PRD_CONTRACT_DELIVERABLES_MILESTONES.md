# PRD 06 — Contract Execution, Milestones, Deliverables, Approval & Timeline

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Extend current `active -> completed/cancelled/disputed` contracts into a real execution workflow while preserving legacy contracts.

## Compatibility
Do not require milestones for historical contracts. Add an optional `executionMode = simple | milestone` or equivalent compatibility mechanism. Existing contracts default/read as simple.

## Milestone entity
Fields: contract, title, optional description, amount, dueDate, status, sequence, createdBy, approvedAt, timestamps. Statuses: planned, in_progress, submitted, change_requested, approved, cancelled. If milestone amounts control money, totals cannot silently exceed contract amount. Sequence unique per contract. Approved milestones become immutable except explicit audited resolution.

## Deliverable entity
Fields: contract, optional milestone, submittedBy, files, message, status, submittedAt, reviewedAt, reviewMessage, revision, timestamps. Statuses: submitted, change_requested, approved, optionally withdrawn before review if product permits.

## Backend files
Create standard `milestones/` and `deliverables/` modules with model/repository/service/controller/routes/validation/types as needed. Frontend features live under matching `features/` folders and integrate into contract detail.

## API actions
Use resource endpoints for CRUD-like reads/creation and action endpoints for transitions: create/list milestones, submit/list deliverables, request changes, approve. Do not expose generic `PATCH status`.

## Authorization
Freelancer may submit only within own active contract. Client may approve/request changes only on owned contract. Non-participants denied. Admin read access can be broad, but resolution mutations are explicit and audited.

## Transition flow
Submit: validate participant/state/files -> persist deliverable -> update milestone expected state -> notify client.
Approve: require submitted -> atomically approve deliverable/milestone -> recalculate payout eligibility if applicable -> notify freelancer.
Change request: require submitted -> reason required -> change_requested -> next valid resubmission increments revision -> notify freelancer.

## Completion rules
Legacy simple mode preserves current behavior. Milestone mode requires all required milestones approved, no unresolved blocking dispute, no pending required review, and appropriate money-state checks. Client never sends arbitrary contract status.

## Timeline
Build from domain/audit events, not log scraping: contract created, payment verified, milestone created, deliverable submitted/change-requested/approved, dispute opened/resolved, contract completed/cancelled.

## Concurrency
State transitions use expected-state conditional updates; if current state changed, return `409` rather than overwriting. Use transactions where multiple documents must change atomically and deployment supports them.

## Upload integration
Deliverable file policy is separate and hardened. Store provider IDs/metadata necessary for access/delete, not just a URL.

## Tests
Participant/non-participant, cancelled/disputed behavior, duplicate approve, revision sequencing, completion blocked by incomplete work, concurrent transition conflict, file validation, notification/audit events.

## Acceptance criteria
Legacy contracts remain functional; new execution flows have explicit states, ownership, atomic transitions, revision/change-request behavior, timeline, notifications, and payout integration points.
