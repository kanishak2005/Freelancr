# Freelancr Database & Models Baseline

> **Generated:** Baseline Capture for PRD 01  
> **ORM:** Mongoose v9  
> **Source directory:** `server/src/modules/**/*.model.ts`

---

## 1. Inventory Summary

| Model | Collection | Primary Purpose | Key Relationships | Explicit Indexes |
|---|---|---|---|---|
| `User` | `users` | Identity, RBAC, Profile, Credentials | None (Root entity) | `username` (unique), `email` (unique) |
| `Job` | `jobs` | Job postings created by clients | `client -> User` | Implicit `_id` |
| `Proposal` | `proposals` | Bids submitted by freelancers | `job -> Job`, `freelancer -> User` | `{ job: 1, freelancer: 1 }` (unique) |
| `Contract` | `contracts` | Binding agreement between client & freelancer | `job -> Job`, `proposal -> Proposal`, `client -> User`, `freelancer -> User` | `proposal` (unique) |
| `Payment` | `payments` | Razorpay payment orders, verification, refunds | `contract -> Contract`, `client -> User`, `freelancer -> User` | `razorpayOrderId` (unique) |
| `Review` | `reviews` | Feedback submitted for completed contracts | `reviewer -> User`, `reviewee -> User`, `contract -> Contract`, `job -> Job` | `{ reviewer: 1, contract: 1 }` (unique) |
| `Chat` | `chats` | 1-to-1 direct messaging between users | `sender -> User`, `receiver -> User` | `{ sender: 1, receiver: 1, createdAt: 1 }`, `{ receiver: 1, sender: 1, isRead: 1 }` |
| `Notification`| `notifications`| In-app activity notifications | `recipient -> User`, `sender -> User` | `{ recipient: 1 }`, `{ recipient: 1, type: 1 }`, `{ recipient: 1, isRead: 1 }`, `{ createdAt: -1 }` |

---

## 2. Model Detail Specifications

### 2.1. User (`User`)
- **File:** `server/src/modules/users/user.model.ts`
- **Fields:**
  - `fullName`: `String` (required, trim)
  - `username`: `String` (required, unique, lowercase, trim)
  - `email`: `String` (required, unique, lowercase, trim)
  - `password`: `String` (required, `select: false`)
  - `role`: `String`, enum: `["client", "freelancer", "admin"]`, default: `"client"`
  - `avatar`: `String`, default: `""`
  - `bio`: `String`, default: `""`
  - `phone`: `String`, default: `""`
  - `location`: `String`, default: `""`
  - `skills`: `[String]`, default: `[]`
  - `resume`: `String`, default: `""`
  - `resumePublicId`: `String`, default: `""`
  - `portfolio`: `[{ title: String, image: String, publicId: String }]`
  - `isVerified`: `Boolean`, default: `false`
  - `isActive`: `Boolean`, default: `true`
  - `passwordResetToken`: `String`, default: `""`, `select: false`
  - `passwordResetExpires`: `Date`, default: `null`, `select: false`
  - `refreshToken`: `String`, default: `""`, `select: false`
- **Options:** `timestamps: true`

---

### 2.2. Job (`Job`)
- **File:** `server/src/modules/jobs/job.model.ts`
- **Fields:**
  - `title`: `String` (required, trim)
  - `description`: `String` (required)
  - `category`: `String` (required)
  - `skills`: `[String]`
  - `budget`: `Number` (required, min: 0)
  - `budgetType`: `String`, enum: `["fixed", "hourly"]`, default: `"fixed"`
  - `experienceLevel`: `String`, enum: `["entry", "intermediate", "expert"]`, default: `"entry"`
  - `duration`: `String`, default: `""`
  - `location`: `String`, default: `""`
  - `isRemote`: `Boolean`, default: `true`
  - `attachments`: `[String]`
  - `client`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `status`: `String`, enum: `["open", "in_progress", "completed", "cancelled"]`, default: `"open"`
  - `proposalsCount`: `Number`, default: 0
- **Options:** `timestamps: true`

---

