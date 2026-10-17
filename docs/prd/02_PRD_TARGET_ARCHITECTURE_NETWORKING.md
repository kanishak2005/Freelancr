# PRD 02 — Target Architecture, Networking & Integration Boundaries

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Prevent networking sprawl and coupling while adding production domains.

## Backend architecture rule
Keep: `Route -> Authentication -> Authorization -> Validation -> Controller -> Service -> Repository -> Model`. Controllers translate HTTP; services own business rules; repositories own persistence; models own schema/constraints. External SDKs are wrapped.

## Target server tree
```text
server/src/
  app.ts
  server.ts
  config/ database/ middleware/ shared/ types/ utils/ services/
  modules/
    admin analytics audit auth chat contracts deliverables disputes health
    jobs milestones notifications payments payouts proposals reviews support
    uploads users
```
Do not create ceremonial files where a module does not need them.

## Target client tree
```text
client/src/
  app/ components/common components/layout components/ui
  features/auth dashboard jobs proposals contracts deliverables milestones
  features/payments payouts chat notifications profile support disputes admin
  hooks/ layouts/ lib/ pages/ routes/ services/ store/ styles/ types/ utils/
```
Pages compose features; feature components do not become networking singletons.

## HTTP rules
1. Exactly one configured Axios client in `client/src/lib/axios.ts`.
2. Base URL, auth transport, timeout, normalized errors, request ID header, and refresh coordination live there.
3. No Axios construction inside components.
4. Finite request timeouts; uploads may have a separately documented longer timeout.
5. Automatic retries default only for safe/idempotent reads. Never blindly retry payment order, payment verification, refund, payout, proposal acceptance, contract completion, dispute resolution.
6. Search/autocomplete must cancel superseded requests.
7. TanStack Query owns server state; Redux remains only for appropriate global/client state such as auth. Do not duplicate query data into Redux.
8. All unbounded collections are paginated.

## API versioning
Preserve `/api/v1`. Add fields/endpoints compatibly. Do not introduce `/v2` merely for new optional fields. Breaking changes require explicit migration/deprecation.

## Socket.IO rules
- Only `lib/socket.ts` plus the global provider owns browser connection lifecycle.
- Components never call `io()` directly.
- Handshake authenticates; logout removes listeners, disconnects, clears user-bound cache/state.
- Room joins are server-authorized.
- Reconnect re-authenticates and rejoins only permitted rooms.
- Persist domain state first, then emit best-effort real-time event.
- Namespaced events: `chat.message.created`, `notification.created`, `contract.updated`, `deliverable.submitted`, `dispute.updated`, `payout.updated`.
- Document every event's payload and auth precondition.

## External adapters
Controllers do not call Razorpay/Cloudinary/mail directly. Wrap external calls behind services/adapters so test doubles and provider changes remain isolated.

## Idempotency
Externally consequential mutations must define idempotency. Persist idempotency key/provider reference/operation/fingerprint/status when needed. Refunds and payouts require duplicate protection; payment verification remains duplicate-safe.

## Correlation IDs
Add request-ID middleware. Accept only a safe format or generate a new ID; return it in response, attach to logs, never use it as authorization evidence.

## Pagination & cache
Paginate jobs, proposals, messages, notifications, admin lists, audit, support, disputes. Prefer cursor pagination for append-only chat/timelines; page/limit may remain for admin tables. Avoid process-memory caching for financial/authorization state unless multi-instance semantics are explicitly designed.

## Acceptance criteria
One HTTP client, one socket manager, bounded requests, safe retry/cancellation, no component SDK calls, documented real-time contract, paginated lists, explicit idempotency, and preservation of backend layering.
