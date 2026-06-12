# Specification - Mandatory Google OAuth & State Cleanup (GAS Refactor)

## Overview
Adapt, align, and verify the mandatory Google OAuth login gate and session/state isolation from the original Python implementation into the Google Apps Script (GAS) codebase. This ensures that unauthenticated commands are blocked, a public `/cancel` command is supported, and all session state is properly cleaned up on logout or cancellation.

## Functional Requirements
1. **Mandatory Google Login Gate**:
   - The bot router (`router.ts`) must intercept incoming commands.
   - Access to `/start`, `/help`, `/google_login`, `/google_logout`, `/debug`, and `/cancel` must be allowed for unauthenticated users.
   - All other commands (e.g., `/add`, `/quick`, `/balance`, `/view`, `/clear`, `/edit`, `/summary`) and stateful text inputs must be blocked with a clear warning: "⚠️ **Google Login Required**\n\nYou must connect your Google account to use this command. Run /google_login to get started."
   - Unauthenticated callback queries must be answered with "⚠️ Login required."

2. **Public `/cancel` Command**:
   - Support `/cancel` as a public, unauthenticated command.
   - When executed, clear any active conversation state (specifically delete `STATE_<userId>` from `PropertiesService.getUserProperties()`).
   - Reply to the user with: "❌ **Operation cancelled.**"

3. **Logout Behavior & State Cleanup**:
   - When `/google_logout` is called:
     - Clear Google OAuth credentials and the spreadsheet ID mapping.
     - Clear the user's conversation state (`STATE_<userId>`) from `PropertiesService.getUserProperties()`.
     - Respond with: "👋 **Logged out successfully.** Your Google credentials and mappings have been deleted."

4. **Multi-User Isolation**:
   - Verify that all database and state management uses the user's Telegram ID to scope spreadsheet configuration and active states, preventing cross-user data leakage.

## Non-Functional Requirements
- **TDD / Unit Testing**: Ensure `tests/handlers.test.ts` contains tests validating command blocking, `/cancel` logic, `/google_logout` state cleanup, and multi-user isolation.
- **Coverage**: Target >80% code coverage.
- **Type Safety**: Fully typed in TypeScript.

## Acceptance Criteria
- `/cancel` command resets state and is accessible unauthenticated.
- `/google_logout` command cleans up active state and credentials.
- All transactional commands (e.g. `/balance`, `/add`) are blocked until Google login is completed.
- All unit tests pass successfully.
