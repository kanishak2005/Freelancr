# FREELANCR — PRD FE-01: Complete Frontend Product & UX Upgrade

**Project:** Freelancr  
**Document type:** Master Frontend Product Requirements Document  
**Execution environment:** Antigravity IDE / autonomous coding agent  
**Scope:** Existing React client application, frontend integration, user experience, responsive design, accessibility, and frontend testing  
**Priority:** High  
**Execution mode:** Phased implementation with verification gates  
**Backend status:** PRD 06 contract/milestone work completed; PRD 07 payment/payout safety remediation reported implemented, with live financial readiness still pending operational verification.

---

# 1. Mission

Transform the existing Freelancr frontend into a coherent, modern, trustworthy freelance marketplace suitable for real users.

The result must not be a cosmetic reskin or a collection of disconnected demo pages. It must be a complete, responsive, role-aware application in which existing features are discoverable, connected to the actual backend, consistent in appearance, and understandable to users.

The design direction is:

- The simplicity and task orientation of a polished professional careers platform.
- The discovery and trust signals of a marketplace.
- The financial clarity and information density of a professional analytics product.
- A distinct Freelancr visual identity; do not copy another company's interface.

The frontend must answer three questions on every important screen:

1. Where am I?
2. What information can I trust?
3. What should I do next?

# 2. Mandatory source documents

Before changing code, inspect the actual repository and read these existing documents:

- `PROJECT_STRUCTURE.md`
- `Freelancr_Complete_Project_Architecture.md`
- `Freelancr_UI_UX_Production_Product_Analysis.md`
- Relevant PRDs under `docs/prd/`, especially PRD 06 and PRD 07.
- Existing API specifications, RBAC documentation, frontend README, and test instructions.

Use the existing source documents as requirements, then reconcile them with the current implementation.

The actual code and current API contracts are authoritative for what presently exists. If a planned feature is absent, an endpoint differs, or a design recommendation conflicts with a security invariant, document the discrepancy and choose the safest compatible implementation.

Do not invent endpoints, response fields, features, user data, or successful backend operations.

# 3. Non-negotiable execution constraints

1. Work inside the existing repository. Do not rebuild Freelancr from scratch.
2. Preserve the existing frontend stack unless a concrete, documented incompatibility makes a change necessary.
3. Do not modify backend behavior merely to simplify frontend work.
4. Do not weaken authentication, authorization, ownership checks, validation, payment safety, or contract/milestone invariants.
5. Do not simulate successful payments, refunds, payouts, uploads, messages, or contract actions.
6. Do not introduce mock production data as if it came from the real backend.
7. Do not install new dependencies without proving that existing dependencies cannot meet the requirement and documenting the reason.
8. Do not create a second Axios client, duplicate API layer, second Socket.IO lifecycle, or parallel authentication state.
9. Do not perform destructive Git commands, delete user work, reset branches, or overwrite unrelated files.
10. Do not expose secrets, tokens, personal data, provider credentials, or sensitive backend errors.
11. Do not claim a feature is complete merely because a page renders.
12. Preserve current functionality and add regression tests before replacing existing behavior.
13. Do not silently suppress TypeScript, ESLint, or test failures.
14. Do not perform real financial operations during development or testing.

Before editing, inspect the Git working tree and preserve all existing user changes.

# 4. Current technology and architecture

The documented frontend stack is:

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router 7
- Redux Toolkit for existing authentication/application state
- TanStack Query v5 for server state and caching
- Axios for HTTP communication
- React Hook Form and Zod for forms and validation
- Socket.IO Client for real-time functionality

Verify the installed versions and existing usage before implementing.

Use clear responsibility boundaries:

- **Pages:** route-level composition.
- **Layouts:** public, authenticated, and admin shells.
- **Components:** reusable UI and domain components.
- **Feature modules:** jobs, proposals, contracts, milestones, payments, payouts, chat, notifications, profiles, and admin.
- **Services:** typed API functions using the canonical HTTP client.
- **Hooks:** reusable state and feature behavior.
- **Store:** existing global state, especially authentication.
- **Types:** request, response, and domain types.
- **Validation:** reusable schemas compatible with actual server contracts.
- **Utilities:** formatting, date handling, money display, and safe helpers.

