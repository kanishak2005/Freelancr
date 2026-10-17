# Freelancr — Networking & Communication Gaps Analysis

> **Target Baseline Reference:** [PRD 02 — Target Architecture, Networking & Integration Boundaries](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/docs/prd/02_PRD_TARGET_ARCHITECTURE_NETWORKING.md)
> **Status:** Strictly Read-Only Audit. No code modified.

---

## 1. HTTP & Axios Client Analysis

### 1.1 Single Axios Instance Compliance
- **Rule (PRD 02):** Exactly one configured Axios client in [client/src/lib/axios.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/axios.ts).
- **Audit Finding:** **COMPLIANT**. Only one Axios client instance is created. All service modules import `api` from `../lib/axios`.

### 1.2 Axios Configuration Deficiencies
While single-instance compliance is met, the Axios configuration in [client/src/lib/axios.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/axios.ts) exhibits multiple production networking deficiencies:
1. **Missing Request Timeout:**
   `axios.create({ ... })` defines no `timeout`. Under poor network conditions or backend hangs, HTTP requests will wait indefinitely, leading to frozen UI loading states.
2. **Missing 401 Refresh Interceptor:**
   There is no response error interceptor. When an access token expires (15 min), subsequent requests return HTTP 401 and fail immediately. No automated refresh token rotation via `POST /api/v1/auth/refresh` occurs.
3. **Missing Correlation / Request ID Header:**
   The client does not generate or propagate an `X-Request-ID` or `X-Correlation-ID` header. Distributed traces cannot be linked between client logs, server logs, and external gateways.
4. **Missing Error Normalization:**
   Errors are rejected raw (`Promise.reject(error)`), requiring every component to individually inspect `error.response?.data?.message` with fallbacks.

### 1.3 Direct API Calls in UI Components
- **Rule (PRD 02):** No Axios or API construction inside components; all calls must flow through typed services.
- **Violation Found:**
  - In [client/src/components/payment/RazorpayCheckout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/payment/RazorpayCheckout.tsx) lines 49-54:
    ```typescript
    const response = await api.post("/payments/create-order", {
      contract: contractId,
    });
    ```
  - The payment module is the only domain that lacks a dedicated client service file (`client/src/services/payments.api.ts`).

### 1.4 Search Request Cancellation (AbortController)
- In [client/src/pages/JobsPage.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/pages/JobsPage.tsx), the search handler triggers `searchJobs(keyword)` without an `AbortController`.
- If a user types multiple keystrokes or clicks search rapidly, previous pending HTTP requests are not cancelled, leading to race conditions where older responses can overwrite newer search results.

---

## 2. Socket.IO Lifecycle & Real-Time Architecture

### 2.1 Client Connection & Reconnection Lifecycle
- **Implementation:** [client/src/lib/socket.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/socket.ts) and [client/src/components/common/SocketProvider.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/components/common/SocketProvider.tsx).
- **Gaps Identified:**
  1. **Lifecycle Decoupled from Redux Auth:**
     `SocketProvider.tsx` runs `useEffect` only once on mount (`[]`). If an unauthenticated user loads the page and logs in, the socket **does not connect** until the user manually refreshes the browser page.
  2. **Zombie Socket on Logout:**
     In [MainLayout.tsx](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/layouts/MainLayout.tsx) line 26 (`handleLogout`), `localStorage.removeItem("accessToken")` and `dispatch(clearCredentials())` are executed, but `socket.disconnect()` is **never called**. The WebSocket connection remains active and authenticated on the server as the previous user.
  3. **No Reconnect Reconciliation:**
     If network drops and reconnects, client does not fetch missed messages or reconcile unread notification counts.

### 2.2 Server Socket Clustering & Namespacing
- **Implementation:** [server/src/services/socket.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/services/socket.service.ts) and [server/src/config/socket.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/config/socket.ts).
- **Gaps Identified:**
  1. **Single-Process In-Memory State:**
     The server uses `let io: Server;` without a Redis adapter (`@socket.io/redis-adapter`). In a multi-container or clustered deployment (e.g., AWS ECS, Kubernetes), emitting `io.to("user:" + recipientId)` only delivers events to clients connected to that exact Node.js process. Counterparties connected to another instance will never receive the message or notification.
  2. **Legacy Event Names vs Target Spec:**
     Current events use raw snake_case strings (`new_message`, `send_message`, `message_read`) instead of namespaced domain events recommended in PRD 02 (`chat.message.created`, `notification.created`, `contract.updated`).

---

## 3. Unbounded List Endpoints & Pagination Gaps

Unbounded endpoints return entire database collections without `limit` or `skip`, posing severe memory and latency risks as data grows:

| Endpoint | Repository Method | Current Query | Risk Level |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/jobs` | `JobRepository.findAll()` | `Job.find().populate("client", ...)` | **Critical** (Dumps entire job catalog) |
| `GET /api/v1/jobs/search` | `JobRepository.search()` | `Job.find({ $or: [...] }).populate(...)` | **High** (Dumps all search matches) |
| `GET /api/v1/jobs/filter` | `JobRepository.filter()` | `Job.find(filters).populate(...)` | **High** (Dumps all filter matches) |
| `GET /api/v1/jobs/my-jobs` | `JobRepository.findByClient()` | `Job.find({ client: clientId })` | **Medium** (Unbounded per user) |
| `GET /api/v1/users` | `UserRepository.findAll()` | `User.find().select(...)` | **Critical** (Publicly dumps all users) |
| `GET /api/v1/proposals/my` | `ProposalRepository.findByFreelancer()` | `Proposal.find({ freelancer }).populate(...)` | **Medium** (Unbounded per freelancer) |
| `GET /api/v1/proposals/job/:jobId` | `ProposalRepository.findByJob()` | `Proposal.find({ job: jobId }).populate(...)` | **High** (Popular jobs dump all bids) |
| `GET /api/v1/contracts` | `ContractRepository.findAllByUser()` | `Contract.find({ $or: [...] }).populate(...)` | **High** (Loads all contracts with 3 nested populates) |
| `GET /api/v1/payments/my-payments` | `PaymentRepository.findByUser()` | `Payment.find({ $or: [...] }).populate(...)` | **Medium** (Unbounded payment history) |
| `GET /api/v1/chat/conversation/:userId`| `ChatRepository.getConversation()` | `Chat.find({ $or: [...] }).populate(...)` | **Critical** (Loads entire lifetime chat history) |
| `GET /api/v1/reviews/user/:userId` | `ReviewRepository.findByReviewee()` | `Review.find({ reviewee }).populate(...)` | **Medium** (Unbounded reviews list) |
| `GET /api/v1/reviews/job/:jobId` | `ReviewRepository.findByJob()` | `Review.find({ job }).populate(...)` | **Low** |
| `GET /api/v1/reviews/contract/:contractId`| `ReviewRepository.findByContract()` | `Review.find({ contract }).populate(...)`| **Low** |

---

## 4. Multi-Instance State Barriers Summary

To deploy Freelancr across multiple instances or containers, the following 3 process-memory dependencies must be refactored:
1. **Socket.IO:** Transition from local memory to Redis/Mongo pub-sub adapter.
2. **Rate Limiting:** Transition from `express-rate-limit` `MemoryStore` to Redis/Key-Value store.
3. **File Uploads:** Replace memory buffer streaming with disk temp files or direct signed Cloudinary uploads.
