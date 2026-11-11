# FREELANCR — PHASE 1B
# USER SCHEMA EXTENSION & PROFILE API READINESS AUDIT

**Audit Date:** 2026-11-11  
**Execution Mode:** STRICT READ-ONLY SOURCE AUDIT & IMPLEMENTATION PLANNING  
**Repository Working Tree Status:** Stable (Commit `fd457a3`, Phase 1A Verified, 213/213 Tests Passing)

---

## 1. Executive Summary & Audit Verdict

Following the successful implementation, lifecycle verification, and test gap closure of Phase 1A (Secure Email OTP Registration), this audit establishes the complete architectural and operational readiness for **Phase 1B: User Schema Extension & Profile Onboarding APIs**.

### Audit Verdict: **READY WITH CONDITIONS**

- **Readiness Summary:**
  The repository's modular layering (`routes` -> `validation` -> `controller` -> `service` -> `repository` -> `model`), authentication infrastructure, and fail-closed test environment are fully prepared for the additive schema extension.
- **Conditions Required Prior to Implementation:**
  1. **Strict Field Reuse:** All existing profile properties (`bio`, `phone`, `location`, `skills`, `avatar`, `resume`, `resumePublicId`, `portfolio`) must be reused as first-class fields; no duplicative keys or nested conflicting schemas may be introduced.
  2. **Zero Schema Default on `onboardingStatus`:** Maintain the Phase 1A invariant where `onboardingStatus` has no blanket Mongoose schema default.
  3. **Deterministic Legacy Resolution Helper:** Implement a pure, non-mutating `resolveUserOnboardingStatus(user)` helper that evaluates missing, undefined, `null`, or legacy malformed statuses to `"completed"` without writing to MongoDB.
  4. **Strict Role-Gated Endpoints:** `PUT /api/v1/users/onboarding/freelancer` and `PUT /api/v1/users/onboarding/client` must enforce role verification (`req.user.role === 'freelancer'` and `'client'` respectively) using token claims from `authenticate`, preventing cross-role profile pollution or client-supplied `_id` tampering.

---

## 2. Actual Repository Baseline & Current User Schema Assessment

