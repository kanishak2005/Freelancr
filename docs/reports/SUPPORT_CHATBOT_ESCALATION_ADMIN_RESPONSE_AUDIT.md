# FREELANCR — SUPPORT CHATBOT
## Support Escalation & Admin Response Workflow Audit Report

**Execution Mode:** STRICT READ-ONLY DEFECT INVESTIGATION  
**Repository Working Directory:** `C:\Users\hp\OneDrive\Desktop\Freelancr`  
**Current Branch:** `main`  
**Current HEAD:** `96143af53453c2c2bdfa942b6e0465b935cd8a4d`  
**Date:** 2026-11-22  

---

### EXECUTIVE SUMMARY

This audit traces the complete support escalation lifecycle:
`Chatbot → Escalation API → Database → Admin Questions List → Admin Question Details → Admin Response Submission → User Response`

We have identified the **exact root causes** for all three observed production defects:
1. **User complaints appear as `Marketplace question`:** In `client/src/components/chatbot/FloatingChatbot.tsx` (lines 270–275), the escalation button passes `msg.answer?.canonicalQuestion || query || "Marketplace question"`. Because `query` is cleared upon message dispatch (`setQuery("")`), and unanswered questions have `msg.answer.canonicalQuestion = undefined`, the code falls back directly to the string literal `"Marketplace question"`. Furthermore, user complaints are routed to the FAQ escalation queue rather than the ticket support desk.
2. **The actual submitted question or complaint text is missing/not displayed:** The user's actual question was discarded on the frontend because of the bug described above; instead of passing the user's prompt (or `msg.text`), it passed the literal string `"Marketplace question"`.
3. **The admin cannot submit an answer successfully:** In `AdminChatbotQuestionsPage.tsx`, the button is titled `+ Convert to FAQ` and redirects to `/admin/knowledge-base`. On that page, `AdminKnowledgeBasePage.tsx` expects lowercase backend enum categories (`"general"`, `"support"`, etc.), but the frontend hardcodes capitalized display labels (`"General"`, `"Account & Security"`, `"Billing & Escrow"`, etc.). The backend validator strictly rejects non-matching category enums (`isIn([...])`), throwing HTTP 400. In addition, there is no direct reply delivery route from Chatbot Escalations back to the user's chat window.

---

### 1. INVESTIGATION AREA A: CHATBOT CLASSIFICATION & ESCALATION TRIGGER