Use the actual existing directory conventions where they already work. Do not reorganize every file simply to match a proposed folder diagram.

# 5. UX and visual design principles

## 5.1 Product personality

Freelancr should feel:

- Professional and calm.
- Minimal without feeling empty.
- Data-rich only where the task requires it.
- Trustworthy about identity, work status, and money.
- Consistent across client, freelancer, and admin experiences.
- Responsive on mobile, tablet, and desktop.
- Clear and accessible to keyboard and assistive-technology users.

Avoid generic AI-generated dashboards filled with arbitrary statistics, excessive gradients, oversized headings, decorative cards, meaningless charts, and nonfunctional buttons.

## 5.2 Design system

Establish a reusable design system before rebuilding individual pages.

Define tokens for:

- Primary, secondary, accent, surface, background, border, and text colors.
- Success, warning, error, informational, pending, and disabled states.
- Typography scale, line height, and font weights.
- Spacing, container widths, responsive breakpoints, and grid gaps.
- Border radius, shadow, focus ring, and elevation.
- Button heights, input sizes, table density, and icon sizing.
- Motion duration and reduced-motion behavior.

Use the existing brand assets and color direction if they exist. If the existing identity is incomplete, create a coherent professional visual direction and document it.

Support light and dark themes if the existing architecture and scope permit a complete implementation. Do not add a theme toggle that changes only part of the interface.

Create shared primitives as needed:

- Button and icon button.
- Text input, textarea, select, checkbox, radio, and form field.
- Card, badge, tooltip, dropdown, modal, drawer, and confirmation dialog.
- Tabs, breadcrumb, pagination, table, filter bar, and search field.
- Avatar, skeleton, empty state, error state, and loading indicator.
- Toast or inline feedback.
- Accessible status indicator and confirmation panel.

Avoid unnecessary one-off styling. Domain-specific components should compose these primitives.

## 5.3 Layout and navigation

Create a consistent application shell with:

- Responsive sidebar or navigation drawer.
- Clear active-route state.
- Compact primary navigation.
- Contextual secondary navigation.
- Page title, breadcrumbs where useful, and a predictable content width.
- Notification access and user/account menu.
- Mobile navigation with keyboard-accessible controls.

Desktop navigation should support collapsed and expanded states. A collapsed sidebar must remain usable without hover: provide accessible labels, tooltips, keyboard focus, and active indicators.

Group related functionality rather than exposing every backend module as a top-level navigation item.

Suggested primary groups:

- Dashboard
- Discover
- Work
- Money
- Messages
- Notifications
- Profile
- Help

Use role-specific labels and contextual submenu entries. Do not show freelancer earnings to clients or administrative tools to ordinary users.

# 6. Role-based application experiences

## 6.1 Public and unauthenticated experience

Implement or improve the existing public pages:

- Landing page.
- Job discovery or public marketplace entry point, if supported.
- Public freelancer profiles, if supported.
- Login.
- Registration.
- Forgot password.
- Reset password.
- Relevant legal, help, and policy pages where they exist or are required by the existing product.

The landing page should communicate:

- What Freelancr does.
- How clients find and hire freelancers.
- How freelancers discover work and build professional credibility.
- Why the workflow is trustworthy.
- Clear calls to action.

Use real product data where publicly available. Do not fabricate client counts, earnings, testimonials, job volumes, ratings, or trust certifications.

## 6.2 Client experience

The client should have a coherent workflow for creating jobs, reviewing proposals, hiring, managing work, and handling payments.

Navigation should expose the relevant features without duplicating them across multiple unrelated pages.

Client dashboard:
- A personalized greeting based on actual authenticated profile data.
- Useful summary metrics backed by real API responses.
- Jobs requiring attention.
- Active contracts and milestone progress.
- Recent proposals and their current states.
- Recent messages and notifications.
- Payment status with clear distinctions between payment and freelancer settlement.
- Primary next-step actions.

Jobs:
- List, search, filter, sort, paginate, and view jobs according to existing APIs.
- Create and edit jobs where permitted.
- Clearly display draft, open, closed, or other supported statuses.
- Show empty, loading, and error states.
- Preserve user input where safe if a request fails.

