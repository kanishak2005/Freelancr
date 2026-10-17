# Freelancr — Architectural Guardrails & Prohibited Patterns

> **Audience:** Developers and AI coding agents.  
> **Authority:** PRD 02, PRD 03, PRD 06, PRD 07, PRD 10, PRD 12.

---

## 1. Backend Layering Rules

Modules in `server/src/modules/<domain>/` must adhere to strict separation of concerns:

- **Routes (`*.routes.ts`):** HTTP path registration, middleware chain application (`authenticate`, `authorize`, rate limits, `validate`). Must NOT contain business logic.
- **Validation (`*.validation.ts`):** Express-validator chains. Strictly validates input types, lengths, ranges, and formats.
- **Controller (`*.controller.ts`):** HTTP mapping only. Parses `req.body`, `req.params`, `req.query`, invokes service methods, and serializes responses via standard envelopes. Must NOT query Mongoose models directly.
- **Service (`*.service.ts`):** Business logic, invariant enforcement, atomic state transitions, cross-document validations, and side-effects (notifications, audit records).
- **Repository (`*.repository.ts`):** Database queries, projections, pagination offsets, and Mongoose operations.
- **Model (`*.model.ts`):** Mongoose schemas, types, indexes, and document defaults.

---

## 2. Prohibited Implementation Patterns

1. **No Direct Model Queries from Controllers:**
   Controllers must invoke repositories or services; direct `Model.find()`, `Model.create()`, or `Model.findOneAndUpdate()` in controllers is strictly forbidden.

2. **No Client-Side Financial or Status Authority:**
   Never trust client-supplied `amount`, `status`, `isVerified`, `role`, or `userId` from `req.body`. Extract identity and role strictly from authenticated session/JWT context (`req.user.id`, `req.user.role`).

3. **No Direct External Cloud Service Calls from React Frontend:**
   The frontend must never call Cloudinary or Razorpay secret endpoints directly. All uploads, signatures, orders, and webhooks pass through authenticated backend routes.

4. **No Multiple HTTP or WebSocket Clients:**
   All frontend requests must flow through the central Axios instance (`client/src/lib/axios.ts`). All socket communication must use the central `SocketProvider` (`client/src/components/common/SocketProvider.tsx`).

5. **No Blind or Unbounded Pagination:**
   Queries returning arrays must enforce bounded pagination (`Math.min(limit, 100)`). Unbounded `.find({})` is prohibited.

6. **No Secret or Credential Leakage:**
   Never return passwords, reset tokens, refresh tokens, auth headers, or raw provider keys in public projections or health checks.

7. **No Disabling Tests or Validation to "Fix" Build Failures:**
   Never weaken validation rules, bypass authorization checks, or comment out assertions to pass a test suite.

---

## 3. The 10-Point Mutation Checklist

Before writing any state-mutating endpoint (POST/PATCH/DELETE), verify:
1. **Authentication:** Is the endpoint protected by `authenticate`?
2. **Authorization (RBAC):** Is access limited to appropriate roles (`authorize("admin" | "client" | "freelancer")`)?
3. **Data Ownership:** Does the handler verify that the authenticated user owns or participates in the target entity?
4. **Input Validation:** Are all request fields validated for format, type, and bounds?
5. **Preconditions:** Is the entity in the required initial state (e.g. deliverable must be `"submitted"` to approve)?
6. **Atomic Transition:** Are state transitions guarded against concurrent modifications (e.g. conditional query or `runInTransaction`)?
7. **Idempotency:** Does a repeated request produce a safe, deterministic outcome without duplicate side-effects?
8. **Side-Effects:** Are notifications, socket events, or emails dispatched only AFTER successful database persistence?
9. **Audit Trail:** Does the privileged or financial mutation record an entry via `AuditService.record`?
10. **Sanitized Errors:** Do failure cases return clear HTTP status codes (`400`, `401`, `403`, `404`, `409`) without exposing internal stack traces?
