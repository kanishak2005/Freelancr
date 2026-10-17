# Freelancr --- Complete Project Architecture & Feature Documentation

**Project:** Freelancr\
**Type:** Full-stack freelance marketplace\
**Architecture:** MERN-style modular web application\
**Repository:** `kanishak2005/Freelancr`\
**Current backend checkpoint:** `7561acb` ---
`complete backend security and payment refund handling`\
**Primary roles:** Client, Freelancer, Admin

------------------------------------------------------------------------

## 1. Project Overview

Freelancr is a full-stack freelance marketplace that connects clients
who publish jobs with freelancers who submit proposals and perform
contracted work.

The platform implements the complete core marketplace lifecycle:

``` text
User Registration/Login
        ↓
Role-based access
        ↓
Client creates Job
        ↓
Freelancer discovers Job
        ↓
Freelancer submits Proposal
        ↓
Client reviews Proposal
        ↓
Client accepts Proposal
        ↓
Contract is created
        ↓
Client creates Razorpay Payment
        ↓
Payment is verified
        ↓
Contract is executed
        ↓
Contract completed/cancelled
        ↓
Refund when applicable
        ↓
Reviews
        ↓
Notifications / Chat / Admin Analytics
```

The backend is organized by business domain rather than by a single
global controllers/models folder. This makes each feature independently
maintainable.

------------------------------------------------------------------------

# 2. Technology Stack

## Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   React Router
-   Redux Toolkit
-   TanStack Query
-   Axios
-   React Hook Form
-   Zod
-   Socket.IO client

## Backend

-   Node.js
-   Express.js
-   TypeScript
-   MongoDB Atlas
-   Mongoose
-   JWT
-   bcrypt
-   Socket.IO
-   Multer
-   Cloudinary
-   Razorpay
-   express-validator
-   Helmet
-   CORS
-   Morgan
-   cookie-parser

## External Systems

  System                      Purpose
  --------------------------- ------------------------------------
  MongoDB Atlas               Persistent application database
  Razorpay                    Payment processing and refunds
  Cloudinary                  Resume and portfolio/media storage
  SMTP/Mail service           Password-reset email delivery
  Socket.IO                   Real-time chat/events
  GitHub                      Source-code version control
  Vercel / hosting platform   Frontend deployment target

------------------------------------------------------------------------

# 3. High-Level System Architecture

``` text
                         ┌───────────────────────────┐
                         │       USER BROWSER        │
                         │ React + TypeScript + UI   │
                         └─────────────┬─────────────┘
                                       │
                     REST / JSON       │       WebSocket
                                       │
                          ┌────────────▼────────────┐
                          │       EXPRESS API       │
                          │       Node + TS         │
                          └────────────┬────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
      ┌───────────────┐       ┌────────────────┐       ┌───────────────┐
      │ Authentication│       │ Business Logic │       │ Socket.IO     │
      │ JWT / RBAC    │       │ Service Layer  │       │ Real-time     │
      └───────────────┘       └───────┬────────┘       └───────────────┘
                                      │
                              ┌───────▼────────┐
                              │    Mongoose     │
                              │  Repositories   │
                              └───────┬────────┘
                                      │
                              ┌───────▼────────┐
                              │ MongoDB Atlas  │
                              └────────────────┘

             ┌────────────────────┐       ┌────────────────────┐
             │      Razorpay      │       │     Cloudinary     │
             │ Payments/Refunds   │       │ Files/Media        │
             └────────────────────┘       └────────────────────┘

             ┌────────────────────┐
             │   Mail Provider    │
             │ Password Reset     │
             └────────────────────┘
```

------------------------------------------------------------------------

# 4. Repository / File Structure

The repository is divided into frontend, backend, and documentation
areas.