Proposals:
- List proposals for the client's jobs.
- Show relevant freelancer profile information and proposal details.
- Support the existing review, acceptance, and rejection flows.
- Display clear confirmation before consequential actions.
- Prevent duplicate submissions and stale-status actions.
- Do not imply a contract exists before the backend confirms it.

Contracts and work:
- Contract overview and detail pages.
- Milestone list and detail views.
- Amount, due date, sequence, status, and allocation summaries from authoritative server data.
- Deliverable review and history.
- Approve and request changes only when the current server state allows it.
- Timeline and audit activity where supported.
- Clear conflict messaging when a stale or invalid transition is rejected.

Money:
- Payment history.
- Payment details where available.
- Refund request flow, if authorized and supported.
- Current payment and refund states.
- Links to relevant contracts and milestones.
- Clear distinction between client payment and freelancer payout.

## 6.3 Freelancer experience

Freelancer navigation should emphasize discovering work, managing proposals and contracts, delivering work, and tracking earnings.

Freelancer dashboard:
- Relevant work and proposal summaries.
- Active contracts and upcoming milestones.
- Deliverables awaiting action.
- Recent client communication.
- Earnings and payout history with accurate states.
- Clear next-step actions.
- Metrics derived from actual backend data.

Discover work:
- Job search and filters that match supported query parameters.
- Job cards with title, budget or compensation format, skills, posting information, and status where provided.
- Job details with clear requirements and application actions.
- Useful empty and error states.
- Saved jobs only if supported by existing backend capabilities.

Proposals:
- Create and validate a proposal using actual request schemas.
- Display proposal history and current statuses.
- Allow edits or withdrawal only if supported and authorized.
- Prevent accidental duplicate submission.
- Explain when an action is unavailable.

Contracts:
- Contract details and milestone progress.
- Deliverable submission and file attachment flows supported by the existing API.
- Change requests and resubmission states.
- Timeline, due dates, and clear pending actions.
- Contract completion status without suggesting that completion alone guarantees payment.

Earnings:
- Display payout history and eligibility information only when authorized.
- Show payout states such as `not_due`, `held`, `eligible`, `processing`, `paid`, `failed`, and `refunded` when those values are present in the actual API contract.
- Explain that a paid client payment does not necessarily mean a freelancer has been paid.
- Display amount and currency using safe integer-minor-unit-aware formatting.
- Explain pending, blocked, or failed settlement in plain language without exposing provider internals.
- Never provide a freelancer with a client-side control to mark a payout as paid or execute an administrative transfer.

## 6.4 Admin experience

Preserve and improve the existing administrative tools, subject to actual API capabilities and role permissions.

Potential sections include:

- Overview dashboard.
- User management.
- Job and contract oversight.
- Payment and payout inspection.
- Refund and dispute/support handling where implemented.
- Reviews and moderation.
- Analytics.
- System health and settings where supported.

Use dense, readable tables with search, filters, pagination, and clear status labels.

Administrative actions must:
- Be visible only to authorized admins.
- Use server-side authorization as the actual security boundary.
- Include confirmations for consequential actions.
- Explain irreversible or financially sensitive consequences.
- Display server errors safely.
- Never invent successful provider execution or reconciliation.

If a planned admin capability is not backed by a secure API, do not implement a fake working control. Document it as a backend dependency.

# 7. Feature and page implementation requirements

## 7.1 Authentication and account state

- Reuse the current authentication architecture.
- Support protected routes and role-aware navigation.
- Restore authenticated sessions according to existing backend behavior.
- Handle expired sessions and unauthorized responses consistently.
- Prevent login redirects from creating loops.
- Preserve safe return-to navigation when authentication succeeds.
- Clear or invalidate user-specific cached data when logging out or switching accounts.
- Do not store sensitive authentication credentials in an insecure new storage mechanism.
- Never trust a role supplied by the browser as authorization.
- Display account-loading and session-expired states clearly.

## 7.2 Jobs and discovery

- Use server-supported filtering and pagination.
- Synchronize shareable search/filter state with the URL where appropriate.
- Debounce text search where beneficial.
- Avoid firing duplicate requests for the same state.
- Keep filter behavior predictable on desktop and mobile.
- Provide accessible result counts and clear-filter actions.
- Distinguish no results from failed requests.

