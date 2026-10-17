# Freelancr API v1 — Routes Baseline

> **Generated:** Baseline Capture for PRD 01  
> **Base URL:** `/api/v1`  
> **Source files:** `server/src/app.ts`, `server/src/modules/**/*.routes.ts`

---

## 1. Global & Infrastructure Routes

| Method | Path | Auth | Roles | Middleware / Limiters | Description | Response Shape |
|---|---|---|---|---|---|---|
| `GET` | `/` | Public | None | `morgan`, `helmet`, `cors` | Root welcome endpoint | `{ success: true, message: string, documentation: string, version: string }` (200) |
| `GET` | `/api/v1/health` | Public | None | `morgan`, `helmet`, `cors` | Basic health check | `{ success: true, message: string, version: string }` (200) |

> **Critical Middleware Ordering Note:**  
> `/api/v1/payments/webhook` is registered in `app.ts` with `express.raw({ type: "application/json" })` **before** the global `express.json({ limit: "10mb" })` middleware. This preserves the raw Buffer required for Razorpay HMAC-SHA256 signature verification.

---

## 2. Authentication Routes (`/api/v1/auth`)

Mounted in `server/src/app.ts` under `/api/v1/auth`. Handled by `server/src/modules/auth/auth.routes.ts`.

| Method | Path | Auth | Roles | Validators & Rate Limits | Request Body / Params | Expected Response Shape |
|---|---|---|---|---|---|---|
| `POST` | `/register` | Public | None | `authRateLimiter`, `registerValidation`, `validate` | `{ fullName, username, email, password, role? }` | `{ success: true, message: string, data: { user, accessToken } }` (201) + `refreshToken` httpOnly cookie |
| `POST` | `/login` | Public | None | `authRateLimiter`, `loginValidation`, `validate` | `{ email, password }` | `{ success: true, message: string, data: { user, accessToken } }` (200) + `refreshToken` httpOnly cookie |
| `GET` | `/me` | Auth | Any | `authenticate` | None (Bearer token) | `{ success: true, data: { user } }` (200) |
| `POST` | `/logout` | Auth | Any | `authenticate` | None | `{ success: true, message: string }` (200) + clears `refreshToken` cookie |
| `POST` | `/refresh` | Public | None | Reads `refreshToken` cookie | Cookie: `refreshToken` | `{ success: true, data: { accessToken } }` (200) |
| `PATCH` | `/change-password` | Auth | Any | `authenticate`, `changePasswordValidation`, `validate` | `{ oldPassword, newPassword }` | `{ success: true, message: string }` (200) |
| `POST` | `/forgot-password` | Public | None | `passwordResetRateLimiter`, `forgotPasswordValidation`, `validate` | `{ email }` | `{ success: true, message: string }` (200) |
| `POST` | `/reset-password` | Public | None | `passwordResetRateLimiter`, `resetPasswordValidation`, `validate` | `{ token, password }` | `{ success: true, message: string }` (200) |

---

## 3. Users Routes (`/api/v1/users`)

Mounted in `server/src/app.ts` under `/api/v1/users`. Handled by `server/src/modules/users/user.routes.ts`.

| Method | Path | Auth | Roles | Validators / Multer | Expected Response Shape |
|---|---|---|---|---|---|
| `GET` | `/profile` | Auth | Any | `authenticate` | `{ success: true, data: user }` (200) |
| `PATCH` | `/profile` | Auth | Any | `authenticate`, `updateProfileValidation`, `validate` | `{ success: true, message: string, data: user }` (200) |
| `GET` | `/:username` | Public | None | None | `{ success: true, data: user }` (200) |
| `GET` | `/` | Public | None | Query: `role`, `skills`, `search`, `page`, `limit` | `{ success: true, data: { users, pagination } }` (200) |
| `DELETE` | `/me` | Auth | Any | `authenticate` | `{ success: true, message: string }` (200) |
| `POST` | `/resume` | Auth | Any | `authenticate`, `resumeUpload.single("resume")` (max 10MB PDF) | `{ success: true, message: string, data: { resumeUrl, publicId } }` (200) |
| `POST` | `/portfolio` | Auth | Any | `authenticate`, `upload.single("image")` (max 10MB image) | `{ success: true, message: string, data: portfolioItem }` (201) |
| `DELETE` | `/portfolio` | Auth | Any | `authenticate` (Body: `{ publicId }`) | `{ success: true, message: string }` (200) |