``` text
Freelancr/
│
├── client/                         # React frontend
│   ├── public/                     # Public/static assets
│   ├── src/
│   │   ├── app/                    # Application-level configuration
│   │   ├── assets/                 # Images/static frontend assets
│   │   ├── components/             # Reusable UI components
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── features/               # Feature-oriented frontend logic
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── jobs/
│   │   │   ├── proposals/
│   │   │   ├── payments/
│   │   │   ├── chat/
│   │   │   └── admin/
│   │   ├── hooks/                  # Reusable React hooks
│   │   ├── layouts/                # Page layouts
│   │   ├── lib/                    # Library/config helpers
│   │   ├── pages/                  # Route-level pages
│   │   ├── routes/                 # Route configuration/guards
│   │   ├── services/               # API/service functions
│   │   ├── store/                  # Redux state
│   │   ├── styles/                 # Global styling
│   │   ├── types/                  # Frontend TypeScript types
│   │   └── utils/                  # Frontend utility functions
│   ├── index.html
│   ├── package.json
│   ├── tsconfig*.json
│   └── vite.config.*
│
├── server/                         # Node/Express backend
│   ├── src/
│   │   ├── config/                 # Environment and external-service config
│   │   ├── middleware/             # Auth, validation, errors, etc.
│   │   ├── modules/
│   │   │   ├── admin/
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── contracts/
│   │   │   ├── jobs/
│   │   │   ├── notifications/
│   │   │   ├── payments/
│   │   │   ├── proposals/
│   │   │   ├── reviews/
│   │   │   ├── uploads/
│   │   │   └── users/
│   │   ├── shared/                 # Shared response/errors/handlers
│   │   ├── types/                  # Backend/global types
│   │   ├── utils/                  # Backend utilities
│   │   ├── app.ts                  # Express application
│   │   └── server.ts               # HTTP/server bootstrap
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── .env                        # Local secrets; never commit
│
├── docs/                           # Project documentation
│
├── .gitignore
└── README.md
```

> The exact frontend file names can evolve as UI work continues. The
> backend module structure above represents the audited modular
> architecture.

------------------------------------------------------------------------

# 5. Backend Architecture

Freelancr follows this logical backend flow:

``` text
HTTP Request
    ↓
Express Route
    ↓
Authentication Middleware
    ↓
Authorization Middleware
    ↓
Request Validation
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Mongoose Model
    ↓
MongoDB Atlas
```

For external operations:

``` text
Service
 ├── Razorpay
 ├── Cloudinary
 ├── Mail provider
 └── Socket.IO / Notification service
```

## Why this structure is used

### Routes

Define API endpoints and middleware order.

### Middleware

Handles cross-cutting concerns such as authentication, authorization and
validation.

### Controllers

Translate HTTP requests into service calls and construct HTTP responses.

### Services

Contain business rules and workflow decisions.

### Repositories

Encapsulate database queries.

### Models

Define MongoDB document schemas and constraints.

This separation prevents controllers from becoming overloaded with
database and business logic.

------------------------------------------------------------------------

# 6. Backend Module Structure

Each business module follows the same conceptual pattern:

``` text
module/
├── *.routes.ts
├── *.controller.ts
├── *.service.ts
├── *.repository.ts
├── *.model.ts
├── *.types.ts
└── *.validation.ts
```

Not every module requires every file, but the architecture follows this
pattern.

------------------------------------------------------------------------

# 7. Authentication Module

## Purpose

Provides identity management and secure account sessions.

## Main capabilities

-   Registration
-   Login
-   Current-user retrieval
-   Logout
-   Access-token authentication
-   Refresh-token flow
-   Change password
-   Forgot password
-   Reset password
-   Password hashing
-   Rate limiting

## Main API flow

``` text
Register
  ↓
Validate input
  ↓
Hash password
  ↓
Create User
  ↓
Return authentication/session information
```

``` text
Login
  ↓
Find user
  ↓
Compare password
  ↓
Generate access/refresh tokens
  ↓
Authenticated session
```

## Password reset

``` text
Forgot Password
      ↓
Generate reset token
      ↓
Hash token for storage
      ↓
Send reset email
      ↓
User opens reset link
      ↓
Submit new password
      ↓
Verify token + expiry
      ↓
Hash new password
      ↓
Invalidate/reset token
```

## Security

-   JWT access tokens
-   Refresh tokens
-   bcrypt password hashing
-   Rate limiting
-   Validation
-   Active-account checks
-   No raw password/reset-token logging

------------------------------------------------------------------------

# 8. Users / Profile Module

## Purpose

Manages user profile information and professional identity.

## Features

-   Get own profile
-   Update profile
-   Public username lookup
-   Public user listing
-   Delete own account
-   Upload resume
-   Add portfolio image
-   Remove portfolio image

## Profile fields

Typical profile information includes:

-   Full name
-   Username
-   Email
-   Bio
-   Phone
-   Location
-   Skills
-   Avatar
-   Resume
-   Portfolio

## Security

Public endpoints use safe projections so sensitive account fields are
not unnecessarily exposed.

Authenticated profile access can retrieve the user's own protected
information.

------------------------------------------------------------------------

# 9. Jobs Module

## Purpose

Allows clients to publish freelance opportunities and freelancers to
discover them.

## Job lifecycle

