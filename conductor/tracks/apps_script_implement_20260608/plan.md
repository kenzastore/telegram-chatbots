# Implementation Plan - Google Apps Script Bot Implementation & Stabilization

## Phase 1: Environment Setup & OAuth2 Authentication [checkpoint: a80c490]

- [x] Task: Set Up clasp Config and OAuth Library Configuration
    - [x] Configure `appsscript.json` with required OAuth scopes (Drive, Spreadsheet, Script Properties).
    - [x] Set up the redirect URI and developer credentials in Script Properties.
- [x] Task: Implement Google OAuth2 Authentication Flow
    - [x] Write `/google_login` and `/google_logout` handlers.
    - [x] Write the `doGet(e)` callback to handle authorization code redirects and retrieve/store refresh tokens.
    - [x] Create authentication gate middleware to block unauthenticated transactional commands.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment Setup & OAuth2 Authentication' (Protocol in workflow.md)

## Phase 2: Database Wrapper & Core Commands [checkpoint: d0ecaf0]

- [x] Task: Implement Google Sheets Database Wrapper
    - [x] Write functions to check, create, and initialize the `Telegram Savings Bot` spreadsheet in the user's Google Drive.
    - [x] Implement worksheet sheet creators for monthly tabs (`YYYY-MM Transactions`).
    - [x] Write transaction append and balance calculation helpers using LockService.
- [x] Task: Implement State Machine Router & Core Chatbot Commands
    - [x] Write state machine update router to store user progress in PropertiesService.
    - [x] Implement `/start`, `/help`, `/balance`, and `/view` commands.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database Wrapper & Core Commands' (Protocol in workflow.md)

## Phase 3: Advanced Commands & Parsing

- [ ] Task: Implement Interactive `/add` and `/quick` commands
    - [ ] Write the multi-step interactive conversation flow for `/add`.
    - [ ] Integrate the natural language parser `quick.ts` with confirmation buttons.
- [ ] Task: Implement `/edit`, `/clear`, and `/summary` commands
    - [ ] Write `/edit` command to modify transactions by ID.
    - [ ] Write `/clear` command with double confirmation.
    - [ ] Write `/summary` command for weekly/monthly aggregation.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Advanced Commands & Parsing' (Protocol in workflow.md)
