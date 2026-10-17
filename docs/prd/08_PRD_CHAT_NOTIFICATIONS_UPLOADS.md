# PRD 08 — Chat, Notifications & Upload Reliability

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Harden existing real-time communication and file pipelines without duplicate sockets, polling storms, privacy leaks, or orphaned uploads.

## Chat
REST owns initial/older history and message management; Socket.IO delivers new events. Persist first, emit second. Preserve participant validation, self-message policy, inactive receiver checks, sender-only deletion where documented. Add cursor pagination and message length validation. Render text safely.

## Socket lifecycle
Only `client/src/lib/socket.ts` and global `SocketProvider` establish/own connection. Feature hooks register/unregister listeners. Reconnect triggers re-authentication and targeted refetch/rejoin. Do not use socket delivery as the sole copy of data.

## Real-time documentation
Create `docs/realtime/SOCKET_EVENTS.md`; each event lists name, producer, recipient/room, payload, auth preconditions, persisted source, duplicate behavior.

## Notifications
Persist recipient/type/title/body/readAt/entityType/entityId/route descriptor/createdAt. Do not trust arbitrary external URLs. Events include proposal/contract/payment/refund/deliverable/payout/dispute/support/admin-moderation updates. Unread count uses an efficient count query, not fetching all notifications.

## Query/cache integration
Socket event patches or invalidates TanStack Query keys; it does not create a parallel canonical store. Low-frequency reconciliation refetch is acceptable; aggressive polling is not.

## Upload policies
Centralize policy definitions for avatar, portfolio, resume, deliverable, disputeEvidence, supportAttachment. Each defines MIME, max bytes/count, provider folder, image transformation if any, privacy/access, retention/deletion.

## Provider metadata
Store Cloudinary/provider public ID, resource type, bytes, safe display name if needed, URL/access metadata, upload timestamp. Delete by provider ID, not URL parsing.

## Orphan handling
If upload succeeds but DB update fails, attempt provider cleanup and log unresolved orphan. For replacement: upload new -> persist new metadata -> then delete old when safe. Define cleanup tooling for leftovers.

## Networking
Chat uses cursor pages, not full conversation reloads. Uploads show progress, support cancellation where possible, use separate bounded timeout, and are not auto-retried invisibly.

## Privacy
Resumes, dispute evidence, support attachments, and private deliverables must not become public by default. Never expose provider secrets/signatures.

## Acceptance criteria
One socket connection, persisted real-time data, paginated chat/notifications, centralized upload rules, private evidence handling, orphan cleanup, no polling/N+1 networking nightmare.