#### Sourced Root Cause:
In [client/src/components/chatbot/FloatingChatbot.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/chatbot/FloatingChatbot.tsx#L52-L75):
```typescript
const handleSend = async (textToSend?: string) => {
  const questionText = (textToSend || query).trim();
  if (!questionText) return;

  const newMessages: ChatMessage[] = [
    ...messages,
    { id: userMsgId, sender: "user", text: questionText, timestamp: new Date() },
  ];

  setMessages(newMessages);
  if (!textToSend) setQuery(""); // <-- HERE: query is erased from component state
```
When the bot fails to find a match, lines 264–286 render the escalation banner:
```typescript
{msg.answer && (!msg.answer.answered || msg.answer.confidence < 0.65 || msg.answer.canEscalate) && (
  <button
    onClick={() =>
      handleEscalate(
        msg.answer?.canonicalQuestion || query || "Marketplace question",
        msg.answer?.category
      )
    }
```
**Why the user's actual complaint is replaced by "Marketplace question":**
- `msg.answer?.canonicalQuestion` is undefined for unanswered queries.
- `query` was already set to `""` in `handleSend`.
- The ternary evaluation falls through to the hardcoded default string: `"Marketplace question"`.
- The user's actual question (`messages[messages.length - 2].text` or the preceding user message) is never passed.
- The `category` passed is `msg.answer?.category` (which is also undefined for unanswered queries), so it defaults to `"general"`.

---

### 2. INVESTIGATION AREA B: BACKEND ESCALATION PERSISTENCE

#### Sourced Execution Path:
1. **Frontend Call:** `knowledgeApi.escalateQuestion(question, category)` $\to$ `POST /api/v1/knowledge/chatbot/escalate`.
2. **Route Definition:** [server/src/modules/knowledge/knowledgeBase.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/knowledge/knowledgeBase.routes.ts#L26-L38):
   - Validates `body("question")` (1–500 chars).
   - Validates `body("category").optional().isString()`.
   - **Crucial Finding:** The endpoint does **not** have an authentication middleware (`authenticate` or `optionalAuthenticate`) attached to the route!
3. **Controller:** [server/src/modules/knowledge/knowledgeBase.controller.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/knowledge/knowledgeBase.controller.ts#L30-L43):
   ```typescript
   static async escalateQuestion(req: Request, res: Response) {
     const authReq = req as AuthRequest;
     const userId = authReq.user?.id;
     const userRole = authReq.user?.role;
   ```
   Because `optionalAuthenticate` is missing from the route in `knowledgeBase.routes.ts`, `authReq.user` is always `undefined`. As a result, all escalations are persisted with `user: undefined` and `userRole: "anonymous"`, even when the user is logged into their account!
4. **Service & Model:** [server/src/modules/knowledge/knowledgeBase.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/knowledge/knowledgeBase.service.ts#L75-L83) saves into `ChatbotEscalation`:
   ```typescript
   question: "Marketplace question" // (received from buggy frontend)
   normalizedQuestion: "marketplace question"
   category: "general"
   userRole: "anonymous"
   status: "pending"
   ```

---

### 3. INVESTIGATION AREA C: ADMIN DASHBOARD PRESENTATION

#### Page: [client/src/pages/AdminChatbotQuestionsPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/AdminChatbotQuestionsPage.tsx)
- The page fetches escalations via `GET /api/v1/knowledge/admin/escalations`.
- Lines 146–151 render:
  ```tsx
  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
      User Question:
    </span>
    <p className="text-base font-semibold text-slate-900">{item.question}</p>
  </div>
  ```
- Because `item.question` in MongoDB contains `"Marketplace question"` (due to Area A), the admin literally sees `"Marketplace question"` instead of the user's inquiry.
- User contact line 138–142 shows `Anonymous / Unspecified` because `user` is undefined (due to Area B missing `optionalAuthenticate`).

---

### 4. INVESTIGATION AREA D: ADMIN RESPONSE WORKFLOW FAILURE

#### Sourced Root Cause:
When an admin clicks `+ Convert to FAQ` on `AdminChatbotQuestionsPage.tsx` (lines 52–57):
```typescript
const handleConvertToFaq = (escalation: ChatbotEscalationItem) => {
  navigate("/admin/knowledge-base", {
    state: { prefillQuestion: escalation.question },
  });
};
```
1. **Redirect to Admin Knowledge Base:** The admin is navigated to `/admin/knowledge-base`.
2. **Category Enum Mismatch:**
   - In [client/src/pages/AdminKnowledgeBasePage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/AdminKnowledgeBasePage.tsx#L10-L19):
     ```typescript
     const CATEGORIES = [
       "General",
       "Account & Security",
       "Billing & Escrow",
       "Contracts & Milestones",
       "Jobs & Proposals",
       "Freelancer Guide",
       "Client Guide",
       "Platform Policies",
     ];
     ```
   - In [server/src/modules/knowledge/knowledgeBase.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/knowledge/knowledgeBase.routes.ts#L74-L86):
     ```typescript
     body("category").optional().isIn([
       "general", "registration", "onboarding", "profile",
       "jobs", "proposals", "contracts", "payments", "messages", "support"
     ])
     ```
   - In `knowledgeBase.model.ts` (lines 58–71), the Mongoose schema strictly enforces lowercase keys:
     `enum: ["general", "registration", "onboarding", "profile", "jobs", "proposals", "contracts", "payments", "messages", "support"]`.
   - **Why Submission Fails:**
     When the admin selects `"General"`, `"Account & Security"`, or any UI category and clicks "Create FAQ Entry", the frontend sends the capitalized string (e.g. `{ category: "General" }`). Express-validator rejects this with `400 Bad Request: "Invalid category"`. Mongoose would also throw a validation error. The UI displays `"Failed to save FAQ entry"`.
3. **No Direct User Response Mechanism:**
   - `ChatbotEscalation` was designed as an internal FAQ ingestion queue, not a bidirectional support ticketing system.
   - For real complaints/support inquiries, Freelancr has a full Support Desk module (`/admin/support` and `SupportTicket`), which supports threaded replies and user notifications.
   - Chatbot escalations do not currently create a `SupportTicket` or notify the user when an admin reviews or responds to the escalation.

---

### 5. SECURITY AND PRODUCT BOUNDARIES

| Security / Product Boundary | Assessment | Status | Evidence / Notes |
| :--- | :--- | :---: | :--- |
| **Admin Authorization** | RBAC verification on admin routes | **PASS** | `/admin/entries` and `/admin/escalations` are protected by `authenticate` and `authorize("admin")`. |
| **User Data Isolation** | User inquiry exposure | **PASS** | Chatbot escalation questions are only viewable by admins in `/admin/chatbot-questions`. Non-admin users cannot access the escalation list. |
| **Local Knowledge-Base Guarantee** | Completely local FAQ lookup | **PASS** | `localMatcher.ts` performs deterministic token and Jaccard scoring. No external OpenAI, Anthropic, or external API costs are incurred. |
| **Caller Identity Preservation** | User attribution on escalations | **FAIL** | `optionalAuthenticate` is missing from `POST /chatbot/escalate`, stripping authenticated user ID and role. |
| **Category Synchronization** | Frontend $\leftrightarrow$ Backend enum contract | **FAIL** | Frontend sends capitalized labels (`"General"`), backend requires lowercase enum (`"general"`). |

---

### 6. COMPLETE AFFECTED FILE AND API ENDPOINT LIST

#### Frontend Files:
1. `client/src/components/chatbot/FloatingChatbot.tsx`
   - Line 272: Buggy question fallback (`msg.answer?.canonicalQuestion || query || "Marketplace question"`).
2. `client/src/pages/AdminKnowledgeBasePage.tsx`
   - Lines 10–19 & 42: `CATEGORIES` array uses incompatible capitalized strings instead of the supported backend enum values.
3. `client/src/pages/AdminChatbotQuestionsPage.tsx`
   - Lines 160–197: Does not link back to create a Support Ticket or notify the user.

#### Backend Files:
1. `server/src/modules/knowledge/knowledgeBase.routes.ts`
   - Line 27: Missing `optionalAuthenticate` on `POST /chatbot/escalate`.
   - Lines 72–86 & 106–120: Category validation rejects valid category inputs if case is not handled or mapped.
2. `server/src/modules/knowledge/knowledgeBase.service.ts`
   - Category normalization (lowercase) before persistence.

---

### 7. VERIFICATION MATRIX (AUDIT FINDINGS)

| Audit Item | Current System Behavior | Status |
| :--- | :--- | :---: |
| **Chatbot Escalation User Message Retention** | Replaced with `"Marketplace question"` due to cleared state in `FloatingChatbot.tsx` | **FAIL** |
| **Chatbot Escalation User ID Retention** | Dropped because `optionalAuthenticate` is missing from route | **FAIL** |
| **Admin Response / FAQ Creation** | Rejects submission with 400 due to Category enum case mismatch | **FAIL** |
| **Admin Escalation Queue Authentication** | Properly guarded by `authenticate` and `authorize("admin")` | **PASS** |
| **Local Deterministic Chatbot Matching** | Completely local, offline, deterministic scoring in `localMatcher.ts` | **PASS** |
| **Chatbot Suggested Questions** | Returns 6 published FAQs without server error | **PASS** |

---

### 8. RECOMMENDED MINIMAL REMEDIATION PLAN (NO CODE MODIFIED)

#### Phase 1: Chatbot Frontend Fix (`FloatingChatbot.tsx`)
1. In `FloatingChatbot.tsx`, store the original question in the bot's message state or preserve the user's prompt text in `ChatMessage` (e.g. `userQuery: questionText`).
2. Update `handleEscalate` call to pass `msg.userQuery || (previousUserMessage?.text)` instead of `msg.answer?.canonicalQuestion || query || "Marketplace question"`.

#### Phase 2: Backend Escalation Identity Attribution (`knowledgeBase.routes.ts` & `knowledgeBase.service.ts`)
1. In `knowledgeBase.routes.ts`, add `optionalAuthenticate` to `router.post("/chatbot/escalate", optionalAuthenticate, ...)`.
2. In `knowledgeBase.service.ts`, normalize `category` to lowercase (`(params.category || "general").toLowerCase()`).

#### Phase 3: Admin Knowledge Base Category Normalization (`AdminKnowledgeBasePage.tsx`)
1. In `AdminKnowledgeBasePage.tsx`, map UI category display names to the exact backend enum values (`"general"`, `"contracts"`, `"payments"`, `"support"`, etc.) before submitting to `knowledgeApi.createEntry` and `knowledgeApi.updateEntry`.

#### Phase 4: Support Escalation Integration (Optional UX Improvement)
1. For general support inquiries or complaints, allow the chatbot to optionally create a `SupportTicket` via `supportApi.createTicket` so the user and admin can exchange threaded messages in the Support Desk.
