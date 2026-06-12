# Implementation Plan - Google OAuth2 Authentication (GAS Refactor)

## Phase 1: OAuth2 Unit Tests & Helper Methods Alignment [checkpoint: 8ddf259]

- [x] Task: Create OAuth2 Unit Tests (abfadaf)
    - [x] Create `tests/oauth.test.ts` with unit tests for `OAuth.getAuthUrl`.
    - [x] Add unit tests for `OAuth.handleAuthRedirect` (testing successful token exchange, missing credentials/properties, and API response errors by mocking `UrlFetchApp`).
    - [x] Add unit tests for `OAuth.getAccessTokenForUser` (testing cache hit using `CacheService`, cache miss with successful refresh, and refresh token failure).
    - [x] Add unit tests for `OAuth.isUserAuthenticated` and `OAuth.logoutUser`.
    - [x] Run the tests and confirm they fail (Red Phase).
- [x] Task: Align and Implement OAuth Helpers (abfadaf)
    - [x] Refactor and verify the implementation of `oauth.ts` to pass all unit tests (Green Phase).
    - [x] Verify that all typescript compiler checks succeed.
- [x] Task: Conductor - User Manual Verification 'Phase 1: OAuth2 Unit Tests & Helper Methods Alignment' (Protocol in workflow.md) (8ddf259)

## Phase 2: Redirect HTTP GET Handler Verification & Integration [checkpoint: TBD]

- [x] Task: Create tests for doGet Redirect Handler (37f2071)
    - [x] Write tests in `tests/main.test.ts` (or `tests/oauth.test.ts`) for `doGet(e)` redirect callback.
    - [x] Test successful query parameter extraction, invocation of `OAuth.handleAuthRedirect`, and returning of a successful HTML page response.
    - [x] Test error scenarios (e.g., missing code/state, throw during authentication exchange) and verify appropriate HTML error responses.
    - [x] Run tests and verify they fail (Red Phase).
- [x] Task: Implement and Align doGet callback (37f2071)
    - [x] Implement/update the `doGet` handler in `main.ts` to process Google redirects and return HTML outputs.
    - [x] Run tests and verify they pass (Green Phase).
    - [x] Run coverage checks and confirm Jest coverage of `oauth.ts` and related code is >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Redirect HTTP GET Handler' (Protocol in workflow.md)
