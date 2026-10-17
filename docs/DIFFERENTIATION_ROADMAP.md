# Freelancr — Differentiation & Future Features Roadmap

## 1. Executive Summary & Context

Freelancr has established a resilient, production-ready foundation through PRDs 01–12:
- **Financial & Escrow Safety**: PRD 06/07 enforces strict two-phase commit milestones, idempotent Razorpay capture, state machine transitions, and financial ledger invariants.
- **Real-Time Collaboration**: PRD 08 provides resilient, transactional chat messaging and Socket.IO real-time event broadcasting backed by authorization and DB-first persistence.
- **Governance & Admin**: PRD 09 delivers granular dispute resolution, support ticket queues, system health telemetry, and audit logs.
- **API Uniformity & Operational Discipline**: PRD 10–12 provide standardized JSend-compliant responses, regression testing suites (99 integration tests passing), observability, and strict AI agent execution protocols.

This roadmap articulates the strategic differentiation path for Freelancr as required by `docs/prd/13_PRD_DIFFERENTIATION_FUTURE_FEATURES.md`. It balances marketplace network effects and workflow speed against financial safety, privacy, and architectural stability.

---

## 2. Architecture Constraints & Invariants

All future initiatives must comply with the foundational invariants established in `.agents/rules/` and prior PRDs:

1. **Financial Authoritative State**: Client applications never compute or mutate financial or contract balances. All monetary actions (escrow hold, milestone release, refund, dispute settlement) remain strictly backend-driven and gated by transactional atomicity.
2. **Provider Honesty**: No feature may promise instant payouts, chargeback guarantees, or multi-currency escrow unless the underlying payment provider integration genuinely supports it.
3. **Single Source of Truth**:
   - HTTP Client: Use only `client/src/api/axios.ts` with centralized interceptors.
   - Socket Client: Use only `client/src/context/SocketContext.tsx` with authenticated lifecycle hooks.
   - State Management: Use React Context + hooks; avoid introducing Redux/Zustand without explicit architectural justification.
4. **Feature Flag Gating**: All new experiments, advisory algorithms, and candidate features must be disabled by default and controllable via `server/src/config/features.ts` and `client/src/config/features.ts`.
5. **No Hallucinated Data or Fake Escrows**: Do not use mocked live transactions or fake profile stats to simulate product differentiation.

---

## 3. Prioritized Multi-Phase Roadmap

### Phase 1: Marketplace Discovery & Hiring Friction Reduction (Near-Term / Immediate High-Impact)

#### 1.1 Deterministic Recommendations Engine
- **User Problem**: Freelancers face "cold start" noise browsing hundreds of disparate jobs; clients receive mismatched proposals from unqualified freelancers.
- **Supporting Evidence**: Basic match score exists in `server/src/modules/matching/matchScore.service.ts` using skills overlap, but browse endpoints lack personalized ordering.
- **Proposed Solution**:
  - Implement a deterministic, explainable ranking engine.
  - Compute weighted scores based on:
    - Verified skill overlap (Jaccard similarity on normalized tag arrays).
    - Category / subcategory alignment.
    - Historical budget compatibility within freelancer rate bounds.
    - Verified completion rate (PRD 07 completed contracts).
  - Explicitly forbid sensitive demographic or proxy attributes (location, age, gender) in scoring.
- **Required Changes**:
  - Backend: Extend `matching.service.ts` with `getRecommendedJobsForFreelancer(freelancerId, pagination)`.
  - API: `GET /api/v1/jobs/recommended` protected by `authenticate`.
  - Frontend: "Recommended For You" filter tab on `BrowseJobsPage.tsx` displaying explainability pills (e.g., "90% skill match: React, TypeScript").
- **Dependencies**: PRD 03 Profiles, PRD 04 Jobs, `serverFeatures.enableDeterministicRecommendations`.
- **Complexity**: Medium (M).
- **Validation**: A/B test proposal conversion rate and client response time on recommended vs generic browse.

#### 1.2 Typed Advanced & Saved Search
- **User Problem**: Clients and freelancers repeatedly enter repetitive multi-filter queries without alert capabilities.
- **Supporting Evidence**: `SavedJob` exists for bookmarks, but query filter state persistence (`SavedSearch`) is unimplemented.
- **Proposed Solution**:
  - Implement a strictly typed `SavedSearch` schema storing structured criteria (keywords, categories, budget range, experience level).
  - Explicitly prevent raw MongoDB query object persistence to avoid NoSQL injection.
- **Required Changes**:
  - Backend: Create `savedSearch.model.ts`, `savedSearch.controller.ts`, `savedSearch.routes.ts`.
  - API: `GET /api/v1/saved-searches`, `POST /api/v1/saved-searches`, `DELETE /api/v1/saved-searches/:id`.
  - Frontend: "Save this search" action button on job browse search bar with quick-load chips.