> **Route Ordering Note:**  
> `GET /profile` is declared before `GET /:username` to prevent route shadowing of the profile endpoint.

---

## 4. Jobs Routes (`/api/v1/jobs`)

Mounted in `server/src/app.ts` under `/api/v1/jobs`. Handled by `server/src/modules/jobs/job.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | Client/Any | `authenticate`, `createJobValidation`, `validate` | `{ success: true, message: string, data: job }` (201) |
| `PATCH` | `/:id` | Auth | Job Owner | `authenticate`, `updateJobValidation`, `validate` | `{ success: true, message: string, data: job }` (200) |
| `DELETE` | `/:id` | Auth | Job Owner | `authenticate` | `{ success: true, message: string }` (200) |
| `GET` | `/my-jobs` | Auth | Client | `authenticate` | `{ success: true, data: jobs }` (200) |
| `GET` | `/search` | Public | None | Query: `q`, `category`, `page`, `limit` | `{ success: true, data: { jobs, pagination } }` (200) |
| `GET` | `/filter` | Public | None | Query: `category`, `experienceLevel`, `budgetType`, `minBudget`, `maxBudget` | `{ success: true, data: { jobs, pagination } }` (200) |
| `GET` | `/:id` | Public | None | None | `{ success: true, data: job }` (200) |
| `GET` | `/` | Public | None | Query: `page`, `limit`, `category`, `status` | `{ success: true, data: { jobs, pagination } }` (200) |

> **Route Ordering Note:**  
> `GET /my-jobs`, `GET /search`, and `GET /filter` are registered before `GET /:id` to ensure literal paths take precedence over the `:id` parameter.

---

## 5. Proposals Routes (`/api/v1/proposals`)

Mounted in `server/src/app.ts` under `/api/v1/proposals`. Handled by `server/src/modules/proposals/proposal.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | `freelancer` | `authenticate`, `authorize("freelancer")`, `applyProposalValidation`, `validate` | `{ success: true, message: string, data: proposal }` (201) |
| `GET` | `/my` | Auth | `freelancer` | `authenticate`, `authorize("freelancer")` | `{ success: true, data: proposals }` (200) |
| `GET` | `/job/:jobId` | Auth | `client`, `admin` | `authenticate`, `authorize("client", "admin")` | `{ success: true, data: proposals }` (200) |
| `GET` | `/:id` | Auth | `client`, `freelancer`, `admin` | `authenticate`, `authorize("client", "freelancer", "admin")` | `{ success: true, data: proposal }` (200) |
| `PATCH` | `/:id` | Auth | `freelancer` (Owner) | `authenticate`, `authorize("freelancer")`, `updateProposalValidation`, `validate` | `{ success: true, message: string, data: proposal }` (200) |
| `DELETE` | `/:id` | Auth | `freelancer` (Owner) | `authenticate`, `authorize("freelancer")` | `{ success: true, message: string }` (200) |

---

## 6. Contracts Routes (`/api/v1/contracts`)

