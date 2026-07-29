# Implementation Plan - Handle Google OAuth Token Revocation/Expiration Gracefully

## Phase 1: Test-Driven Development for Token Cleanup & Error Handling

- [ ] Task: Write failing unit tests for OAuth token revocation cleanup
    - [ ] Add unit tests in `tests/oauth.test.ts` verifying that `OAuth.getAccessTokenForUser` deletes `REFRESH_TOKEN_<userId>` and `ACCESS_TOKEN_<userId>` when Google API returns `invalid_grant` or token expired error.
    - [ ] Add unit tests in `tests/handlers.test.ts` verifying that commands catch expired token errors and return a user-friendly Telegram error message with `/google_login` prompt.
    - [ ] Confirm tests fail (Red Phase).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test-Driven Development for Token Cleanup & Error Handling' (Protocol in workflow.md)

## Phase 2: Implementation & Verification

- [ ] Task: Implement automatic token cleanup in `OAuth.getAccessTokenForUser`
    - [ ] In `oauth.ts`, catch error response from Google token refresh endpoint (`response.getResponseCode() !== 200 || result.error`).
    - [ ] Delete `REFRESH_TOKEN_<userId>` from `PropertiesService` and remove `ACCESS_TOKEN_<userId>` from `CacheService`.
    - [ ] Throw clear error message `Google OAuth session has expired or was revoked. Please log in again using /google_login.`.
- [ ] Task: Enhance error reporting in command handlers and webhook doPost
    - [ ] Ensure `doPost` in `main.ts` formats token expiration errors into friendly Telegram messages instead of raw system error stacks.
- [ ] Task: Verify unit tests pass and code coverage >80% (Green Phase)
    - [ ] Run full test suite `CI=true npm test`.
    - [ ] Verify test coverage remains >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Verification' (Protocol in workflow.md)