``` text
OPEN
  ↓
IN_PROGRESS
  ↓
COMPLETED

Alternative:
OPEN / IN_PROGRESS
  ↓
CANCELLED
```

## Client functions

-   Create job
-   Update own job
-   Delete own job
-   View own jobs

## Public functions

-   Search jobs
-   Filter jobs
-   View job
-   Browse jobs

## Validation

Job creation validates:

-   Title length
-   Description length
-   Category
-   Budget
-   Budget type
-   Experience level

## Search security

Search keywords are escaped before being used as regular expressions,
preventing regex metacharacters from unexpectedly changing the query.

------------------------------------------------------------------------

# 10. Proposals Module

## Purpose

Allows freelancers to apply to jobs and clients to review applications.

## Freelancer functions

-   Submit proposal
-   View own proposals
-   Update proposal
-   Withdraw proposal

## Client functions

-   View proposals for their jobs
-   Inspect individual proposals
-   Accept a proposal

## Admin

Admins can access proposal information where permitted by the
authorization rules.

## Proposal lifecycle

``` text
PENDING
   ↓
ACCEPTED
```

or

``` text
PENDING
   ↓
REJECTED / WITHDRAWN
```

The accepted proposal becomes the starting point for contract creation.

------------------------------------------------------------------------

# 11. Contracts Module

## Purpose

Represents the formal working relationship between a client and
freelancer.

## Contract creation flow

``` text
Client
  ↓
Selects proposal
  ↓
Proposal ownership checked
  ↓
Job ownership checked
  ↓
Proposal must be pending
  ↓
Job must be open
  ↓
Contract created
  ↓
Proposal accepted
  ↓
Job → in_progress
  ↓
Freelancer notified
```

## Contract operations

-   Create contract from proposal
-   View own contracts
-   View individual contract
-   Complete contract
-   Cancel contract

## Completion flow

``` text
Active Contract
      ↓
Client completes
      ↓
Contract → completed
      ↓
Job → completed
      ↓
Freelancer notification
```

## Cancellation flow

``` text
Active Contract
      ↓
Client/Freelancer cancels
      ↓
Contract → cancelled
      ↓
Job → cancelled
      ↓
Other participant notified
```

------------------------------------------------------------------------

# 12. Payments Module

## Purpose

Handles client payments through Razorpay.

## Payment lifecycle

``` text
CREATED
   ↓
PAID
   ↓
PARTIALLY_REFUNDED
   ↓
REFUNDED
```

A failed payment may enter:

``` text
CREATED → FAILED
```

## Create order

``` text
Authenticated Client
      ↓
Contract validated
      ↓
Client ownership verified
      ↓
Contract must be active
      ↓
Amount taken from contract
      ↓
Razorpay order created
      ↓
Payment record stored
```

The backend does not trust a frontend-supplied payment amount.

## Payment verification

``` text
Frontend/Razorpay
      ↓
Order ID + Payment ID + Signature
      ↓
Backend verifies HMAC signature
      ↓
Fetch Razorpay payment
      ↓
Verify order ID
      ↓
Verify amount
      ↓
Verify currency
      ↓
Verify captured status
      ↓
Mongo payment → PAID
```

## Refunds

Freelancr supports:

-   Full refunds
-   Partial refunds
-   Pending refunds
-   Refund status synchronization
-   Refund failure handling
-   Refund webhook processing
-   Refund idempotency

### Partial refund

``` text
Paid ₹7000
    ↓
Refund ₹3000
    ↓
Razorpay processes refund
    ↓
Refunded amount = ₹3000
    ↓
Remaining refundable amount = ₹4000
    ↓
Payment = partially_refunded
```

### Full refund

``` text
Paid ₹7000
    ↓
Refund remaining ₹7000
    ↓
Razorpay amount_refunded = ₹7000
    ↓
Payment = refunded
```

## Pending refund protection

The database stores:

-   `pendingRefundAmount`
-   `pendingRefundId`

A second refund request is blocked while a previous refund is being
processed.

## Refund webhook flow

``` text
Razorpay
   │
   ├── refund.created
   │       ↓
   │   Store pending refund
   │
   ├── refund.processed
   │       ↓
   │   Fetch Razorpay payment
   │       ↓
   │   Use amount_refunded as source of truth
   │       ↓
   │   Update MongoDB
   │       ↓
   │   Clear pending refund
   │       ↓
   │   Notify freelancer
   │
   └── refund.failed
           ↓
       Clear pending state
```

Webhook signatures are verified using HMAC-SHA256 against the raw
request body.

------------------------------------------------------------------------

# 13. Reviews Module

