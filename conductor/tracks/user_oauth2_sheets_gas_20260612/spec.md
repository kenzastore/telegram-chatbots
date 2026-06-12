# Specification - Google OAuth2 Authentication (GAS Refactor)

## Overview
Adapt, align, and verify the Google OAuth2 authentication flow from the original Python implementation into the Google Apps Script (GAS) codebase. This includes token retrieval, caching, refresh token storage, and the web app redirect handler (`doGet`). The implementation will be fully tested using unit tests with mocked GAS services.

## Functional Requirements
1. **OAuth2 URL Generation (`getAuthUrl`)**:
   - Generate Google OAuth2 authorization URL requesting `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` scopes.
   - Use Google Client ID from script properties and register the redirect URI.
   - Pass the Telegram `userId` in the `state` parameter to associate the credentials with the correct user.

2. **Redirect Callback Handler (`doGet` / `handleAuthRedirect`)**:
   - Implement `doGet(e)` to handle HTTP GET requests from Google's OAuth redirect.
   - Extract `code` and `state` (representing `userId`) from request parameters.
   - Exchange `code` for access and refresh tokens via Google token endpoint using `UrlFetchApp`.
   - Securely store the `refresh_token` in `PropertiesService` (keyed by Telegram user ID, e.g., `REFRESH_TOKEN_<userId>`).
   - Cache the `access_token` in `CacheService` to minimize token refresh requests.
   - Return a professional, clean HTML response page informing the user of successful authentication.

3. **Access Token Retrieval & Refresh (`getAccessTokenForUser`)**:
   - Look up the access token in the cache first.
   - If not cached, retrieve the refresh token from `PropertiesService`, call the token endpoint to get a new access token, and cache it.
   - Throw a clear error if the user has no credentials.

4. **Authentication Check & Logout (`isUserAuthenticated`, `logoutUser`)**:
   - `isUserAuthenticated(userId)` returns `true` if a refresh token exists in properties for that user.
   - `logoutUser(userId)` removes the refresh token, spreadsheet ID, and cached access token.

## Non-Functional Requirements
- **TDD / Unit Testing**: Create unit tests in `tests/oauth.test.ts` covering success and error flows for all OAuth functions, using mock implementations of `PropertiesService`, `CacheService`, `UrlFetchApp`, and `Utilities`.
- **Coverage**: Target >80% code coverage for the `oauth.ts` module.
- **Type Safety**: Fully typed in TypeScript.

## Acceptance Criteria
- Generating authorization URL includes correct client ID, redirect URI, scopes, and state.
- Exchanging the authorization code updates the cache with access token and `PropertiesService` with refresh token.
- `getAccessTokenForUser` returns a valid cached token or refreshes it via Google API.
- `logoutUser` cleans up all credentials and spreadsheet associations.
- The `doGet(e)` function handles redirects, extracts params, executes exchange, and returns HTML.
- Jest unit tests for `oauth.ts` pass and cover success/error scenarios.

## Out of Scope
- Implementing the mandatory login gate checking middleware in bot command routing (handled by a separate track).
- Exporting sheets logic (handled by other tracks).
