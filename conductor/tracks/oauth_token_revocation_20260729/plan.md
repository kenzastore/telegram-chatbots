# Implementation Plan - Handle Google OAuth Token Revocation/Expiration Gracefully

## Phase 1: Test-Driven Development for Token Cleanup & Error Handling [checkpoint: 8f17096]

- [x] Task: Write failing unit tests for OAuth token revocation cleanup (df475db)
    - [ ] Add unit tests in `tests/oauth.test.ts` verifying that `OAuth.getAccessTokenForUser` deletes `REFRESH_TOKEN_<userId>` and `ACCESS_TOKEN_<userId>` when Google API returns `invalid_grant` or token expired error.
    - [ ] Add unit tests in `tests/handlers.test.ts` verifying that commands catch expired token errors and return a user-friendly Telegram error message with `/google_login` prompt.
    - [ ] Confirm tests fail (Red Phase).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test-Driven Development for Token Cleanup & Error Handling' (Protocol in workflow.md) (8f17096)

## Phase 2: Implementation & Verification [checkpoint: 47712f3]

- [x] Task: Implement automatic token cleanup in `OAuth.getAccessTokenForUser` (5586393)
    - [x] In `oauth.ts`, catch error response from Google token refresh endpoint (`response.getResponseCode() !== 200 || result.error`).
    - [x] Delete `REFRESH_TOKEN_<userId>` from `PropertiesService` and remove `ACCESS_TOKEN_<userId>` from `CacheService`.
    - [x] Throw clear error message `Google OAuth session has expired or was revoked. Please log in again using /google_login.`.
- [x] Task: Enhance error reporting in command handlers and webhook doPost (5586393)
    - [x] Ensure `doPost` in `main.ts` formats token expiration errors into friendly Telegram messages instead of raw system error stacks.
- [x] Task: Verify unit tests pass and code coverage >80% (Green Phase) (5586393)
    - [x] Run full test suite `CI=true npm test`.
    - [x] Verify test coverage remains >80%.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Verification' (Protocol in workflow.md) (47712f3)
