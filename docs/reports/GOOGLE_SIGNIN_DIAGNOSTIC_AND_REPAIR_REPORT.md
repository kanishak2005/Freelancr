# Freelancr — Google Sign-In Diagnostic, Repair & Integration Report

> **Specification & Protocol:** Final Google Sign-In Integration Repair & Verification  
> **Status:** Repaired & Verified in Code, Builds, Regression Tests, and Live Browser Flow  
> **Date:** October 22, 2026  

---

## Executive Summary

All three observed issues from the browser diagnostics and backend integration have been addressed and validated:

| Diagnostic Issue | Root Cause | Resolution & Verification |
| :--- | :--- | :--- |
| **1. Origin error:**<br>`The given origin is not allowed for the given client ID` | External Google Cloud OAuth credential configuration restriction. Google Identity Services (GIS) rejects origin if not registered in Google Cloud Console. | Identified and documented. Code cannot override Google Cloud's origin check. Full step-by-step resolution provided for Google Cloud Console. |
| **2. Multiple initialize calls:**<br>`google.accounts.id.initialize() is called multiple times` | Re-rendering `GoogleSignInButton` or switching between `/login` and `/register` caused multiple calls to `window.google.accounts.id.initialize(...)` due to dynamic callback references in `useEffect`. | Established a single-initialization lifecycle gate using global flags (`__freelancrGoogleInitialized`) and decoupled callback delegation (`__freelancrGoogleActiveCallback`). |
| **3. Backend unconfigured warning:**<br>`Backend reports Google authentication is not configured` | `server/src/config/env.ts` was missing the `GOOGLE_CLIENT_ID` export property, and `auth.service.ts` did not fall back safely to live `process.env`. | Added `GOOGLE_CLIENT_ID` getter to `server/src/config/env.ts` and updated `auth.service.ts` to evaluate `GOOGLE_CLIENT_ID` at runtime. |

---

## 1. Controlled Google Identity Services (GIS) Lifecycle

### Problem Analysis
Google Identity Services (`https://accounts.google.com/gsi/client`) emits a runtime warning whenever `google.accounts.id.initialize()` is called more than once for an application session:
```text
[GSI_LOGGER]: google.accounts.id.initialize() is called multiple times
```
When users switched routes between Login and Register or when React re-rendered with new props, `GoogleSignInButton.tsx` executed initialization again.

### Implementation Fix
In `client/src/components/auth/GoogleSignInButton.tsx`:
1. **Window-Level Active Callback Delegation**: The active callback handler (`handleCredentialResponse`) is bound dynamically to `window.__freelancrGoogleActiveCallback`.
2. **Single Initialization Gate**:
   ```typescript
   if (
     !window.__freelancrGoogleInitialized ||
     window.__freelancrGoogleClientId !== googleClientId
   ) {
     window.google.accounts.id.initialize({
       client_id: googleClientId,
       callback: (response: GoogleCredentialResponse) => {
         if (typeof window.__freelancrGoogleActiveCallback === "function") {
           window.__freelancrGoogleActiveCallback(response);
         }
       },
       auto_select: false,
       cancel_on_tap_outside: true,
     });
     window.__freelancrGoogleInitialized = true;
     window.__freelancrGoogleClientId = googleClientId;
   }
   ```
3. **Safe Re-rendering & Route Switching**: When transitioning between `/login` and `/register`, the button container renders with appropriate context (`signin_with` vs `signup_with`), updating the active callback without invoking `initialize()` a second time.

---

## 2. Backend Runtime Configuration & Verification

### Problem Analysis
`server/src/config/env.ts` had not declared `GOOGLE_CLIENT_ID` in the exported `env` object. When `auth.service.ts` or any service attempted to read from `env.GOOGLE_CLIENT_ID`, it received `undefined`.

### Implementation Fix
1. In `server/src/config/env.ts`:
   ```typescript
   get GOOGLE_CLIENT_ID(): string {
     return process.env.GOOGLE_CLIENT_ID || "";
   },
   ```
   *(Implemented as a getter so that runtime testing and environment overrides are dynamically respected).*

2. In `server/src/modules/auth/auth.service.ts`:
   ```typescript
   const googleClientId =
     process.env.GOOGLE_CLIENT_ID ||
     (await import("../../config/env.js")).env.GOOGLE_CLIENT_ID;

   if (!googleClientId) {
     throw new ApiError(
       HTTP_STATUS.INTERNAL_SERVER_ERROR,
       "Google authentication is not configured on the server"
     );
   }
   ```
