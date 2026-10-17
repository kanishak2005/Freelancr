# PRD 04 — UX Foundation, Role Navigation, Dashboards & UI States

> **Project:** Freelancr  
> **Audience:** Human developers and autonomous coding agents (including Antigravity-style agents).  
> **Source basis:** `PROJECT_STRUCTURE.md`, `Freelancr_Complete_Project_Architecture.md`, `Freelancr_UI_UX_Production_Product_Analysis.md`.  
> **Rule:** Preserve existing security, payment, authorization, and state invariants unless a PRD explicitly defines a migration. Implement in small reviewable commits.

## Goal
Implement the target P0 UX while leaving business logic authoritative on the server.

## Navigation information architecture
Primary concepts: Dashboard, Discover/Jobs, Work, Messages, Money, Notifications, Profile, Help. Use contextual submenus rather than exposing every backend module.

Client: Dashboard; Jobs; Proposals; Contracts; Payments; Messages; Notifications; Profile; Help.
Freelancer: Dashboard; Find Work; Proposals; Contracts; Earnings; Messages; Notifications; Profile; Help.
Admin: Operations Dashboard; Users; Jobs; Contracts; Payments/Payouts; Reviews; Support; Disputes; Analytics; System Health; Audit; Settings only if real settings exist.

## Sidebar
Desktop collapsed by default, expandable, tooltip, visible active state, keyboard focus, aria-label, not hover-only. Mobile uses accessible drawer, focus trap, Escape close, close on navigation. Navigation config is data-driven but is NOT authorization.

## File plan
```text
client/src/layouts/AuthLayout.tsx MainLayout.tsx AdminLayout.tsx
client/src/components/layout/AppSidebar.tsx SidebarItem.tsx MobileNav.tsx PageHeader.tsx UserMenu.tsx
client/src/config/navigation.ts
```

## Client dashboard
Answer “what requires attention?” Use real data only: jobs posted, proposals awaiting review, active work, amount paid, active projects, recent proposals, upcoming payment actions, recent messages. Avoid decorative fake KPIs.

## Freelancer dashboard
Active contracts, completed count, rating, receivable/eligible amount, due work, recommended jobs, proposal status, pending change requests. Do not label client payment as freelancer earnings before payout eligibility.

## Admin dashboard
Dense operations view: users, active jobs, contracts, GMV, actual platform revenue only if fee model exists, pending payouts, refunds, disputes, support backlog. Insights must be backed by real queries.

## Notification center
Use persisted notifications plus socket updates. Components live under `features/notifications`. Socket events patch/invalidate TanStack Query cache; do not create a second notification store. Add unread count, paginated list, mark-one-read, mark-all if supported, and typed deep links.

## Shared states
Create reusable LoadingState, EmptyState, ErrorState, PermissionState, ConfirmDialog, DataTableSkeleton. Every page defines initial loading, background refresh, empty, 401, 403, 404, mutation pending/success/failure, stale/refetch behavior.

## Confirmation
Require consequence-aware confirmation for delete job, withdraw proposal where irreversible, cancel contract, delete message, account deletion, refunds, dispute resolution, destructive admin action.

## Accessibility
Semantic landmarks/headings, keyboard navigation, focus visibility, proper labels/error association, non-color-only statuses, contrast, reduced-motion respect.

## Networking/performance
Dashboards may use parallel TanStack Query requests or a purposeful aggregate endpoint. Avoid N+1 requests per card/table row. Lazy-load heavy admin pages. Preserve query cache across route changes.

## Acceptance criteria
Role-aware accessible navigation, actionable dashboards, real notification center, consistent loading/empty/error states, no security reliance on frontend role hiding, and no new networking singleton.