- **Dependencies**: PRD 04 Jobs, PRD 10 API Standardization.
- **Complexity**: Low-Medium (S/M).
- **Validation**: Prototype UI with 10 power users; measure query repeat frequency.

---

### Phase 2: Workflow Acceleration & Portfolio Credibility (Medium-Term)

#### 2.1 Repeat Hire Quick-Workflow
- **User Problem**: Satisfied clients who want to re-hire a trusted freelancer must create a public job, wait for a proposal, and negotiate from scratch.
- **Supporting Evidence**: In established marketplaces, repeat hires account for >40% of gross transaction value with lower dispute rates.
- **Proposed Solution**:
  - Provide a 1-click "Rehire Freelancer" flow on completed contract pages and freelancer profiles.
  - Pre-fills contract terms based on past successfully completed contracts.
  - **Invariant Safeguard**: Never automatically create active contracts or initiate payments. Generates a formal private proposal/draft contract that requires explicit client escrow funding and freelancer acceptance.
- **Required Changes**:
  - Backend: `POST /api/v1/contracts/rehire-draft` pre-filling title, rate, and milestones.
  - Frontend: "Hire Again" button on `ContractsPage.tsx` and past contract detail cards.
- **Dependencies**: PRD 06/07 Contracts, `serverFeatures.enableRepeatHirePrefill`.
- **Complexity**: Medium (M).
- **Validation**: User interviews with repeat clients to verify milestone pre-fill accuracy.

#### 2.2 Verified Contract Portfolio Case Studies
- **User Problem**: Freelancers upload unverified portfolio screenshots that clients cannot distinguish from copied work.
- **Supporting Evidence**: Clients in disputes frequently cite misleading external portfolio links.
- **Proposed Solution**:
  - Enable freelancers to link completed Freelancr contracts directly to portfolio case study items.
  - Display a "Verified Freelancr Project" badge with verified contract category, duration, and client rating.
  - **Privacy & IP Safeguard**: Requires mutual consent or client approval; never exposes private deliverables, messages, or unredacted contract attachments without explicit client authorization.
- **Required Changes**:
  - Database: Add optional `verifiedContractId` reference and `isClientApproved` boolean to Portfolio items.
  - Backend: Mutual approval verification check before setting `verifiedContractId`.
  - Frontend: Verified badge and linked feedback snippet on `FreelancerProfilePage.tsx`.
- **Dependencies**: PRD 03 Profiles, PRD 07 Reviews, PRD 08 Uploads.
- **Complexity**: Medium (M).
- **Validation**: Freelancer survey on willingness to request client verification at contract completion.

#### 2.3 Contract & Milestone Templates
- **User Problem**: Non-technical clients struggle to define measurable milestones, leading to scope creep and disputes.
- **Supporting Evidence**: PRD 09 dispute data indicates undefined milestones are the primary cause of deliverables conflicts.
- **Proposed Solution**:
  - Curate role-specific milestone templates (e.g., "Full-Stack Web App: 1. Design & Wireframes, 2. Core Backend & DB, 3. UI Implementation, 4. Acceptance Testing & Deployment").
  - Client can choose and customize a template during job creation or proposal acceptance.
- **Required Changes**:
  - Static configuration library for milestone blueprints.
  - UI template selector modal in `CreateJobPage.tsx` and `AcceptProposalModal.tsx`.
- **Dependencies**: PRD 04 Jobs, PRD 06 Contracts.
- **Complexity**: Low (S).
- **Validation**: Usability testing on client onboarding flow.

---

### Phase 3: Controlled AI & Smart Assistance (Differentiating Features to Validate)

#### 3.1 Controlled Proposal Drafting & Requirements Summary
- **User Problem**: Non-native English freelancers struggle with concise, persuasive proposals; busy clients struggle to parse dense job descriptions into key criteria.
- **Supporting Evidence**: Over 50% of rejected proposals are due to formatting, vagueness, or failure to address key project requirements.
- **Proposed Solution**:
  - Freelancer Assist: "Polish Proposal" button that refines tone, fixes grammar, and formats bullet points.
  - Client Assist: "Extract Deliverables" helper converting loose client paragraphs into structured milestone requirements.
  - **Safety Invariant**:
    - AI is strictly advisory.
    - AI never automatically submits proposals or contracts.
    - AI never fabricates claims, portfolio links, or qualifications.
    - All prompt context excludes PII, credentials, or proprietary payment data.
- **Required Changes**:
  - Backend: Scoped proxy endpoint `POST /api/v1/ai/assist/proposal-polish` with strict rate-limiting and input sanitization.
  - Frontend: Diff/review modal allowing user to accept, reject, or edit AI suggestions.