## 7.3 Proposals and hiring

- Use React Hook Form and Zod where consistent with the existing implementation.
- Match backend validation constraints.
- Prevent repeated mutation submissions while requests are pending.
- Invalidate or update the relevant TanStack Query caches after successful mutations.
- Handle conflicts and stale records gracefully.
- Ask for confirmation before irreversible hiring or rejection actions where appropriate.

## 7.4 Contracts, milestones, and deliverables

Treat the existing PRD 06 backend as the authority for state transitions.

- Reuse actual contract, milestone, deliverable, and timeline APIs.
- Do not reimplement contract business rules as frontend-only logic.
- Use frontend state to guide the interface, not to authorize mutations.
- Re-fetch or invalidate stale data after mutations.
- Respect server responses when a transition fails.
- Make milestone allocation amounts, contract totals, and milestone statuses understandable.
- Show deliverable previews only for supported file types and safe access URLs.
- Do not assume Cloudinary uploads or database submissions succeeded until confirmed.
- Handle upload success followed by submission failure without claiming the deliverable was submitted.
- Preserve current change-request, approval, completion, and cancellation semantics.

## 7.5 Payments, refunds, and payouts

The PRD 07 backend is authoritative.

- Maintain separate payment and payout UI models.
- Use only existing authenticated APIs.
- Never calculate authoritative payout eligibility solely in the browser.
- Never change payment, refund, or payout status by directly mutating client-side data.
- Never mark a payout paid optimistically.
- Do not display “funds held in escrow” unless the actual payment provider and implementation support that claim.
- Use accurate status labels and explanatory copy.
- Show pending or uncertain operations as pending/processing until server confirmation.
- Prevent duplicate user submissions while requests are in progress.
- Handle `401`, `403`, `404`, `409`, validation failures, network failures, and provider-related server errors appropriately.
- Do not expose webhook secrets, provider error payloads, or internal settlement metadata.
- Use Razorpay checkout only through the existing documented integration and public browser-safe configuration.
- Never place secret Razorpay credentials in `VITE_*` variables.
- Do not enable live financial operations during frontend development.

## 7.6 Messaging and real-time notifications

- Reuse the existing Socket.IO client and lifecycle.
- Do not create a socket connection independently inside each page.
- Respect authentication, conversation membership, and existing backend authorization.
- Load message history through existing APIs.
- Handle reconnects and stale connection state gracefully.
- Avoid duplicate event listeners and duplicate notifications.
- Use optimistic UI only when rollback and reconciliation behavior are correct.
- Distinguish sent, failed, and pending messages where supported.
- Provide a usable non-real-time fallback for recoverable connection failures.
- Never rely on socket events as the only source of truth for financial or contract state.

## 7.7 Profiles and reviews

- Separate public profile fields from private account settings.
- Support profile editing and portfolio/resume actions where APIs exist.
- Validate file types and sizes in the UI while retaining server-side validation.
- Show upload progress and failure states where supported.
- Display reviews only from authoritative data.
- Prevent users from reviewing entities or contracts they are not authorized to review.

## 7.8 Notifications and help

- Display notification history and unread counts where supported.
- Support marking notifications read only through the actual API.
- Avoid duplicate updates from simultaneous polling and socket events.
- Link notifications to the relevant resource when possible.
- Preserve a clear empty state.
- Make help/support entry points discoverable without inventing unimplemented backend workflows.

# 8. Frontend networking and server state

Audit networking before building new pages.

## Canonical HTTP client

- Reuse one configured Axios instance.
- Preserve the existing API base URL and credential/token strategy.
- Centralize common response/error handling.
- Avoid multiple competing refresh-token mechanisms.
- Prevent refresh loops and concurrent refresh races.
- Do not retry non-idempotent financial mutations automatically unless the API's idempotency contract explicitly supports it.
- Use request cancellation or stale-result protection where appropriate.
- Ensure all endpoints and payloads match the real server implementation.

## TanStack Query

