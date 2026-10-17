# Freelancr API Reference Specification (PRD 10)

This document standardizes the external and internal API contracts for the Freelancr platform across all modules.

---

## 1. Global Conventions

### Response Envelope
All successful standard JSON endpoints follow the standard `ApiResponse` envelope:
```json
{
  "success": true,
  "message": "Optional human-readable confirmation message",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Envelope
All error responses adhere to the unified `ApiError` structure:
```json
{
  "success": false,
  "message": "Human-readable description of error",
  "errors": []
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid JWT access token.
- `403 Forbidden`: Authenticated user lacks permission or ownership over target resource.
- `404 Not Found`: Target entity ID does not exist.
- `409 Conflict`: Business invariant conflict (e.g., concurrent transition, duplicate active dispute, refund conflict).
- `500 Internal Server Error`: Unhandled server exception.
- `503 Service Unavailable`: Dependent service (e.g. database) not ready.

---

## 2. Authentication & Users (`/api/v1/auth`, `/api/v1/users`)

### Auth Endpoints
- `POST /api/v1/auth/register`: Register new user (`fullName`, `email`, `password`, `role`). Returns user profile and sets refresh cookie.
- `POST /api/v1/auth/login`: Authenticate with email and password. Returns JWT access token and user object.
- `POST /api/v1/auth/refresh-token`: Exchange refresh cookie for new access token.
- `POST /api/v1/auth/logout`: Revoke active session tokens.

### User Projections & Safe DTOs
All user queries apply the strict projection filter:
`-password -refreshToken -passwordResetToken -passwordResetExpires -__v`

---

## 3. Marketplace, Jobs & Proposals (`/api/v1/jobs`, `/api/v1/proposals`)

### Job Lifecycle
- States: `open` -> `in_progress` -> `completed` / `cancelled`.
- `GET /api/v1/jobs`: Public searchable query (supports pagination, category, skills, budget).
- `POST /api/v1/jobs`: Client only. Creates new job post.
- `GET /api/v1/jobs/:id`: Retrieve job details.
- `PATCH /api/v1/jobs/:id`: Client owner only. Update job details.
- `DELETE /api/v1/jobs/:id`: Client owner only. Delete job (only if no active contracts).

### Proposals
- `POST /api/v1/proposals`: Freelancer only. Submit proposal with bid amount and delivery time.
- `GET /api/v1/proposals/my-proposals`: Freelancer lists own proposals.
- `GET /api/v1/proposals/job/:jobId`: Client owner inspects proposals for their job.

---

## 4. Contracts, Milestones & Deliverables (`/api/v1/contracts`, `/api/v1/milestones`, `/api/v1/deliverables`)

### Contract Execution Modes
- `"simple"`: Full-project scope; complete on delivery.
- `"milestone"`: Multi-phase deliverables; budget split into approved milestone disbursements.

### Deliverable Review Workflow
- Statuses: `submitted` -> `approved` | `change_requested` | `withdrawn`.
- `POST /api/v1/contracts/:contractId/deliverables`: Freelancer submits work and attachments.
- `POST /api/v1/contracts/:contractId/deliverables/:id/approve`: Client approves deliverable; transitions milestone to `approved` atomically.
- `POST /api/v1/contracts/:contractId/deliverables/:id/request-changes`: Client requests revisions with required change message.

---

## 5. Payments, Payouts & Refunds (`/api/v1/payments`)

### Escrow & Payout Eligibility
- `POST /api/v1/payments/create-order`: Client initiates Razorpay escrow deposit.
- `POST /api/v1/payments/verify`: Confirms client payment signature and sets payment status to `paid`.
- `GET /api/v1/payments/eligibility/:contractId`: Authoritative check:
  - Verifies contract is funded.
  - Verifies deliverables or milestone completed.
  - Confirms no pending refunds or active disputes.
- `POST /api/v1/payments/payouts/:id/execute`: Admin only. Claims `eligible` -> `processing` and invokes Razorpay transfer.

---

## 6. Real-Time Chat & Notifications (`/api/v1/chat`, `/api/v1/notifications`)

- `POST /api/v1/chat`: Persist-first message delivery.
- `GET /api/v1/chat/conversation/:otherUserId`: Deterministic cursor pagination (`$lt: cursor`, sorted by `createdAt: 1`).
- `GET /api/v1/notifications/unread-count`: Fast index-backed count query (`Notification.countDocuments({ user, read: false })`).

---

## 7. Upload Reliability & Policies (`/api/v1/upload`)

- `POST /api/v1/upload`: Multipurpose upload handler enforcing binary magic-byte inspection (PNG, JPEG, PDF, WebP, ZIP), category size caps, and storage privacy modes:
  - `avatar`: Public, 5MB, image.
  - `portfolio`: Public, 10MB, image.
  - `resume`: Private (`authenticated`), 10MB, raw.
  - `deliverable`: Private (`authenticated`), 25MB, raw.
  - `disputeEvidence`: Private (`authenticated`), 15MB, raw.
  - `supportAttachment`: Private (`authenticated`), 10MB, raw.

---

## 8. Support & Dispute Operations (`/api/v1/support`, `/api/v1/disputes`)

### Support Tickets
- `POST /api/v1/support`: User creates ticket.
- `GET /api/v1/support/my-tickets`: User lists own tickets.
- `GET /api/v1/support/:id`: Owner or admin only.
- `POST /api/v1/support/:id/reply`: Scoped replies.
- `PATCH /api/v1/support/admin/:id/status`: Admin status updates.

### Disputes
- `POST /api/v1/disputes`: Contract client or freelancer only. Locks contract into `"disputed"`, freezing payout disbursements.
- `POST /api/v1/disputes/:id/evidence`: Participants submit evidence while dispute is active.
- `PATCH /api/v1/disputes/admin/:id/resolve`: Admin resolves dispute (`refund_client`, `release_freelancer`, `split`, `dismissed`) executed inside a database transaction boundary.

---

## 9. Health & System Diagnostics

- `GET /health/live`: Public Kubernetes liveness probe (`{ "status": "ok" }`).
- `GET /health/ready`: Public Kubernetes readiness probe; runs a live database ping with 2000ms timeout (`{ "status": "ready" }`).
- `GET /api/v1/admin/health`: Admin-authenticated; reports memory usage, process uptime, node version, and sanitized database status without exposing credentials.
- `GET /api/v1/admin/audit`: Admin-authenticated; paginated security audit log stream with scrubbed credentials.