- **Dependencies**: PRD 05 Proposals, `serverFeatures.enableAiProposalAssistance`.
- **Complexity**: High (H).
- **Validation**: Proof of concept with mock prompts; measure proposal quality improvement without hallucination.

#### 3.2 Non-Binding Smart Pricing Guidance
- **User Problem**: First-time clients underprice complex projects, attracting zero bids; freelancers overprice or underbid unpredictably.
- **Supporting Evidence**: High variance in project bid amounts creates friction in proposal evaluation.
- **Proposed Solution**:
  - Calculate advisory budget percentile ranges (25th, 50th, 75th percentiles) based on historically completed contracts in the same category and skill set.
  - Non-binding: Never enforces prices or restricts market autonomy.
- **Required Changes**:
  - Backend: Aggregation service calculating rolling category median rates on completed contracts.
  - Frontend: Subtle "Market benchmark: $X - $Y" advisory tooltip in `CreateJobPage.tsx`.
- **Dependencies**: PRD 06/07 Contract history, `serverFeatures.enableSmartPricingAdvisory`.
- **Complexity**: Medium (M).
- **Validation**: Statistical verification of completed contract sample sizes across top categories.

---

### Phase 4: Long-Term Platform Governance & Automated Reliability

#### 4.1 Idempotent Job Alerts via Worker Queue
- **User Problem**: Freelancers miss high-fit jobs posted while offline.
- **Proposed Solution**:
  - Async job alert dispatcher triggered upon job publication.
  - Queries active `SavedSearch` filters and delivers throttled batch email / in-app notifications.
  - **Architecture Invariant**: Requires dedicated background queue (e.g., BullMQ / Redis) to avoid running blocking search aggregations on the primary Express web server.
- **Dependencies**: Dedicated worker infrastructure, Phase 1.2 Saved Searches.
- **Complexity**: High (H).

#### 4.2 Explainable Fraud & Anomaly Risk Scoring
- **User Problem**: Malicious users attempt off-platform payment circumvention or rapid credential stuffing.
- **Proposed Solution**:
  - Heuristic risk scoring engine (off-platform contact keyword detection in chat, rapid multiple proposal submissions, abnormal IP geolocation shifts).
  - Admin-only alerts in `AdminDashboard.tsx`.
  - Never automatically freezes accounts or funds without human admin review.
- **Dependencies**: PRD 08 Chat audit, PRD 09 Admin operations.
- **Complexity**: High (H).

---

## 4. Execution Matrix & Effort Sizing

| Initiative | Priority Tier | Complexity | Risk Profile | Prerequisite PRDs | Feature Flag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Deterministic Recommendations** | Tier 1 (High Impact) | Medium | Low | PRD 03, 04 | `enableDeterministicRecommendations` |
| **Typed Saved Search** | Tier 1 (High Impact) | Low-Med | Low | PRD 04, 10 | Core feature |
| **Contract Milestone Templates** | Tier 1 (Quality Gap) | Low | Low | PRD 04, 06 | Core feature |
| **Repeat Hire Quick-Flow** | Tier 2 (Workflow) | Medium | Med (Contract State) | PRD 06, 07 | `enableRepeatHirePrefill` |
| **Verified Portfolio Studies** | Tier 2 (Trust Signal) | Medium | Med (Privacy/IP) | PRD 03, 07, 08 | Core feature |
| **Smart Pricing Advisory** | Tier 3 (Differentiating) | Medium | Low (Non-binding) | PRD 06, 07 | `enableSmartPricingAdvisory` |
| **Controlled AI Proposal Assist** | Tier 3 (Differentiating) | High | Med (Hallucination/Cost) | PRD 05, 10 | `enableAiProposalAssistance` |
| **Idempotent Job Alerts** | Tier 4 (Long-Term) | High | High (Worker Infra) | Redis/Worker queue | `enableJobAlertsScheduler` |
| **Fraud Risk Scoring** | Tier 4 (Long-Term) | High | High (False Positives) | PRD 08, 09 | Admin governance |

---

## 5. Exit Criteria & Recommended Implementation Follow-Ups

1. **Immediate Next Step (PRD 14 / Discovery PRD)**:
   - Implement Phase 1.1 (Deterministic Recommendations) and Phase 1.2 (Typed Saved Search).
   - Both build directly on existing `matchScore.service.ts` and `job.model.ts` without introducing new external services.
2. **Workflow Next Step (PRD 15 / Workflow & Trust PRD)**:
   - Implement Phase 2.1 (Repeat Hire) and Phase 2.2 (Verified Portfolio Case Studies).
   - Leverage PRD 06/07 completion states and PRD 08 upload security.
3. **Infrastructure Prerequisite for Phase 4**:
   - Do not attempt Job Alerts or High-Frequency Risk Scoring until an asynchronous worker queue (Redis / BullMQ) is provisioned and monitored.
