# Freelancr — Security Gaps & Vulnerability Analysis

> **Target Baseline Reference:** [PRD 03 — Security, RBAC & Cybersecurity Hardening](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/docs/prd/03_PRD_SECURITY_RBAC_CYBERSECURITY.md)
> **Status:** Strictly Read-Only Audit. No code modified.

---

## 1. Authentication & Session Security Gaps

### 1.1 Access Token Storage in `localStorage`
- **Location:** [client/src/lib/axios.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/axios.ts), [client/src/store/slices/authSlice.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/store/slices/authSlice.ts).
- **Vulnerability:** JWT access tokens are stored in browser `localStorage`. Any Cross-Site Scripting (XSS) vulnerability or malicious third-party script can read the token directly.
- **Current Mitigation:** Short expiration (15 minutes).
- **Target Architecture (PRD 03):** Consider storing tokens in memory with HttpOnly cookies or secure worker storage.

### 1.2 Access Token Invalidation on Logout
- **Location:** [server/src/modules/auth/auth.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/auth/auth.service.ts) line 125 (`logout`).
- **Vulnerability:** `AuthService.logout` clears `user.refreshToken = ""` in MongoDB and clears the refresh cookie. However, because access tokens are stateless JWTs and no token denylist exists, the issued access token remains cryptographically valid until its 15-minute expiration time.

### 1.3 Missing Response 401 Interceptor (Silent Session Expiration)
- **Location:** [client/src/lib/axios.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/client/src/lib/axios.ts).
- **Vulnerability:** When the 15-minute access token expires, Axios has no response interceptor to intercept `401 Unauthorized` and call `POST /api/v1/auth/refresh`. As a result, users are abruptly blocked from performing actions without session re-hydration.

### 1.4 Hardcoded Token Expiration in Code
- **Location:** [server/src/utils/jwt.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/utils/jwt.ts) lines 5 and 11.
- **Code:**
  ```typescript
  expiresIn: "15m" // Hardcoded in generateAccessToken
  expiresIn: "7d"  // Hardcoded in generateRefreshToken
  ```
  Environment variables `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` documented in [PROJECT_STRUCTURE.md](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/PROJECT_STRUCTURE.md) are ignored.

---

## 2. Authorization & RBAC Gaps

### 2.1 Missing Role Guard on Job Creation (High Severity)
- **Location:** [server/src/modules/jobs/job.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/jobs/job.routes.ts) line 12.
- **Code:**
  ```typescript
  router.post(
    "/",
    authenticate,
    createJobValidation,
    validate,
    JobController.createJob
  );
  ```
- **Vulnerability:** Missing `authorize("client")`. Any authenticated user—including users registered as `freelancer` or `admin`—can submit job postings.
- **Classification:** **Security issue**.

### 2.2 Public Unauthenticated & Unbounded User Directory
- **Location:** [server/src/modules/users/user.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.routes.ts) line 30.
- **Code:**
  ```typescript
  router.get("/", UserController.getAllUsers);
  ```
- **Vulnerability:** Completely public endpoint with no authentication and no pagination. Returns the entire user database table (`fullName`, `username`, `role`, `avatar`, `bio`, `location`, `skills`, `resume`, `portfolio`) sorted by `createdAt: -1`.
- **Classification:** **Security issue / Privacy leak**.

### 2.3 DELETE Request with Body Parameter
- **Location:** [server/src/modules/users/user.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.routes.ts) line 53, [user.controller.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.controller.ts) line 131.
- **Code:**
  ```typescript
  router.delete("/portfolio", authenticate, UserController.removePortfolio);
  // Controller: UserService.removePortfolio(req.user!.id, req.body.publicId);
  ```
- **Vulnerability:** Reading `req.body` in HTTP `DELETE` requests is contrary to standard HTTP semantics. Many reverse proxies, load balancers, and CDN firewalls drop request bodies on DELETE methods, causing requests to fail or hang.

---

## 3. Rate Limiting & Denial-of-Service Gaps

### 3.1 Narrow Rate Limiter Coverage
- **Location:** [server/src/middleware/rateLimit.middleware.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/middleware/rateLimit.middleware.ts).
- **Current Coverage:** Only two endpoints have rate limiters applied:
  1. `POST /api/v1/auth/register` and `POST /api/v1/auth/login` (`authRateLimiter`: 10 requests per 15 min).
  2. `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` (`passwordResetRateLimiter`: 5 requests per 15 min).
- **Missing Rate Limiters:**
  - `POST /api/v1/chat` (Chat spam DoS).
  - `POST /api/v1/jobs` (Job spamming).
  - `POST /api/v1/proposals` (Bid spamming).
  - `POST /api/v1/payments/create-order` (Razorpay order flood).
  - `POST /api/v1/upload` (Cloudinary quota exhaustion).
  - `GET /api/v1/jobs/search` (Expensive regex queries).

### 3.2 Heap Memory Exhaustion via `multer.memoryStorage()`
- **Location:** [server/src/modules/uploads/multer.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/uploads/multer.ts).
- **Vulnerability:** Files are loaded into Node.js buffer memory before streaming to Cloudinary. With a 10MB limit per file, 50 concurrent file uploads consume 500MB+ of Node.js V8 heap memory, risking Out-Of-Memory process termination.

---

## 4. Query Injection & Parameter Handling Risks

### 4.1 Unhandled Undefined Keyword in Job Search
- **Location:** [server/src/modules/jobs/job.controller.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/jobs/job.controller.ts) line 74 and [job.service.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/jobs/job.service.ts) line 121.
- **Code:**
  ```typescript
  static async searchJobs(keyword: string) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return JobRepository.search(escapedKeyword);
  }
  ```
- **Risk:** If a client requests `GET /api/v1/jobs/search` without a `keyword` query parameter, `keyword` is `undefined`. Calling `.replace()` on `undefined` causes an unhandled `TypeError` crashing into 500 Internal Server Error.

---

## 5. File Upload Security & Orphaned Assets

### 5.1 Unattached Cloudinary File Uploads
- **Location:** [server/src/modules/uploads/upload.routes.ts](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/uploads/upload.routes.ts).
- **Vulnerability:**
  - `POST /api/v1/upload` accepts any file and uploads it to the public `freelancr` folder in Cloudinary.
  - The endpoint does not associate the file with any User, Job, Proposal, or Contract.
  - `DELETE /api/v1/upload/:publicId` only permits deletion if the public ID matches `user.resumePublicId` or is in `user.portfolio`.
  - Therefore, any asset uploaded via `POST /api/v1/upload` can **never be deleted via API**, leaving permanent orphaned assets on Cloudinary.

---

## 6. Audit Logging Gaps (PRD 03 & PRD 09)

- **Current State:** There is **no audit logging mechanism** anywhere in the backend.
- **Privileged Actions Not Audited:**
  - Admin banning or activating user accounts (`PATCH /api/v1/admin/users/:id/status`).
  - Admin verifying user accounts (`PATCH /api/v1/admin/users/:id/verify`).
  - Admin deleting user accounts (`DELETE /api/v1/admin/users/:id`).
  - Admin overriding job status (`PATCH /api/v1/admin/jobs/:id/status`).
  - Admin deleting jobs (`DELETE /api/v1/admin/jobs/:id`).
  - Client refunds issued (`PATCH /api/v1/payments/refund/:id`).
  - Proposal accepted and contract created (`POST /api/v1/contracts`).
  - Contract completion or cancellation.
