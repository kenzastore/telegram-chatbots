# Specification: Refactor Core Chatbot Logic and DB to Google Apps Script

## Overview
This track refactors and adapts the core chatbot commands (`/start`, `/help`, `/balance`, `/view`) and the database integration module from the original Python/SQLite codebase into the Google Apps Script (GAS) TypeScript codebase. It also sets up a Jest-based unit testing suite locally to match the coverage and test cases of the original Python test suite.

## Scope
1. **Database Integration Refactoring (`database.ts`):**
   - Translate SQLite functions from `db.py` (`add_transaction`, `get_balance`, `get_history`, `get_all_transactions`) into TypeScript using raw Google Sheets REST API calls (using `UrlFetchApp` with user-level OAuth2 access tokens).
   - Maintain logic for monthly tab separation (`YYYY-MM Transactions`), auto-incrementing transaction IDs, and LockService for concurrency safety.
2. **Command Handlers (`handlers.ts` & `router.ts`):**
   - Translate the basic commands `/start`, `/help`, `/balance`, and `/view` from Python to TypeScript.
   - Ensure these commands respect the stateless webhook architecture and user-level authorization gate.
   - **Interactive `/add` Command Date Prompts:** Update the interactive `/add` command conversation flow to prompt for the transaction date. The prompt must default to today, with inline buttons for manual override (asking for custom date input in `YYYY-MM-DD` format) or confirmation.
3. **Jest Testing Setup:**
   - Install and configure `jest`, `ts-jest`, and `@types/jest` locally.
   - Implement mock definitions for global GAS objects (`UrlFetchApp`, `PropertiesService`, `LockService`) to allow tests to run locally in Node.js.
   - Write Jest test suites for `database.ts` and basic handlers (`/start`, `/help`, `/balance`, `/view`, `/add`) that mirror the test coverage from `test_db.py` and `test_bot.py`.

## Acceptance Criteria
- Basic commands and database helper functions are fully translated and functional in TypeScript/GAS.
- The interactive `/add` command prompts for a date, default to today, offers manual override or confirmation buttons, and successfully saves with the chosen date.
- A local Jest testing suite is fully configured, and running `npm test` runs all tests successfully.
- Test coverage for the translated database functions and basic handlers meets or exceeds 80%.
- Compilation of TypeScript files via `tsc` succeeds without warnings or errors.

## Out of Scope
- Porting other commands (`/edit`, `/clear`, `/quick`, `/summary`) or OAuth token exchange logic, which are covered by separate tracks.
- Modifying clasp deployment configurations.