### 2.1 File References
- Schema: [`server/src/modules/users/user.model.ts`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.model.ts#L4-L125)
- Types: [`server/src/modules/users/user.types.ts`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.types.ts#L1-L39)
- Repository: [`server/src/modules/users/user.repository.ts`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/users/user.repository.ts#L1-L221)
- MatchScore Invariants: [`server/src/modules/jobs/matchScore.service.ts`](file:///c:/Users/hp/OneDrive/Desktop/Freelancr/server/src/modules/jobs/matchScore.service.ts#L14-L21)

### 2.2 Current User Properties & Reuse Assessment
| Existing Property | BSON Type | Status in Phase 1B | Architectural Role & Compatibility |
| :--- | :--- | :--- | :--- |
| `fullName` | String | **REUSE** | Retain as primary display name. |
| `username` | String | **REUSE** | Unique identifier slug. |
| `email` | String | **REUSE** | Normalized unique email. |
| `password` | String | **REUSE (Private)** | Hashed with bcrypt (`select: false`). |
| `role` | Enum (`client`, `freelancer`, `admin`) | **REUSE** | Governs onboarding endpoint access. |
| `avatar` | String | **REUSE** | Cloudinary URL. |
| `bio` | String | **REUSE** | Professional summary / description. |
| `phone` | String | **REUSE** | Contact phone. |
| `location` | String | **REUSE** | Free-form legacy location string; structured `city` and `country` are added alongside. |
| `skills` | `[String]` | **REUSE** | Array of string skills. Used directly by `MatchScoreService`. Additive `skillProficiencies` array introduced for granular depth. |
| `resume` / `resumePublicId` | String | **REUSE** | Existing Cloudinary PDF resume link and asset public ID. |
| `portfolio` | `[{ title, image, publicId }]` | **REUSE** | Existing portfolio items. Extended to allow `description`, `projectUrl`, and `academic: boolean` for freshers. |
| `isVerified` | Boolean | **REUSE** | Email verification indicator (`true` post-OTP). |
| `isActive` | Boolean | **REUSE** | Account standing. |
| `onboardingStatus` | String (optional, no default) | **REUSE** | States: `"pending"`, `"completed"`, `"exempt"`, or `undefined`. |

---

## 3. Proposed Additive Schema & Extensions

### 3.1 Freshers & Academic Support Architecture
To accommodate entry-level freelancers ("freshers") who have no corporate employment history:
1. `experienceLevel` accommodates `"entry"`, `"intermediate"`, and `"expert"`.
2. `education` captures degrees, institutions, and graduation years.
3. `projects` and `portfolio` support personal and academic projects (`projectType: "academic" | "personal" | "commercial"`).
4. `employmentHistory` is strictly optional, allowing freshers with zero corporate tenure to complete onboarding seamlessly.

### 3.2 Skill Proficiencies & MatchScoreService Alignment
In `server/src/modules/jobs/matchScore.service.ts` (lines 14–21), `FreelancerProfile` expects:
- `skills?: string[]`
- `experienceLevel?: string`
- `preferredCategories?: string[]`
- `minBudget?: number`
- `maxBudget?: number`
- `remoteOnly?: boolean`

The Phase 1B schema directly fulfills these expectations without requiring any refactoring of `MatchScoreService`:
- Flat `skills: string[]` is maintained and synced whenever structured `skillProficiencies` are updated.
- `experienceLevel`, `preferredCategories`, `budgetPreferences`, and `workArrangement` are stored natively as first-class profile attributes.

---

## 4. Exact TypeScript Interfaces (`user.types.ts`)

```typescript
export type UserRole = "client" | "freelancer" | "admin";
export type OnboardingStatus = "pending" | "completed" | "exempt";
export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type SkillProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type WorkArrangement = "remote" | "hybrid" | "on-site";

export interface ISkillProficiency {
  name: string;
  level: SkillProficiencyLevel;
  yearsOfExperience?: number;
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  isCurrent?: boolean;
}

export interface IProject {
  title: string;
  description?: string;
  projectUrl?: string;
  projectType: "academic" | "personal" | "commercial";
  skillsUsed: string[];
  imageUrl?: string;
  publicId?: string;
}

export interface IFreelancerProfileExtension {
  title?: string; // e.g. "Full Stack TypeScript Engineer"
  experienceLevel?: ExperienceLevel;
  hourlyRate?: number; // in lowest currency unit (paise) or standard units
  skillProficiencies?: ISkillProficiency[];
  education?: IEducation[];
  projects?: IProject[];
  preferredCategories?: string[];
  workArrangement?: WorkArrangement;
  remoteOnly?: boolean;
  minBudget?: number;
  maxBudget?: number;
  availability?: "available" | "busy" | "not_available";
}

export interface ICompanyProfileExtension {
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferredBudgetRange?: {
    min?: number;
    max?: number;
  };
  preferredCategories?: string[];
}

export interface IUser {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;

  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  city?: string;
  country?: string;

  skills: string[];
  isVerified: boolean;
  isActive: boolean;
  onboardingStatus?: string; // no schema default

  // Freelancer specific
  freelancerProfile?: IFreelancerProfileExtension;

  // Client specific
  companyProfile?: ICompanyProfileExtension;

  googleId?: string;
  authProvider?: "local" | "google";
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  resume?: string;
  resumePublicId?: string;
  portfolio?: {
    title: string;
    image: string;
    publicId: string;
    description?: string;
    projectUrl?: string;
  }[];
}
```

---

## 5. Onboarding Status Resolution Design (`resolveUserOnboardingStatus`)

### 5.1 Pure Non-Mutating Function
To preserve legacy document compatibility without database-wide backfills, the resolution logic is encapsulated in a pure helper in `server/src/modules/users/user.utils.ts`:

```typescript
/**
 * Resolves the effective onboarding status of a user without mutating or persisting the document.
 * 
 * Rules:
 * 1. Explicit 'pending' -> 'pending'
 * 2. Explicit 'completed' -> 'completed'
 * 3. Explicit 'exempt' -> 'completed'
 * 4. Missing, undefined, null, or unknown historical status -> 'completed' (legacy user access)
 */
export function resolveUserOnboardingStatus(
  user?: { onboardingStatus?: string | null } | null
): "pending" | "completed" {
  if (!user || !user.onboardingStatus) {
    return "completed";
  }

  const normalized = user.onboardingStatus.trim().toLowerCase();
  if (normalized === "pending") {
    return "pending";
  }

  // All other values ('completed', 'exempt', legacy strings) resolve to completed
  return "completed";
}
```

### 5.2 Deterministic Invariants
1. **Zero Database Mutation:** Calling `resolveUserOnboardingStatus` never triggers a MongoDB `save()` or `updateOne()`.
2. **Safe Serialization:** In `AuthService.sanitizeUser(user)` or `UserService.getProfile()`, `onboardingStatus` is populated via `resolveUserOnboardingStatus(user)` if client representation requires it.

---

## 6. API Specifications

### 6.1 Freelancer Onboarding API
- **Endpoint:** `PUT /api/v1/users/onboarding/freelancer`
- **Authentication:** Bearer JWT required (`authenticate` middleware).
- **Authorization:** `authorize("freelancer")` middleware (rejects clients with `403 Forbidden`).
- **Target User:** Derived strictly from `req.user.id` (never from `req.body.id` or `req.params.id`).
- **Request Body (DTO):**
  ```json
  {
    "title": "Full Stack Engineer",
    "bio": "Experienced in building Node.js microservices.",
    "city": "Bengaluru",
    "country": "India",
    "skills": ["TypeScript", "Node.js", "MongoDB", "React"],
    "skillProficiencies": [
      { "name": "TypeScript", "level": "expert", "yearsOfExperience": 4 },
      { "name": "React", "level": "intermediate", "yearsOfExperience": 2 }
    ],
    "experienceLevel": "intermediate",
    "hourlyRate": 250000,
    "education": [
      {
        "institution": "National Institute of Technology",
        "degree": "B.Tech in Computer Science",
        "startYear": 2020,
        "endYear": 2024
      }
    ],
    "projects": [
      {
        "title": "Freelancr Platform",
        "projectType": "academic",
        "skillsUsed": ["TypeScript", "Express", "MongoDB"],
        "projectUrl": "https://github.com/example/freelancr"
      }
    ],
    "preferredCategories": ["Web Development", "Backend"],
    "workArrangement": "remote",
    "remoteOnly": true
  }
  ```
- **Update Semantics:**
  - Validates and sanitizes payload against express-validator rules.
  - Updates `user.freelancerProfile`, top-level `skills`, `bio`, `city`, and `country`.
  - Sets `onboardingStatus: "completed"`.
  - Atomically executed via `UserRepository.updateProfile(userId, updateDoc)`.
- **Response:**
  - Status `200 OK`
  - Body: `{ success: true, message: "Freelancer onboarding completed successfully", data: SanitizedUserDto }`

---

### 6.2 Client Onboarding API
- **Endpoint:** `PUT /api/v1/users/onboarding/client`
- **Authentication:** Bearer JWT required (`authenticate` middleware).
- **Authorization:** `authorize("client")` middleware (rejects freelancers with `403 Forbidden`).
- **Target User:** Derived strictly from `req.user.id`.
- **Request Body (DTO):**
  ```json
  {
    "companyName": "Acme Innovations Ltd",
    "companyWebsite": "https://acme.example.com",
    "industry": "FinTech",
    "companySize": "11-50",
    "city": "Mumbai",
    "country": "India",
    "billingAddress": {
      "street": "123 Tech Park",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    },
    "preferredBudgetRange": {
      "min": 500000,
      "max": 2500000
    },
    "preferredCategories": ["Mobile Apps", "Blockchain"]
  }
  ```
- **Update Semantics:**
  - Updates `user.companyProfile`, `city`, and `country`.
  - Sets `onboardingStatus: "completed"`.
- **Response:**
  - Status `200 OK`
  - Body: `{ success: true, message: "Client onboarding completed successfully", data: SanitizedUserDto }`

---

## 7. Security & Backward Compatibility Verification

1. **Mass-Assignment Guard:**
   Controllers must extract strictly white-listed attributes. Direct assignment of raw `req.body` to database query parameters is prohibited.
2. **Data Leakage Prevention:**
   Responses are filtered via `AuthService.sanitizeUser()`, ensuring `password`, `refreshToken`, `googleId`, `passwordResetToken`, and internal keys are never serialized.
3. **Existing Upload Endpoints Untouched:**
   `POST /api/v1/users/resume` and `POST /api/v1/users/portfolio` continue to function without alteration.
4. **Zero Impact on MatchScoreService:**
   `MatchScoreService.compute()` continues to read `freelancer.skills`, `experienceLevel`, and budget preferences without modification.

---

## 8. File-by-File Implementation Plan

| File | Proposed Modifications |
| :--- | :--- |
| `server/src/modules/users/user.types.ts` | Add `IFreelancerProfileExtension`, `ICompanyProfileExtension`, `ISkillProficiency`, `IEducation`, `IProject`, and update `IUser`. |
| `server/src/modules/users/user.model.ts` | Declare subschemas for `freelancerProfile` and `companyProfile` (no defaults on `onboardingStatus`). |
| `server/src/modules/users/user.utils.ts` | Implement `resolveUserOnboardingStatus()`. |
| `server/src/modules/users/user.validation.ts` | Add `freelancerOnboardingValidation` and `clientOnboardingValidation` with strict type, enum, and length rules. |
| `server/src/modules/users/user.service.ts` | Add `completeFreelancerOnboarding(userId, dto)` and `completeClientOnboarding(userId, dto)`. |
| `server/src/modules/users/user.controller.ts` | Add `onboardFreelancer` and `onboardClient` handlers. |
| `server/src/modules/users/user.routes.ts` | Wire `PUT /onboarding/freelancer` and `PUT /onboarding/client` with authentication and role-authorization. |
| `server/test/user-onboarding.test.ts` | Create comprehensive unit, integration, and legacy regression test suite. |

---

## 9. Comprehensive Regression Test Plan

1. **Freelancer Onboarding Valid Run:** Verify full payload saves, sets `onboardingStatus: "completed"`, and updates `skills`.
2. **Client Onboarding Valid Run:** Verify company details save and set `onboardingStatus: "completed"`.
3. **Cross-Role Access Rejection:** Verify client cannot call `/onboarding/freelancer` (403), and freelancer cannot call `/onboarding/client` (403).
4. **Unauthenticated Rejection:** Verify unauthenticated requests return 401.
5. **Freshers Payload Verification:** Verify freelancer with academic projects and education, but zero employment history, successfully completes onboarding.
6. **Legacy Hydration Invariant:** Verify hydrated documents without `onboardingStatus` evaluate to `"completed"` via `resolveUserOnboardingStatus()`.
7. **New Registration Invariant:** Verify newly registered OTP users start with `onboardingStatus: "pending"`.
8. **Teardown & Isolation:** Use `afterEach()` for test HTTP servers and maintain the fail-closed `test-bootstrap.ts`.

---

## 10. Conclusion & Recommendation

The repository architecture and test infrastructure are completely prepared for Phase 1B. Implementation may proceed upon owner approval of this plan.