Mounted in `server/src/app.ts` under `/api/v1/contracts`. Handled by `server/src/modules/contracts/contract.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | `client` | `authenticate`, `authorize("client")`, `createContractValidation`, `validate` | `{ success: true, message: string, data: contract }` (201) |
| `GET` | `/` | Auth | Any party | `authenticate` | `{ success: true, data: contracts }` (200) |
| `GET` | `/:id` | Auth | Client / Freelancer / Admin | `authenticate` | `{ success: true, data: contract }` (200) |
| `PATCH` | `/:id/complete` | Auth | `client` (Contract client) | `authenticate`, `authorize("client")` | `{ success: true, message: string, data: contract }` (200) |
| `PATCH` | `/:id/cancel` | Auth | `client`, `freelancer` | `authenticate`, `authorize("client", "freelancer")` | `{ success: true, message: string, data: contract }` (200) |

---

## 7. Payments Routes (`/api/v1/payments`)

Mounted in `server/src/app.ts` under `/api/v1/payments` + webhook on `app`. Handled by `server/src/modules/payments/payment.routes.ts` & `payment.controller.ts`.

| Method | Path | Auth | Roles | Validators / Payload | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/api/v1/payments/webhook` | Signature-verified | Razorpay | `express.raw({ type: "application/json" })`, HMAC SHA-256 header `x-razorpay-signature` | `{ status: "ok" }` (200) |
| `POST` | `/create-order` | Auth | `client` | `authenticate`, `createOrderValidation`, `validate` (Body: `{ contractId }`) | `{ success: true, message: string, data: { payment, order } }` (201) |
| `POST` | `/verify` | Auth | `client` | `authenticate`, `verifyPaymentValidation`, `validate` (Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`) | `{ success: true, message: string, data: { payment } }` (200) |
| `GET` | `/my-payments` | Auth | Any party | `authenticate` | `{ success: true, data: payments }` (200) |
| `GET` | `/:id` | Auth | Client / Freelancer | `authenticate` | `{ success: true, data: payment }` (200) |
| `PATCH` | `/refund/:id` | Auth | `client` | `authenticate`, `refundValidation`, `validate` (Body: `{ amount? }`) | `{ success: true, message: string, data: { payment } }` (200) |

---

## 8. Reviews Routes (`/api/v1/reviews`)

Mounted in `server/src/app.ts` under `/api/v1/reviews`. Handled by `server/src/modules/reviews/review.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | Contract participant | `authenticate`, `createReviewValidation`, `validate` | `{ success: true, message: string, data: review }` (201) |
| `GET` | `/user/:userId` | Public | None | None | `{ success: true, data: reviews }` (200) |
| `GET` | `/job/:jobId` | Public | None | None | `{ success: true, data: reviews }` (200) |
| `GET` | `/contract/:contractId` | Auth | Any | `authenticate` | `{ success: true, data: reviews }` (200) |
| `GET` | `/:id` | Public | None | None | `{ success: true, data: review }` (200) |

---

## 9. Chat Routes (`/api/v1/chat`)

Mounted in `server/src/app.ts` under `/api/v1/chat`. Handled by `server/src/modules/chat/chat.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | Any | `authenticate`, `sendMessageValidation`, `validate` (Body: `{ receiver, message, attachments? }`) | `{ success: true, message: string, data: chatMessage }` (201) |
| `GET` | `/conversation/:userId` | Auth | Participant | `authenticate` | `{ success: true, data: messages }` (200) |
| `GET` | `/:id` | Auth | Participant | `authenticate` | `{ success: true, data: message }` (200) |
| `DELETE` | `/:id` | Auth | Sender | `authenticate` | `{ success: true, message: string }` (200) |

---

## 10. Upload Routes (`/api/v1/upload`)

Mounted in `server/src/app.ts` under `/api/v1/upload`. Handled by `server/src/modules/uploads/upload.routes.ts`.

| Method | Path | Auth | Roles | Multer Filter | Expected Response Shape |
|---|---|---|---|---|---|
| `POST` | `/` | Auth | Any | `authenticate`, `upload.single("file")` (Images: JPG, PNG, WEBP; max 10MB) | `{ success: true, message: string, data: { url, publicId } }` (200) |
| `DELETE` | `/:publicId` | Auth | Owner | `authenticate` (Checks ownership against user's resume/portfolio) | `{ success: true, message: string }` (200) |

---

## 11. Notifications Routes (`/api/v1/notifications`)

Mounted in `server/src/app.ts` under `/api/v1/notifications`. Handled by `server/src/modules/notifications/notification.routes.ts`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `GET` | `/` | Auth | Recipient | `authenticate`, `notificationQueryValidation`, `validate` | `{ success: true, data: { notifications, pagination } }` (200) |
| `GET` | `/unread-count` | Auth | Recipient | `authenticate` | `{ success: true, data: { count } }` (200) |
| `GET` | `/:id` | Auth | Recipient | `authenticate`, `notificationIdValidation`, `validate` | `{ success: true, data: notification }` (200) |
| `PATCH` | `/:id/read` | Auth | Recipient | `authenticate`, `notificationIdValidation`, `validate` | `{ success: true, message: string, data: notification }` (200) |
| `PATCH` | `/read-all` | Auth | Recipient | `authenticate` | `{ success: true, message: string }` (200) |
| `DELETE` | `/:id` | Auth | Recipient | `authenticate`, `notificationIdValidation`, `validate` | `{ success: true, message: string }` (200) |
| `DELETE` | `/` | Auth | Recipient | `authenticate` | `{ success: true, message: string }` (200) |

---

## 12. Admin Routes (`/api/v1/admin`)

Mounted in `server/src/app.ts` under `/api/v1/admin`. All routes protected with `authenticate` + `authorize("admin")`.

| Method | Path | Auth | Roles | Validators | Expected Response Shape |
|---|---|---|---|---|---|
| `GET` | `/dashboard` | Auth | `admin` | None | `{ success: true, data: { metrics } }` (200) |
| `GET` | `/users` | Auth | `admin` | `adminUsersQueryValidation`, `validate` | `{ success: true, data: { users, pagination } }` (200) |
| `GET` | `/users/:id` | Auth | `admin` | `adminUserIdValidation`, `validate` | `{ success: true, data: user }` (200) |
| `PATCH` | `/users/:id/status` | Auth | `admin` | `updateUserStatusValidation`, `validate` | `{ success: true, message: string, data: user }` (200) |
| `PATCH` | `/users/:id/verify` | Auth | `admin` | `updateUserVerificationValidation`, `validate` | `{ success: true, message: string, data: user }` (200) |
| `DELETE` | `/users/:id` | Auth | `admin` | `adminUserIdValidation`, `validate` | `{ success: true, message: string }` (200) |
| `GET` | `/jobs` | Auth | `admin` | `adminJobsQueryValidation`, `validate` | `{ success: true, data: { jobs, pagination } }` (200) |
| `PATCH` | `/jobs/:id/status` | Auth | `admin` | `updateJobStatusValidation`, `validate` | `{ success: true, message: string, data: job }` (200) |
| `DELETE` | `/jobs/:id` | Auth | `admin` | `adminJobIdValidation`, `validate` | `{ success: true, message: string }` (200) |

---

## 13. Analytics Routes (`/api/v1/analytics`)

Mounted in `server/src/app.ts` under `/api/v1/analytics`. All routes protected with `authenticate` + `authorize("admin")`.

| Method | Path | Auth | Roles | Description | Expected Response Shape |
|---|---|---|---|---|---|
| `GET` | `/overview` | Auth | `admin` | Platform summary counts & activity | `{ success: true, data: platformMetrics }` (200) |
| `GET` | `/users` | Auth | `admin` | User breakdown & registration timeline | `{ success: true, data: userAnalytics }` (200) |
| `GET` | `/jobs` | Auth | `admin` | Job creation & category distribution | `{ success: true, data: jobAnalytics }` (200) |
| `GET` | `/proposals` | Auth | `admin` | Proposal acceptance & rate analysis | `{ success: true, data: proposalAnalytics }` (200) |
| `GET` | `/contracts` | Auth | `admin` | Contract progress & status distribution | `{ success: true, data: contractAnalytics }` (200) |
| `GET` | `/payments` | Auth | `admin` | Total volume, refunds, and earnings | `{ success: true, data: paymentAnalytics }` (200) |