## Purpose

Allows participants to review completed work.

## Rules

A review requires:

-   Valid contract
-   Completed contract
-   Reviewer is a contract participant
-   One review per reviewer per contract

## Review queries

-   Create review
-   Get review
-   Get contract reviews
-   Get job reviews
-   Get user reviews

## Flow

``` text
Contract completed
      ↓
Participant submits review
      ↓
Ownership/participation verified
      ↓
Duplicate review checked
      ↓
Review stored
```

------------------------------------------------------------------------

# 14. Chat Module

## Purpose

Provides user-to-user communication.

## Transport

-   REST APIs for retrieving/managing messages
-   Socket.IO for real-time communication

## Functions

-   Send message
-   Get conversation
-   Get individual message
-   Delete own message
-   Real-time message delivery

## Security

-   User ID validation
-   Prevent self-messaging
-   Inactive receiver protection
-   Conversation participant checks
-   Sender-only deletion

## Flow

``` text
User A
  ↓
Send Message
  ↓
Authentication
  ↓
Receiver validation
  ↓
Message stored
  ↓
Socket.IO event
  ↓
User B receives message in real time
```

------------------------------------------------------------------------

# 15. Notifications Module

## Purpose

Provides in-app notifications for important marketplace events.

## Notification sources

Examples include:

-   Proposal accepted
-   Contract created
-   Contract completed
-   Contract cancelled
-   Payment received
-   Payment refunded
-   Other business events

## Operations

-   Create notification
-   List notifications
-   Mark notification as read
-   Delete notification

Notifications are protected so users can only modify their own
notifications.

------------------------------------------------------------------------

# 16. Uploads Module

## Purpose

Provides controlled file/media handling through Cloudinary.

## Supported upload categories

### Images

-   JPG
-   PNG
-   WEBP

### Resumes

-   PDF

## Limits

-   Maximum file size: 10 MB

## Upload flow

``` text
Browser
  ↓
Multipart upload
  ↓
Multer memory storage
  ↓
MIME/file validation
  ↓
Cloudinary
  ↓
URL + public ID
  ↓
MongoDB profile reference
```

## Delete flow

The backend determines whether the resource is an image or raw file
before deleting it from Cloudinary.

Ownership is checked before deletion.

------------------------------------------------------------------------

# 17. Admin Module

## Purpose

Provides privileged platform administration.

## Access

All admin routes are protected by:

``` text
authenticate
      ↓
authorize("admin")
```

## Administrative capabilities

-   View platform users
-   View platform jobs
-   Inspect platform data
-   Manage administrative resources
-   Access analytics
-   Protect sensitive user data through safe projections
-   Prevent inappropriate admin self-deletion where applicable

------------------------------------------------------------------------

# 18. Analytics Module

## Purpose

Provides platform-level metrics for administrators.

## Architecture

``` text
Admin
 ↓
Authentication
 ↓
Admin Authorization
 ↓
Analytics Service
 ↓
MongoDB aggregation/query logic
 ↓
Dashboard metrics
```

Payment analytics use successfully paid payments rather than treating
created/failed payment attempts as completed revenue.

------------------------------------------------------------------------

# 19. Middleware Architecture

## Authentication Middleware

Responsibilities:

-   Read Bearer token
-   Verify JWT
-   Load user from database
-   Confirm user exists
-   Confirm account is active
-   Attach current user identity and role to request

Important design decision:

The middleware loads the user's role from the database rather than
blindly trusting an old role embedded in the token.

## Authorization Middleware

Checks whether the authenticated user has an allowed role.

Examples:

``` text
authorize("admin")
authorize("client")
authorize("freelancer")
authorize("client", "admin")
```

## Validation Middleware

Express-validator rules validate request data before controller
execution.

## Error Middleware

Centralizes API error responses and prevents internal implementation
details from being exposed to clients.

------------------------------------------------------------------------

# 20. Shared Backend Infrastructure

The backend contains shared infrastructure for:

-   API errors
-   API responses
-   async request handling
-   HTTP status constants
-   logging
-   environment configuration

Conceptually:

``` text
Controller
   ↓
asyncHandler
   ↓
Service
   ↓
ApiError when necessary
   ↓
Central error middleware
   ↓
Standard HTTP response
```

------------------------------------------------------------------------

# 21. Database Architecture

Freelancr uses **MongoDB Atlas** with Mongoose.

## Core collections / entities

