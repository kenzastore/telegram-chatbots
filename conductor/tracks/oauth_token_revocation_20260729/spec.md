# Track Specification: Handle Google OAuth Token Revocation/Expiration Gracefully

## Overview
When a user's Google OAuth refresh token expires (e.g. 7-day test mode limit) or is revoked by the user in Google Account settings, requests to Google API fail with `400 Bad Request: Token has been expired or revoked.`. Currently, this throws a raw system error `❌ System Error`. 

This track enhances error handling across `oauth.ts`, `handlers.ts`, and `main.ts` so that expired or revoked OAuth refresh tokens are automatically cleared, and users receive a clear, actionable message guiding them to re-authenticate with `/google_login`.

## Functional Requirements
1. **Automatic Credential Cleanup (`oauth.ts`)**:
   - Detect Google API token refresh error payloads containing `invalid_grant`, `Token has been expired or revoked`, or `400 Bad Request`.
   - When detected in `OAuth.getAccessTokenForUser(userId)`, automatically delete `REFRESH_TOKEN_<userId>` from `PropertiesService` and clear `ACCESS_TOKEN_<userId>` from `CacheService`.
   - Throw a distinct, identifiable error message (`Google OAuth session has expired or was revoked. Please log in again using /google_login.`).

2. **User-Friendly Messaging & Recovery (`handlers.ts` & `main.ts`)**:
   - Intercept Google session expiration errors in command handlers and webhook/callback handlers.
   - Reply to the Telegram user with a clear, friendly message:
     *"⚠️ <b>Google Session Expired</b>\n\nYour Google account session has expired or was disconnected. Please re-authenticate to continue.\n\n👉 Send /google_login to re-connect."*

3. **Global Command & Callback Scope**:
   - Ensure all transactional and query commands (`/add`, `/edit`, `/clear`, `/quick`, `/view`, `/summary`, `/balance`) and inline keyboard callbacks handle OAuth token expiration gracefully without dumping raw stack traces.

## Acceptance Criteria
- [ ] `OAuth.getAccessTokenForUser(userId)` catches 400 `invalid_grant` / expired token errors from Google API.
- [ ] Stored refresh token and cached access token for `userId` are automatically deleted upon detecting token revocation/expiration.
- [ ] A custom/clear error is thrown instead of raw HTTP fetch errors.
- [ ] Command handlers catch this error and display a user-friendly "Google Session Expired" message with instructions to run `/google_login`.
- [ ] Unit tests pass and verify both token deletion and user messaging.
