# Freelancr — AI Agent Operating Rules

> **Scope:** Autonomous coding agents, AI pair programmers, and automated tooling operating within `Freelancr`.  
> **Source of Truth:** `docs/prd/12_AI_AGENT_EXECUTION_PROTOCOL.md` & `PROJECT_STRUCTURE.md`.

---

## 1. Core Operating Principles

1. **Inspect Before Proposing or Editing:**
   - Read `PROJECT_STRUCTURE.md`, the relevant architecture sections, and the targeted source files before writing code.
   - If active code contradicts documentation, report the discrepancy immediately instead of assuming docs are ground truth.

2. **Mandatory Pre-Change Manifest:**
   Every non-trivial modification must document:
   - **Feature:** What is being built/fixed.
   - **Current behavior:** Existing code path and state.
   - **Target behavior:** Desired output and side-effects.
   - **Files inspected:** Source files checked.
   - **Files to modify/add:** Exact files targeted.
   - **API/schema changes:** DTOs, parameters, models affected.
   - **Security implications:** Authentication, RBAC, ownership, sanitization.
   - **Networking implications:** Single client, timeouts, duplicate prevention.
   - **Migration/backfill:** Historical doc handling, default values.
   - **Tests:** Targeted unit/integration tests to run.
   - **Rollback:** How to revert the change cleanly.
   - **Unknowns/risks:** Genuine gaps requiring human clarification.

3. **Preserve User Work & Working Tree:**
   - Never run destructive Git commands (`git reset --hard`, `git checkout .`, `git clean -fd`).
   - Preserve existing user work and pre-existing modifications.
   - Make small, incremental, reviewable commits.

4. **Honest Reporting:**
   - Report exact commands run and actual exit codes.
   - Distinguish mocked unit/integration tests from real database, live external-provider, and production runs.
   - Never claim an external provider (Razorpay, Cloudinary) or database was verified unless it was actually executed against live infrastructure.

5. **Stop Conditions (Mandatory Escalation to Human):**
   Stop and ask rather than guessing or fabricating when:
   - Razorpay Route / Payouts / Escrow API capability or account permissions are unconfirmed.
   - Legal, compliance, or financial dispute resolution semantics are ambiguous.
   - A proposed change requires a destructive database migration or irreversible backfill.
   - Active code and PRDs disagree on monetary calculation or payout state transitions.
   - An API modification would break existing client versions without a migration plan.
