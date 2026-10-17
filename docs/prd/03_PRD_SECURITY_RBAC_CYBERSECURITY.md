# PRD 03 — Security, RBAC & Cybersecurity Hardening

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Extend current JWT/RBAC/ownership/validation/Helmet/CORS/rate-limit/payment/webhook/file controls to all new domains.

## Core rules
- Deny by default.
- Server auth is authoritative; hiding UI is not security.
- Validate syntax at boundary; validate eligibility/state in service layer.
- Never trust client-supplied role, owner, amount, financial status, provider status, reviewer identity, resolution actor, or audit fields.
- Minimize public/admin responses.
- Financial and privileged mutations are idempotent/audited where applicable.

## Authorization matrix
Public may browse public jobs/profiles only. Client may manage own jobs, proposals received for own jobs, own contracts/payment operations, own support/disputes. Freelancer may submit/manage own proposals, access own contracts, submit own deliverables, access own payouts, support/disputes. Admin endpoints are separately authorized and audited; finance/support resolution actions should be explicit, not generic CRUD.

## Object-level authorization sequence
1. Validate ObjectId.
2. Fetch target.
3. Validate active/existence state.
4. Verify role/ownership/participant relationship.
5. Verify state transition precondition.
6. Execute mutation atomically where needed.
Unauthorized private resources should not leak high-detail existence information.

## Mass-assignment prevention
Never pass `req.body` wholesale to Mongoose updates. Build allowlisted DTOs. User-controlled updates must never directly set: role, active/verified flags, payment/payout/refund state, provider references, admin assignment/resolution fields, audit metadata, ownership fields.

## Input/query hardening
Define length/range/enums/date bounds/pagination caps/sort allowlists/filter allowlists for every endpoint. Preserve safe escaped search. Do not accept raw Mongo filters, `$` operators, arbitrary sort objects, or nested update operators from clients.

## XSS/content
Profiles, jobs, proposals, reviews, chat, deliverables, support, dispute text render as text by default. Avoid `dangerouslySetInnerHTML`; if rich text is ever introduced, use reviewed sanitization and a constrained schema.

## Auth/session
Preserve existing JWT/refresh design unless a dedicated migration is approved. Verify token signature/expiry/current active account. Password reset must avoid user enumeration and sensitive logging. If cookies are used, configure HttpOnly/Secure/SameSite and CSRF protection as appropriate. Tokens never appear in URLs.

## CORS/headers
Production origin allowlist only; never wildcard credentials. Keep Helmet and verify CSP/frame/MIME/referrer/HSTS behavior with deployed frontend/payment checkout.

## Upload security
Separate policies for avatar, portfolio, resume, deliverable, dispute evidence, support attachment. Each defines MIME allowlist, byte limit, count, provider folder, privacy, retention. Reject executable/script content; never use user paths as server filesystem paths. Evidence/private documents must not become unintentionally public.

## Payment/refund/payout
Payment amount comes from contract/server. Verify order/payment/currency/captured status and HMAC. Refund must check owner, eligible state, positive/bounded amount, pending lock, provider truth, webhook signature/idempotency. Payout is a separate entity; eligibility is server-computed; provider reference/idempotency uniqueness required; admin cannot arbitrarily mark `paid`.

## Webhook security
Raw body preserved before trust/parsing, signature verified, event type allowlisted, event/provider ID deduplicated where possible, transition idempotent, safe errors/logs.

## Admin security
Health may show status/latency/counts but never env values, JWT secrets, DB URI, Razorpay/Cloudinary/SMTP secrets, password hashes/reset tokens, full auth tokens. Sensitive admin actions require reason where useful, request ID, audit event, and target entity metadata.

## Audit minimum
Audit: role/status changes, admin deletes/overrides, proposal accepted, contract created/completed/cancelled, deliverable submitted/approved, dispute opened/resolved, payment verified, refund requested/processed, payout state changes, support assignment/resolution. Never store secrets or entire private payloads.

## Rate limiting
Target auth/reset, chat send, support create, dispute evidence, expensive search, and financial mutation endpoints. Do not accidentally block verified provider webhooks with user-oriented rate limiting.

## Security test gate
Every new mutation must test unauthenticated, wrong role, wrong owner, malformed ID, invalid body, invalid state transition, duplicate request for critical actions, sensitive-field response assertions, and audit assertion for privileged actions.

## Acceptance criteria
Explicit auth/ownership/validation on all new endpoints; no mass assignment/query injection; safe uploads/CORS/logging/admin health; idempotent financial flows; audited privileged actions.
