# PRD 05 — Marketplace Discovery, Saved Jobs, Match Score & Trust

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Shift discovery from `browse -> apply` to `discover -> understand -> compare -> trust -> apply`.

## Job card projection
List endpoint should provide title, public client identity, budget/range/type, experience, remote/location, key skills, real client rating/completed project metrics if available, proposal count only if chosen, posted time, saved state. No per-card fetches.

## Filter/search contract
Support only real fields with allowlisted params such as `q, category, budgetMin, budgetMax, budgetType, experienceLevel, remote, postedAfter, clientRatingMin, proposalCountMax, sort, page, limit`. Sorts: best match, newest, highest budget, lowest competition; “ending soon” only if a real deadline exists. Encode state in URL. Debounce/cancel stale search requests.

## Repository safety
Construct Mongo filters explicitly. Bound search text length, escape regex where used, cap page/limit, allowlist sort fields. Add indexes only for measured query patterns.

## Saved jobs
Suggested dedicated entity: `SavedJob(user, job, createdAt)` with unique `(user,job)`. API: save, unsave, list own saved jobs. Save/unsave is idempotent; optimistic UI allowed with rollback on error.

## Deterministic match score
Initial transparent weights from product analysis: skills 40%, experience 20%, category 15%, budget 15%, preferences 10%. Implement a pure service that returns score, breakdown, matched skills, missing skills. Do not begin with opaque AI. Compute on demand; persist/cache only with a demonstrated need.

## Preferences
Only fields actually used by matching: preferred categories, budget range, remote preference, project type. Avoid speculative profile complexity.

## Trust metrics
Freelancer: rating/review count/completed contracts/completion rate only if correctly derived/portfolio/verified-contract reviews. Client: rating/completed contracts and carefully chosen history metrics. No invented badges or misleading rates.

## Anonymous review presentation
Keep reviewer identity internally for authorization/audit. Public UI can hide name/ID and show rating/comment, verified contract, reviewer side, relative date. This is a presentation/privacy rule, not DB deletion.

## Proposal comparison
Compare real bid/timeline/skills/rating/completed work/message excerpt. Do not auto-rank via hidden AI.

## Acceptance criteria
Server-side paginated filtering, no query injection, no N+1 job cards, idempotent saved jobs, explainable match score, real trust metrics, anonymous review UI without destroying audit identity.