- Use consistent query keys.
- Separate queries from mutations.
- Define reasonable stale and retry policies.
- Do not repeatedly retry authorization failures or irreversible mutations.
- Invalidate affected resources after successful mutations.
- Avoid cache leaks between users and roles.
- Keep server state out of Redux unless the current architecture has a justified need.

## Error normalization

Create or reuse a central frontend error-handling strategy.

- Show safe, actionable messages.
- Preserve field-level validation errors.
- Treat network errors differently from validation and authorization failures.
- Handle `409 Conflict` as a state conflict, not a generic success or generic server error.
- Provide retry options only when safe.
- Never render raw server stack traces or sensitive provider details.

# 9. Responsive design requirements

Support, at minimum, these tested viewport classes:

- Mobile: approximately 360–430 CSS pixels.
- Tablet: approximately 768 CSS pixels.
- Desktop: approximately 1024–1440 CSS pixels.
- Large desktop: wider layouts without uncontrolled line lengths.

Requirements:

- No horizontal overflow caused by page layout.
- Tables use appropriate responsive treatment: horizontal scrolling, prioritized columns, or mobile cards.
- Forms remain usable with mobile keyboards.
- Dialogs fit the viewport and have accessible close controls.
- Navigation remains usable on touch devices.
- Buttons and interactive targets have practical touch sizing.
- Important status and money information remains visible on small screens.
- Chat, job filters, milestone lists, and financial tables are usable on mobile.
- Avoid hover-only functionality.

# 10. Accessibility and usability

Target WCAG 2.2 AA practices where feasible.

- Semantic landmarks and headings.
- Full keyboard navigation.
- Visible focus indicators.
- Proper form labels and accessible validation messages.
- Accessible modal focus management.
- Screen-reader-friendly loading and status announcements.
- Sufficient contrast for text, controls, and status indicators.
- Do not communicate state through color alone.
- Meaningful accessible names for icon-only controls.
- Reduced-motion support.
- Correct alternative text for informative images.
- No keyboard traps.
- Accessible tables and pagination.
- Clear confirmation for destructive or consequential actions.

# 11. Required loading, empty, error, and success states

Every data-driven page must implement appropriate states rather than rendering blank areas.

Loading:
- Skeletons or compact progress indicators appropriate to the content.
- Avoid layout shifts where practical.
- Prevent duplicate mutation submissions.

Empty:
- Explain what is missing.
- Offer a relevant next action when possible.
- Do not show misleading zero values when the data request failed.

Error:
- Use safe messages.
- Provide retry where safe.
- Preserve form input when possible.
- Do not hide failed financial or contract operations.

Success:
- Confirm only what the server has confirmed.
- Refresh the relevant resource or cache.
- Do not confuse “request accepted” with “payment transferred” or “work approved.”

Conflict:
- Explain that the record may have changed.
- Refresh authoritative state.
- Offer the next valid action without bypassing the backend rule.

# 12. Implementation phases

Complete all phases as part of this one PRD. Each phase must be reviewed and verified before proceeding.

## Phase 0 — Repository and baseline audit

1. Inspect Git status and preserve existing changes.
2. Inspect the current client file structure, package scripts, routes, layouts, and components.
3. Read the source documents listed in Section 2.
4. Inventory every existing frontend route and map it to its API/service dependencies.
5. Identify duplicate Axios clients, duplicate socket instances, competing state management, broken imports, incomplete pages, placeholder controls, and inconsistent styles.
6. Record existing test/build status before edits.
7. Map each page to its user role and access requirements.
8. Record missing API dependencies without changing the backend.

Deliverable: a concise baseline report and route/feature coverage matrix.

Do not stop after the audit. Proceed with implementation unless a critical blocker makes safe progress impossible.

## Phase 1 — Design system and application shell

1. Implement shared design tokens and reusable UI primitives.
2. Establish responsive public, authenticated, and admin layouts.
3. Implement role-aware navigation and active-route behavior.
4. Add consistent page headers, breadcrumbs, feedback, loading, and empty states.
5. Ensure keyboard and mobile navigation works.
6. Migrate existing pages incrementally to the shared components.

Acceptance gate:
- Build passes.
- Existing routes still resolve.
- No duplicate global layout or networking infrastructure is introduced.
- Mobile and keyboard navigation work.

