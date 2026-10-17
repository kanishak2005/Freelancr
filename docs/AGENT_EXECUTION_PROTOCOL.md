# AI Agent Execution Protocol (PRD 12)

This document specifies the operational guidelines and repeatable workflow for AI coding agents (including Antigravity-style autonomous agents) working within the Freelancr repository.

---

## 1. Step-by-Step Execution Workflow

1. **Phase 1: Task Inspection & Repository Grounding**
   - Read the relevant PRD document in `docs/prd/`.
   - Inspect `PROJECT_STRUCTURE.md` to identify module boundaries.
   - Run `git status` to establish working tree baseline.
   - Inspect existing types, models, controllers, and services to extend rather than reinvent.

2. **Phase 2: Draft Pre-Change Manifest**
   - Document feature scope, inspected files, target files, API/schema modifications, security considerations, and rollback instructions.

3. **Phase 3: Incremental Implementation**
   - Write backend models/types/validation/repository/service/controller/routes.
   - Ensure DTO projections exclude private fields.
   - Use `runInTransaction` for multi-document operations.
   - Wire frontend components to centralized Axios (`api`) and React Query hooks.

4. **Phase 4: Diff & Regression Review**
   - Run `git diff --check` to verify no whitespace errors or merge markers exist.
   - Verify no secrets, credentials, or `.env` files were created or modified.

5. **Phase 5: Automated Verification**
   - Run unit tests and integration suites using `npx tsx --test`.
   - Run production builds on server (`npm run build`) and client (`npm run build`).

6. **Phase 6: Structured Completion Report**
   - Report completed vs. deferred items.
   - List files created and modified.
   - Provide exact test output and build outcomes.
   - State remaining production prerequisites and final verdict.

---

## 2. Reusable Prompt Template for AI Agents

When prompting an autonomous agent on Freelancr tasks, use this standard template:

```markdown
# TASK: [Short Descriptive Title]

## 1. Context & Scope
- Working inside: Freelancr Freelancer Marketplace
- Target PRD: docs/prd/[XX_PRD_NAME.md]
- Bound scope: [Specific feature/subsystem to implement]

## 2. Operating Constraints
- Follow .agents/rules/AGENT_OPERATING_RULES.md and ARCHITECTURE_GUARDRAILS.md.
- Strict layering: Controller -> Service -> Repository -> Model.
- Zero destructive Git operations. Preserve all existing working tree edits.
- Never trust client-supplied status, amount, or userId. Derive identity strictly from JWT auth context.
- Exclude sensitive fields (-password, -refreshToken, -passwordResetToken) from projections.
- No direct external SDK calls from React client (Cloudinary, Razorpay).

## 3. Mandatory Output
1. Pre-Change Manifest
2. Incremental implementation
3. Exact test and build commands run with outputs
4. Structured Completion Report with Final Verdict
```