``` text
User
 │
 ├───────────────┐
 │               │
 ▼               ▼
Job           Proposal
 │               │
 │               ▼
 │            Contract
 │               │
 │       ┌───────┴────────┐
 │       ▼                ▼
 │    Payment           Review
 │
 ├── Notifications
 ├── Messages
 ├── Resume
 └── Portfolio
```

------------------------------------------------------------------------

# 22. User Data Model

The User entity represents:

-   Client
-   Freelancer
-   Admin

Important concepts include:

``` text
User
├── identity
├── authentication data
├── role
├── active status
├── profile
├── skills
├── avatar
├── resume
└── portfolio
```

Authentication secrets/tokens are protected from public user
projections.

------------------------------------------------------------------------

# 23. Job Data Model

A Job belongs to a client.

``` text
Client User
     │
     └──────< Job
```

Important job data:

-   Client
-   Title
-   Description
-   Category
-   Budget
-   Budget type
-   Experience level
-   Status
-   Timestamps

Status:

``` text
open
in_progress
completed
cancelled
```

------------------------------------------------------------------------

# 24. Proposal Data Model

A Proposal connects a freelancer to a Job.

``` text
Freelancer
    │
    └──────< Proposal >────── Job
```

The proposal represents the freelancer's application to perform the job.

It becomes especially important when the client accepts it and a
contract is created.

------------------------------------------------------------------------

# 25. Contract Data Model

A Contract connects:

``` text
Client
   │
   ├──────── Contract ──────── Freelancer
   │
   ├──────── Job
   │
   └──────── Proposal
```

The contract stores the commercial/work relationship and its lifecycle
status.

------------------------------------------------------------------------

# 26. Payment Data Model

Payment connects the contract with both marketplace participants.

``` text
Client
  │
  └──── Payment ──── Freelancer
          │
          └──── Contract
```

Important payment fields include:

-   Contract
-   Client
-   Freelancer
-   Amount
-   Currency
-   Razorpay order ID
-   Razorpay payment ID
-   Razorpay signature
-   Status
-   Refunded amount
-   Pending refund amount
-   Pending refund ID
-   Paid timestamp
-   Created/updated timestamps

Payment statuses:

``` text
created
paid
failed
partially_refunded
refunded
```

------------------------------------------------------------------------

# 27. Review Data Model

Reviews are linked to:

``` text
Reviewer
   │
   └──── Review ──── Contract
```

The contract determines who is allowed to review.

------------------------------------------------------------------------

# 28. Notification Data Model

A notification contains the relationship:

``` text
Sender
   │
   └──── Notification ──── Recipient
```

It also contains event information such as:

-   title
-   message
-   type
-   read status
-   timestamps

------------------------------------------------------------------------

# 29. Chat / Message Data Model

Messages represent communication between users.

``` text
Sender
   │
   └──── Message ──── Receiver
              │
              └── conversation
```

Authorization ensures users cannot retrieve arbitrary private
conversations.

------------------------------------------------------------------------

# 30. Complete Database Relationship Map

``` text
                         ┌─────────────┐
                         │    USER     │
                         └──────┬──────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
          CLIENT           FREELANCER            ADMIN
             │                  │
             ▼                  │
            JOB                 │
             │                  │
             └────────┐         │
                      ▼         │
                   PROPOSAL <───┘
                      │
                      ▼
                   CONTRACT
                  /   |    \
                 /    |     \
                ▼     ▼      ▼
             PAYMENT REVIEW  JOB
                │
                ▼
          RAZORPAY REFUNDS

USER ───────< NOTIFICATION
USER ───────< MESSAGE >────── USER

USER ───────< PORTFOLIO
USER ───────  RESUME
```

------------------------------------------------------------------------

# 31. Complete Marketplace Direction Flow

## Client journey

``` text
Register
  ↓
Login
  ↓
Complete profile
  ↓
Create job
  ↓
Receive proposals
  ↓
Inspect freelancer
  ↓
Accept proposal
  ↓
Contract created
  ↓
Create Razorpay order
  ↓
Complete payment
  ↓
Payment verified
  ↓
Work progresses
  ↓
Complete contract
  ↓
Review freelancer
```

## Freelancer journey

``` text
Register
  ↓
Login
  ↓
Build profile
  ↓
Upload resume / portfolio
  ↓
Search jobs
  ↓
Submit proposal
  ↓
Proposal accepted
  ↓
Contract created
  ↓
Perform work
  ↓
Contract completed
  ↓
Receive notifications
  ↓
Review client
```

## Admin journey

``` text
Admin Login
    ↓
Admin Authorization
    ↓
Dashboard
    ├── Users
    ├── Jobs
    ├── Payments
    ├── Platform metrics
    └── Analytics
```