## Phase 2 — Authentication and public experience

1. Improve public landing and discovery entry pages.
2. Complete login, registration, forgot-password, and reset-password flows supported by the backend.
3. Implement protected routes and role-aware redirects.
4. Standardize form validation, pending states, and errors.
5. Verify session restoration, logout, and cache cleanup.

Acceptance gate:
- Authentication works against actual APIs.
- Unauthorized routes are handled correctly.
- No secrets are exposed to the browser.
- No fake successful login or registration is possible.

## Phase 3 — Client marketplace experience

1. Upgrade the client dashboard.
2. Upgrade job creation, listing, filtering, editing, and detail pages.
3. Upgrade proposal review and hiring workflows.
4. Integrate contract and milestone management.
5. Integrate client payment/refund views and recent activity.
6. Ensure all mutations reflect server-confirmed results.

Acceptance gate:
- Client workflows use actual APIs.
- Role and ownership errors are handled.
- PRD 06 state transitions remain unchanged.
- No fake data is presented as live marketplace data.

## Phase 4 — Freelancer marketplace experience

1. Upgrade freelancer dashboard.
2. Upgrade job discovery and job details.
3. Upgrade proposal creation and tracking.
4. Upgrade contracts, milestones, deliverables, and timeline pages.
5. Upgrade earnings and payout history.
6. Improve profiles, portfolios, reviews, and notification entry points.

Acceptance gate:
- Freelancer-specific routes and actions are role-aware.
- Payout labels remain separate from client payment status.
- No payout can be executed or marked paid from frontend-only state.
- Existing deliverable and milestone workflows remain compatible.

## Phase 5 — Admin and operational views

1. Improve existing admin dashboards and tables.
2. Group administrative tools into clear sections.
3. Implement safe search, filters, pagination, and detail views.
4. Improve payment/payout inspection and support/dispute interfaces where the backend already supports them.
5. Add confirmation and audit-aware feedback for privileged operations.
6. Clearly identify any UI requirement blocked by missing backend support.

Acceptance gate:
- All admin routes remain protected.
- The backend remains the authorization boundary.
- No unsupported admin action appears functional.
- Financial operations display their real status.

## Phase 6 — Cross-cutting features

1. Integrate messaging and notification experiences using the canonical Socket.IO lifecycle.
2. Improve profile and file-upload flows.
3. Standardize query keys, cache invalidation, and error handling.
4. Remove obsolete duplicate UI only after confirming no route or feature depends on it.
5. Ensure responsive behavior across all implemented pages.
6. Verify dark mode if implemented, including every state and modal.

Acceptance gate:
- No duplicate socket listeners or API clients.
- No cache leakage across accounts.
- No broken navigation after mutations.
- All important pages support loading, empty, error, and success states.

## Phase 7 — Frontend test and accessibility pass

1. Add or update unit/component tests for shared components and form validation.
2. Add route/access tests for roles and unauthenticated users.
3. Test key API loading, error, conflict, and success states.
4. Test contract and milestone UI transitions without changing server rules.
5. Test payment/payout labels and prevent optimistic financial settlement.
6. Test duplicate-submit prevention and cache refresh behavior.
7. Test chat reconnection and duplicate event handling where applicable.
8. Run responsive and keyboard accessibility checks.
9. Add end-to-end coverage for the most critical journeys where the existing test setup supports it.

## Phase 8 — Final verification and documentation

Run the actual available client checks, including:

- TypeScript/type checking.
- ESLint or the configured lint command.
- Existing frontend unit/component tests.
- Critical integration or end-to-end tests.
- Production Vite build.
- `git diff --check`.

Run server regression tests if shared contracts or integration behavior were changed. Do not modify backend code just to make a frontend test pass.

Update relevant frontend documentation and environment examples. Never write real secrets into documentation.

Provide a final implementation report using the structure in Section 15.

# 13. Required critical user journeys

Verify these journeys end to end where the current backend supports them.

### Client journey

Landing → register/login → create job → receive proposals → review and hire → contract → payment → review deliverable → approve or request changes → complete contract → review freelancer.

### Freelancer journey

