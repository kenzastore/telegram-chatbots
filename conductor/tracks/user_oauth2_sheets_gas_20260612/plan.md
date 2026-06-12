# Implementation Plan - Google OAuth2 Authentication (GAS Refactor)

## Phase 1: OAuth2 Unit Tests & Helper Methods Alignment [checkpoint: TBD]

- [ ] Task: Create OAuth2 Unit Tests
    - [ ] Create `tests/oauth.test.ts` with unit tests for `OAuth.getAuthUrl`.
    - [ ] Add unit tests for `OAuth.handleAuthRedirect` (testing successful token exchange, missing credentials/properties, and API response errors by mocking `UrlFetchApp`).
    - [ ] Add unit tests for `OAuth.getAccessTokenForUser` (testing cache hit using `CacheService`, cache miss with successful refresh, and refresh token failure).
    - [ ] Add unit tests for `OAuth.isUserAuthenticated` and `OAuth.logoutUser`.
    - [ ] Run the tests and confirm they fail (Red Phase).
- [ ] Task: Align and Implement OAuth Helpers
    - [ ] Refactor and verify the implementation of `oauth.ts` to pass all unit tests (Green Phase).
    - [ ] Verify that all typescript compiler checks succeed.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: OAuth2 Unit Tests & Helper Methods Alignment' (Protocol in workflow.md)

## Phase 2: Redirect HTTP GET Handler Verification & Integration [checkpoint: TBD]

- [ ] Task: Create tests for doGet Redirect Handler
    - [ ] Write tests in `tests/main.test.ts` (or `tests/oauth.test.ts`) for `doGet(e)` redirect callback.
    - [ ] Test successful query parameter extraction, invocation of `OAuth.handleAuthRedirect`, and returning of a successful HTML page response.
    - [ ] Test error scenarios (e.g., missing code/state, throw during authentication exchange) and verify appropriate HTML error responses.
    - [ ] Run tests and verify they fail (Red Phase).
- [ ] Task: Implement and Align doGet callback
    - [ ] Implement/update the `doGet` handler in `main.ts` to process Google redirects and return HTML outputs.
    - [ ] Run tests and verify they pass (Green Phase).
    - [ ] Run coverage checks and confirm Jest coverage of `oauth.ts` and related code is >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Redirect HTTP GET Handler' (Protocol in workflow.md)