------------------------------------------------------------------------

# 32. Complete Payment Direction Flow

``` text
Client
  │
  ▼
Active Contract
  │
  ▼
POST /payments/create-order
  │
  ▼
Razorpay Order
  │
  ▼
Client completes payment
  │
  ▼
POST /payments/verify
  │
  ├── HMAC verification
  ├── Order verification
  ├── Amount verification
  ├── Currency verification
  └── Captured-status verification
  │
  ▼
Mongo Payment = PAID
  │
  ▼
Freelancer notified
```

Refund:

``` text
Client
  ↓
PATCH /payments/refund/:id
  ↓
Ownership check
  ↓
Payment status check
  ↓
Fetch Razorpay payment
  ↓
Determine remaining refundable amount
  ↓
Razorpay refund request
  ↓
┌─────────────────────────────┐
│                             │
▼                             ▼
processed                  pending
│                             │
▼                             ▼
Mongo updated             pendingRefundId
                            pendingRefundAmount
                                 │
                                 ▼
                           Razorpay webhook
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
                 created      processed     failed
                                  │
                                  ▼
                           Mongo synchronized
```

------------------------------------------------------------------------

# 33. Complete Request Security Flow

Every protected REST request follows this general path:

``` text
HTTP Request
     ↓
CORS / Helmet / Logger
     ↓
Route matching
     ↓
authenticate
     ↓
JWT verification
     ↓
User lookup
     ↓
Active-user check
     ↓
authorize(...)
     ↓
Validation
     ↓
Controller
     ↓
Service-level ownership checks
     ↓
Repository
     ↓
MongoDB
```

This gives multiple layers of protection rather than relying on frontend
route guards alone.

------------------------------------------------------------------------

# 34. Frontend-to-Backend Direction Flow

``` text
React Page
   ↓
Feature Component
   ↓
Hook / State / Query
   ↓
Axios Service
   ↓
HTTP Request
   ↓
Express Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
MongoDB / External API
   ↓
JSON Response
   ↓
TanStack Query / Redux
   ↓
React UI
```

Real-time chat follows:

``` text
React Chat UI
      ⇅
Socket.IO Client
      ⇅
Socket.IO Server
      ⇅
Authentication
      ⇅
Message Service
      ⇅
MongoDB
```

------------------------------------------------------------------------

# 35. External Service Architecture

## MongoDB Atlas

Used for:

-   Users
-   Jobs
-   Proposals
-   Contracts
-   Payments
-   Reviews
-   Notifications
-   Messages
-   Profile metadata

## Razorpay

Used for:

-   Payment orders
-   Payment verification
-   Payment status
-   Full refunds
-   Partial refunds
-   Refund webhooks

## Cloudinary

Used for:

-   User avatars
-   Portfolio images
-   Resume storage

## Mail provider

Used for:

-   Password reset messages

## Socket.IO

Used for:

-   Real-time chat
-   Real-time server events where implemented

------------------------------------------------------------------------

# 36. Application Entry Points

## Frontend

Vite starts the React application.

Conceptual flow:

``` text
index.html
   ↓
React entry point
   ↓
App/router
   ↓
Layouts
   ↓
Pages
   ↓
Feature components
```

## Backend

``` text
server.ts
   ↓
Express app initialization
   ↓
Database connection
   ↓
Middleware
   ↓
Routes
   ↓
HTTP server
   ↓
Socket.IO
```

The Express application exposes the versioned API namespace:

``` text
/api/v1
```

Health checking is also provided through the API health endpoint.

------------------------------------------------------------------------

# 37. API Organization

The backend API is versioned:

``` text
/api/v1/
```

Major route groups include:

``` text
/auth
/users
/jobs
/proposals
/contracts
/payments
/reviews
/chat
/notifications
/uploads
/admin
/analytics
```

This makes the API easier to evolve without breaking an older client.

------------------------------------------------------------------------

# 38. Important Authorization Rules

## Client-only actions

-   Create jobs
-   Accept proposals
-   Create contracts
-   Complete contracts
-   Create payment orders
-   Request payment refunds

## Freelancer-only actions

-   Apply to jobs
-   Manage own proposals

## Shared participant actions

-   View own contracts
-   Cancel eligible contracts
-   Access permitted chat conversations
-   Review completed contracts

## Admin-only actions

-   Administrative operations
-   Platform analytics

------------------------------------------------------------------------

# 39. Security Architecture

Freelancr uses multiple security controls:

### Authentication

JWT-based authentication.

### Authorization