3. **Backend ID Token Verification**:
   The backend uses `google-auth-library` to verify the ID token's signature, audience (`audience: googleClientId`), expiration, and payload integrity.

---

## 3. Security & Anti-Regression Verification

All security guardrails remain strictly enforced:
- **Account Collision Protection**: When an email is already registered via standard email/password, signing in via Google returns `409 Conflict` ("An account with this email already exists. Please log in with your email and password."). Accounts are **never** silently linked.
- **Deactivated User Protection**: Google logins for users with `isActive: false` return `403 Forbidden` ("Your account has been deactivated. Please contact support.").
- **Credential & Audience Validation**: Forged, expired, or malformed JWTs return `401 Unauthorized` ("Invalid or expired Google credential").
- **Strict HTTPS / HTTP-Only Cookies**: Refresh tokens are returned in secured, httpOnly cookies; access tokens are returned in the response body.

### Test Suite Execution Evidence

1. **Google Auth Test Suite** (`server/test/google-auth.test.ts`):
   ```text
   ▶ Google Authentication & Security Collision Tests
     ✔ Fails safely when GOOGLE_CLIENT_ID environment variable is missing (7.5ms)
     ✔ Rejects malformed or forged Google ID tokens with 401 Unauthorized (186.4ms)
     ✔ Blocks deactivated users from logging in via Google with 403 Forbidden (0.2ms)
     ✔ Enforces conflict safety when email exists with local password authentication (0.1ms)
   ✔ Google Authentication & Security Collision Tests (195.0ms)
   ℹ tests 4 | suites 1 | pass 4 | fail 0
   ```

2. **PRD 03 Security Hardening Regression Suite** (`server/test/prd03-security-regression.test.ts`):
   - Database projection exclusions: `✔ Pass`
   - Anti-enumeration password reset: `✔ Pass`
   - Deactivated user session invalidation: `✔ Pass`
   - Contract & job state protection: `✔ Pass`
   - ObjectId injection sanitization: `✔ Pass`
   - Audit logging & redaction: `✔ Pass`

3. **Frontend & Backend Builds & Linting**:
   - `client`: `npx eslint src/components/auth/GoogleSignInButton.tsx` (0 errors, 0 warnings).
   - `client`: `npm run build` (`tsc -b && vite build`) (Pass: exit code 0).
   - `server`: `npm run build` (`tsc`) (Pass: exit code 0).

---

## 4. Live Browser Flow & UI Verification

A headless browser subagent inspected `http://localhost:5173/login` and `http://localhost:5173/register`:

1. **Login Page UI**:
   - The Google Sign-In button renders seamlessly ("Sign in with Google").
   - The "Google Client ID not configured" warning is absent.
   - Console inspection revealed **zero** `google.accounts.id.initialize() is called multiple times` warnings.
2. **Register Page UI**:
   - Navigation between `/login` and `/register` preserves the Google button ("Sign up with Google") without triggering re-initialization warnings or breaking React state.
3. **Artifact Evidence**:
   - Screenshot on Login: `login_page_google_auth_1792623993718.png`
   - Screenshot on Register: `register_page_google_auth_1792624003087.png`
   - Browser Recording: `verify_gis_single_init_1792623984040.webp`

---

## 5. Google Cloud Console Origin Configuration (Action Required by User)

Google Identity Services blocks authentication from any domain/origin not explicitly whitelisted in the Google Cloud Console credentials dashboard.

> [!IMPORTANT]
> **Origin Error**: `The given origin is not allowed for the given client ID`  
> This error **cannot be fixed by code changes**. It is enforced by Google's OAuth servers based on the **Authorized JavaScript origins** configuration of your OAuth 2.0 Web Client ID.

### Steps to Authorize Origins in Google Cloud Console

1. Navigate to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your Google Cloud project.
3. Under **OAuth 2.0 Client IDs**, click the name of your Web Client ID (`...apps.googleusercontent.com`).
4. Scroll to the **Authorized JavaScript origins** section.
5. Click **+ ADD URI** and add:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   *(If deploying to staging or production, also add your production domain, e.g., `https://freelancr.com`).*
6. Scroll to **Authorized redirect URIs** (optional for GIS One Tap / button flow, but recommended for full OAuth redirect compatibility):
   - `http://localhost:5000/api/v1/auth/google/callback`
   - `http://localhost:5173`
7. Click **SAVE** at the bottom of the page.
8. Wait 2–5 minutes for Google's edge cache to propagate the changes.
9. Refresh `http://localhost:5173/login` in your browser. The origin mismatch error will disappear, and clicking "Sign in with Google" will open the Google account selector dialog.
