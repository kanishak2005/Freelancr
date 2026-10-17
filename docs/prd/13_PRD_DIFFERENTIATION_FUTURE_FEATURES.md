# PRD 13 — Future Differentiators, Recommendations & Controlled AI

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Entry gate
Do not start until role UX, discovery, deliverables/milestones, payment/payout semantics, support/disputes, audit/health/testing are stable.

## Recommendations
Begin deterministic using explicit skills/categories/experience/budget preferences/saved jobs/application history where policy permits. Return reasons for ranking. Do not infer sensitive attributes.

## Advanced and saved search
Allow bounded typed filters only; never raw DB operators. SavedSearch stores user, name, normalized validated filters, alertsEnabled, timestamp.

## Job alerts
Only implement when a real background/scheduler mechanism exists. Delivery is idempotent, deduplicated, throttled. Do not simulate background jobs inside unrelated HTTP requests.

## Repeat hire
Pre-fill a new explicit workflow but never clone payment/contract state silently. User confirms terms.

## Contract templates
Draft terms only; cannot bypass normal proposal/contract authorization.

## Portfolio case studies
Title, description, skills, media, optional verified linked contract when privacy allows. Never publish private client work automatically.

## AI proposal assistance
May improve wording, summarize requirements, suggest questions. Must not auto-submit, invent experience, fabricate portfolio, or impersonate users without explicit action.

## AI matching
Advisory, explainable, feature-flagged, fallback to deterministic matching, no sensitive inference, no automatic exclusion/ban.

## Fraud/risk scoring
Future high-governance feature only: explicit signals, false-positive monitoring, appeal/review, admin-only access, audit/privacy review. No unexplained automatic bans.

## Smart pricing
Advisory range with evidence; never forced.

## Feature flags/privacy
All AI/experimental features independently disableable, safe fallback, monitored. Document input data, retention, external model/provider, user visibility, private-content handling. Never send secrets/tokens/payment credentials by default.

## Acceptance criteria
Future features are additive, explainable, privacy-reviewed, flag-controlled, and not required for core marketplace operation.
