# Source Traceability

This pack is derived from the three supplied project documents.

## `PROJECT_STRUCTURE.md`
Used for the actual documented repository tree, frontend/backend files, layered request pipeline, database/dependency graph, route/service mapping, and environment setup.

## `Freelancr_Complete_Project_Architecture.md`
Used for existing auth/users/jobs/proposals/contracts/payments/refunds/reviews/chat/notifications/uploads/admin/analytics behavior, authorization, security controls, state transitions, business invariants, current quality status, and E2E test matrix.

## `Freelancr_UI_UX_Production_Product_Analysis.md`
Used for target navigation/dashboards/discovery/match score/payout distinction/admin operations/support/disputes/deliverables/milestones/new entities/audit logs/feature priorities/development sequence.

## Conflict rule
If docs and repository code differ: inspect runtime/current code, record the discrepancy, preserve security/financial invariants, make migration explicit, and update documentation after implementation. Do not silently “correct” one source from general knowledge.