Register/login → complete profile → discover job → submit proposal → accept contract → work on milestones → submit deliverable → respond to change request → complete work → inspect payout history → review client where permitted.

### Refund journey

Open an eligible payment → request refund → show authoritative pending/result state → update from server response or webhook-driven state refresh.

Do not imply that the refund is complete merely because a request was submitted.

### Financial clarity journey

Client sees payment status; freelancer sees payout status. The UI makes clear that a client's successful payment does not automatically mean the freelancer has received funds.

### Messaging journey

Open conversation → load message history → send message → receive updates → reconnect after interruption → reload history without duplicates.

### Authorization journey

Attempt to access protected pages with no session, the wrong role, or the wrong record ownership. The interface must handle denials safely and never use hidden navigation as a substitute for server authorization.

If a journey depends on an unavailable API, document the blocker and test the available behavior without fabricating success.

# 14. Out of scope

Unless the source documents and actual code explicitly require it, this PRD does not authorize:

- A complete backend rewrite.
- Database migrations.
- Changes to payment-provider architecture.
- New escrow guarantees.
- Changes to payout eligibility rules.
- New backend business capabilities solely to satisfy a visual mockup.
- A replacement frontend framework.
- A second networking or real-time infrastructure.
- Unrelated dependency upgrades.
- Real-money testing.
- Artificial testimonials, user counts, reviews, ratings, or financial statistics.

Any necessary backend gap must be reported with the exact endpoint or contract requirement, the reason it blocks the frontend, and the smallest compatible remedy. Do not silently implement the remedy under this frontend PRD.

# 15. Final report requirements

At completion, provide a detailed report containing:

1. **Executive summary** — what materially improved.
2. **Baseline findings** — existing problems found before edits.
3. **Routes and feature coverage** — existing, implemented, improved, deferred, and blocked.
4. **Design system** — tokens, shared components, and layout changes.
5. **Role coverage** — client, freelancer, admin, and public experiences.
6. **Frontend networking** — canonical Axios client, TanStack Query usage, and socket lifecycle.
7. **PRD 06 compatibility** — contract, milestone, deliverable, timeline, and approval workflows.
8. **PRD 07 compatibility** — payment/payout distinction, refund states, and truthful financial UI.
9. **Files changed** — path and purpose for each meaningful change.
10. **Tests** — exact commands, pass/fail/skip counts, and environment limitations.
11. **Build results** — actual TypeScript, lint, test, and production-build outcomes.
12. **Accessibility and responsiveness** — what was tested and what remains.
13. **Known limitations** — API gaps, incomplete routes, unverified real-time behavior, or operational dependencies.
14. **Rollback considerations** — how changes can be reverted safely without destroying pre-existing work.
15. **Final verdict** — `COMPLETE`, `PARTIALLY COMPLETE`, or `BLOCKED`, with evidence.

Clearly distinguish:
- Implemented and tested.
- Implemented but not tested.
- Tested with mocks.
- Verified against a running backend.
- Not implemented due to a documented dependency.

Never report a test as passing unless the command actually ran and passed.

# 16. Definition of done

This PRD is complete only when:

- The existing Freelancr application has been upgraded in place.
- Client, freelancer, public, and admin experiences are coherent and responsive within the supported scope.
- The shared design system is used consistently.
- Existing supported routes and features remain functional.
- All visible actions have meaningful, truthful behavior.
- Existing APIs are integrated without fabricated response data.
- Role-based navigation and protected routes are correct.
- Contract/milestone/deliverable flows remain compatible with PRD 06.
- Payment/payout/refund UI remains compatible with PRD 07.
- There is one canonical HTTP client and one managed socket lifecycle.
- Loading, empty, error, conflict, and success states are implemented.
- Accessibility and responsive checks have been performed.
- Tests and builds have actual recorded results.
- Documentation and the final report accurately describe the implementation.
- No unresolved critical security or financial UI defect is disguised as completion.

**Execution instruction:** Start with Phase 0, inspect the repository and preserve existing changes, then implement all phases sequentially. Keep changes small and reviewable. Do not stop after producing a plan or redesigning only the dashboard. Deliver the integrated frontend upgrade across the supported product experience, with verification and a truthful final report.