### 2.3. Proposal (`Proposal`)
- **File:** `server/src/modules/proposals/proposal.model.ts`
- **Fields:**
  - `job`: `Schema.Types.ObjectId`, ref: `"Job"` (required)
  - `freelancer`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `coverLetter`: `String` (required, trim)
  - `bidAmount`: `Number` (required, min: 1)
  - `deliveryTime`: `Number` (required)
  - `attachments`: `[String]`
  - `status`: `String`, enum: `["pending", "accepted", "rejected", "withdrawn"]`, default: `"pending"`
- **Options:** `timestamps: true`
- **Indexes:**
  - Unique compound index: `{ job: 1, freelancer: 1 }` (enforces single active proposal per freelancer per job)

---

### 2.4. Contract (`Contract`)
- **File:** `server/src/modules/contracts/contract.model.ts`
- **Fields:**
  - `job`: `Schema.Types.ObjectId`, ref: `"Job"` (required)
  - `proposal`: `Schema.Types.ObjectId`, ref: `"Proposal"` (required, unique: true)
  - `client`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `freelancer`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `title`: `String` (required, trim)
  - `description`: `String`, default: `""`
  - `amount`: `Number` (required, min: 1)
  - `deliveryTime`: `Number` (required, min: 1)
  - `status`: `String`, enum: `["active", "completed", "cancelled", "disputed"]`, default: `"active"`
  - `startDate`: `Date`, default: `Date.now`
  - `endDate`: `Date`
- **Options:** `timestamps: true`
- **Indexes:**
  - Unique index: `proposal: 1` (a proposal cannot be turned into multiple contracts)

---

### 2.5. Payment (`Payment`)
- **File:** `server/src/modules/payments/payment.model.ts`
- **Fields:**
  - `contract`: `Schema.Types.ObjectId`, ref: `"Contract"` (required)
  - `client`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `freelancer`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `amount`: `Number` (required, min: 1)
  - `currency`: `String`, default: `"INR"`
  - `razorpayOrderId`: `String` (required, unique: true)
  - `razorpayPaymentId`: `String`, default: `""`
  - `razorpaySignature`: `String`, default: `""`
  - `status`: `String`, enum: `["created", "paid", "failed", "partially_refunded", "refunded"]`, default: `"created"`
  - `refundedAmount`: `Number`, default: 0, min: 0
  - `pendingRefundAmount`: `Number`, default: 0, min: 0
  - `pendingRefundId`: `String`, default: `""`
  - `paidAt`: `Date`
- **Options:** `timestamps: true`
- **Indexes:**
  - Unique index: `razorpayOrderId: 1`

---

### 2.6. Review (`Review`)
- **File:** `server/src/modules/reviews/review.model.ts`
- **Fields:**
  - `reviewer`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `reviewee`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `contract`: `Schema.Types.ObjectId`, ref: `"Contract"` (required)
  - `job`: `Schema.Types.ObjectId`, ref: `"Job"` (required)
  - `rating`: `Number` (required, min: 1, max: 5)
  - `comment`: `String` (required, trim, minlength: 5, maxlength: 1000)
  - `reviewerRole`: `String`, enum: `["client", "freelancer"]`, required: true
- **Options:** `timestamps: true`
- **Indexes:**
  - Unique compound index: `{ reviewer: 1, contract: 1 }` (prevents double reviews by same user on a contract)

---

### 2.7. Chat (`Chat`)
- **File:** `server/src/modules/chat/chat.model.ts`
- **Fields:**
  - `sender`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `receiver`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `message`: `String` (required, trim, maxlength: 2000)
  - `attachments`: `[String]`
  - `isRead`: `Boolean`, default: `false`
- **Options:** `timestamps: true`
- **Indexes:**
  - Compound index: `{ sender: 1, receiver: 1, createdAt: 1 }`
  - Compound index: `{ receiver: 1, sender: 1, isRead: 1 }`

---

### 2.8. Notification (`Notification`)
- **File:** `server/src/modules/notifications/notification.model.ts`
- **Fields:**
  - `recipient`: `Schema.Types.ObjectId`, ref: `"User"` (required)
  - `sender`: `Schema.Types.ObjectId`, ref: `"User"`
  - `title`: `String`
  - `message`: `String`
  - `type`: `String`
  - `isRead`: `Boolean`, default: `false`
- **Options:** `timestamps: true`
- **Indexes:**
  - `{ recipient: 1 }`
  - `{ recipient: 1, type: 1 }`
  - `{ recipient: 1, isRead: 1 }`
  - `{ createdAt: -1 }`