Role-based access control plus service-level ownership checks.

### Password security

bcrypt hashing.

### Request validation

express-validator rules.

### Rate limiting

Authentication and password-reset endpoints are rate-limited.

### HTTP security

Helmet.

### CORS

Configured for the frontend origin.

### Payment security

Razorpay signature/HMAC verification.

### Webhook security

Raw request body signature verification.

### File security

MIME validation and file-size limits.

### Data exposure protection

Safe database projections for public user information.

### Account status

Inactive accounts are blocked by authentication middleware.

### Database safety

Mongoose validation and controlled repository updates.

------------------------------------------------------------------------

# 40. Error Handling Architecture

``` text
Invalid request
     ↓
Validation error
     ↓
400 response

Unauthenticated
     ↓
401 response

Authenticated but unauthorized
     ↓
403 response

Resource not found
     ↓
404 response

Business rule violation
     ↓
400/409-style API error

Unexpected server error
     ↓
Central error middleware
     ↓
500 response
```

The backend avoids exposing unnecessary internal implementation details
to clients.

------------------------------------------------------------------------

# 41. Feature-to-Module Map

  Feature           Backend Module   External System
  ----------------- ---------------- ---------------------
  Registration      Auth             MongoDB
  Login             Auth             MongoDB
  Refresh session   Auth             MongoDB
  Password reset    Auth             Mail + MongoDB
  Profile           Users            MongoDB
  Resume            Users/Uploads    Cloudinary
  Portfolio         Users/Uploads    Cloudinary
  Job posting       Jobs             MongoDB
  Job search        Jobs             MongoDB
  Proposal          Proposals        MongoDB
  Hiring            Contracts        MongoDB
  Payment           Payments         Razorpay
  Refund            Payments         Razorpay
  Reviews           Reviews          MongoDB
  Chat              Chat             Socket.IO + MongoDB
  Notifications     Notifications    MongoDB
  Admin             Admin            MongoDB
  Analytics         Analytics        MongoDB

------------------------------------------------------------------------

# 42. State Transition Map

## Job

``` text
open
 │
 └── contract accepted
          ↓
      in_progress
          │
       ┌──┴──┐
       ▼     ▼
 completed cancelled
```

## Proposal

``` text
pending
 ├── accepted
 ├── rejected
 └── withdrawn
```

## Contract

``` text
active
 ├── completed
 ├── cancelled
 └── disputed
```

## Payment

``` text
created
 ├── paid
 │    ├── partially_refunded
 │    │       └── refunded
 │    └── refunded
 └── failed
```

------------------------------------------------------------------------

# 43. Important Business Invariants

The system enforces important rules such as:

1.  A freelancer cannot submit proposals as a client.
2.  A client cannot apply as a freelancer.
3.  A client can only modify their own jobs.
4.  A freelancer can only modify/withdraw their own proposals.
5.  A contract must reference a valid proposal/job relationship.
6.  A contract can only be completed while active.
7.  A contract can only be cancelled while active.
8.  Contract cancellation also updates the related job to `cancelled`.
9.  A payment amount is derived from the contract.
10. A client can only refund their own payment.
11. A refund cannot exceed the remaining refundable Razorpay amount.
12. A second refund is blocked while a refund is pending.
13. Refund webhooks are signature-verified.
14. Refund processing is idempotent.
15. Reviews require a completed contract and valid participation.
16. A reviewer cannot create multiple reviews for the same contract.
17. Users cannot access arbitrary private conversations.
18. Users cannot delete another user's notification/message/resource.
19. Admin APIs require admin authorization.
20. Inactive users cannot authenticate into protected APIs.

------------------------------------------------------------------------

# 44. Deployment Architecture

A production deployment can be represented as:

``` text
                    INTERNET
                       │
              ┌────────▼────────┐
              │ Frontend Hosting│
              │ React/Vite SPA  │
              └────────┬────────┘
                       │ HTTPS
                       ▼
              ┌─────────────────┐
              │ Backend Hosting │
              │ Node + Express  │
              └───────┬─────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   MongoDB Atlas   Razorpay     Cloudinary
        │
        └────────── Application data
```

Environment variables hold deployment-specific configuration.

Secrets must never be committed to Git.

------------------------------------------------------------------------

# 45. Development Architecture

Local development:

``` text
Windows 11
   │
   ├── VS Code
   │
   ├── Frontend
   │      └── Vite :5173
   │
   └── Backend
          └── Express :5000
                 │
                 └── MongoDB Atlas
```

The API base path is:

``` text
http://localhost:5000/api/v1
```

The backend health endpoint can be used to verify server availability.

------------------------------------------------------------------------

# 46. Git / Version Control

The repository uses Git with `main` as the primary branch.

Current clean checkpoint:

``` text
7561acb
complete backend security and payment refund handling
```

This checkpoint contains the completed security, validation,
contract-cancellation, and payment/refund hardening work.

A clean working tree means:

``` text
Local main = origin/main
No uncommitted changes
```

------------------------------------------------------------------------

# 47. Backend Quality Status

At the documented checkpoint:

-   TypeScript compilation passes.
-   Production dependency audit reports zero vulnerabilities.
-   `git diff --check` is clean.
-   Backend modules have been audited for authentication/authorization.
-   Payment refund logic supports partial and full refunds.
-   Razorpay refund webhooks are handled.
-   Refund processing is designed to be idempotent.
-   Sensitive debug logging was removed.
-   Backend changes are committed and pushed.

------------------------------------------------------------------------

# 48. Recommended End-to-End Test Matrix

Before final deployment, verify:

## Authentication

-   Register client
-   Register freelancer
-   Login
-   Refresh
-   Logout
-   Change password
-   Forgot password
-   Reset password

## Client

-   Update profile
-   Create job
-   Edit job
-   Delete job
-   View proposals
-   Accept proposal
-   Create payment
-   Verify payment
-   Complete contract
-   Request refund
-   Submit review

## Freelancer

-   Update profile
-   Upload resume
-   Upload portfolio
-   Search jobs
-   Apply
-   Edit proposal
-   Withdraw proposal
-   View contract
-   Receive notifications
-   Chat
-   Review client

## Admin

-   Login
-   Access admin dashboard
-   View users
-   View platform data
-   Access analytics
-   Confirm non-admin users receive 403

## Security

Test:

``` text
No token
Expired token
Invalid token
Wrong role
Wrong resource owner
Inactive account
Invalid ObjectId
Invalid request body
Oversized upload
Invalid file type
Duplicate review
Duplicate payment verification
Refund greater than remaining amount
Second refund while first refund is pending
Invalid Razorpay webhook signature
```

------------------------------------------------------------------------

# 49. Viva / Presentation Architecture Explanation

A concise explanation for project presentation:

> Freelancr is a modular full-stack freelance marketplace. The React
> frontend communicates with a versioned Express REST API and Socket.IO
> for real-time communication. The backend uses JWT authentication and
> role-based authorization, while each business domain is separated into
> routes, controllers, services, repositories and Mongoose models.
> MongoDB Atlas stores marketplace data, Razorpay handles payments and
> refunds, Cloudinary stores uploaded media, and a mail provider handles
> password-reset communication. Business rules are enforced in the
> service layer and resource ownership is checked independently of the
> frontend. This architecture keeps the application modular, secure and
> maintainable.

------------------------------------------------------------------------

# 50. Final Architecture Summary

``` text
                           FREELANCR
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
     CLIENT                 FREELANCER              ADMIN
        │                      │                      │
        └──────────────┬───────┴──────────────────────┘
                       ▼
                 React Frontend
                       │
              REST + Socket.IO
                       │
                       ▼
              Express + TypeScript
                       │
      ┌────────────────┼─────────────────┐
      │                │                 │
      ▼                ▼                 ▼
 Authentication    Business Modules   Middleware
                       │
       ┌───────────────┼────────────────────┐
       │               │                    │
       ▼               ▼                    ▼
     Jobs          Proposals            Contracts
       │               │                    │
       └───────────────┴──────────┬─────────┘
                                  ▼
                              Payments
                                  │
                                  ▼
                              Razorpay
                                  │
                                  ▼
                              Refunds

Other modules:
Users ─ Uploads ─ Cloudinary
Chat ─ Socket.IO
Notifications
Reviews
Admin
Analytics

All persistent business data
            │
            ▼
       MongoDB Atlas
```

------------------------------------------------------------------------

# 51. Documentation Maintenance Rule

This document should be updated whenever one of the following changes:

-   A new module is added.
-   A database entity is added/removed.
-   A route changes.
-   A major business rule changes.
-   Payment/refund behavior changes.
-   Authentication/authorization changes.
-   An external integration is added/removed.
-   Frontend architecture changes significantly.
-   Deployment architecture changes.

The architecture document should describe the **actual implemented
system**, not only planned functionality.

------------------------------------------------------------------------

## End of Document

**Freelancr --- Full-Stack Freelance Marketplace**\
**Architecture baseline:** `7561acb`
