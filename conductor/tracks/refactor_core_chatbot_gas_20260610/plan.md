# Implementation Plan - Refactor Core Chatbot Logic and DB to Google Apps Script

## Phase 1: Test Suite Setup & GAS Mocking [checkpoint: dee2e66]

- [x] Task: Configure Jest and GAS Mocks (0d5a32c)
    - [x] Install `jest`, `ts-jest`, `@types/jest` as devDependencies.
    - [x] Create a `jest.config.js` and a testing setup file (`tests/setup.ts`) to mock the global Google Apps Script API (e.g. `UrlFetchApp`, `PropertiesService`, `LockService`, `SpreadsheetApp`).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test Suite Setup & GAS Mocking' (Protocol in workflow.md) (dee2e66)

## Phase 2: Database Module & Test Refactoring [checkpoint: c6b725b]

- [x] Task: Refactor and Test Database Functions (3cf8900)
    - [x] Write Jest unit tests in `tests/database.test.ts` mirroring the tests from `telegram-chatbots/tests/test_db.py` (e.g., adding transactions, balance calculations, get history, error conditions).
    - [x] Refactor and verify the implementation of Sheets REST DB wrapper methods in `database.ts` to pass the tests.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database Module & Test Refactoring' (Protocol in workflow.md) (c6b725b)

## Phase 3: Core Handlers & Test Refactoring [checkpoint: a1b871d]

- [x] Task: Refactor and Test Basic Command Handlers (174d341)
    - [x] Write Jest unit tests in `tests/handlers.test.ts` mirroring basic commands `/start`, `/help`, `/balance`, and `/view` tests from `telegram-chatbots/tests/test_bot.py`.
    - [x] Refactor and verify implementation of basic handlers and stateless routing in `handlers.ts` and `router.ts` to pass the tests.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Core Handlers & Test Refactoring' (Protocol in workflow.md) (a1b871d)

## Phase 4: Conversational /add Date Prompts & Verification

- [x] Task: Implement Date Prompt Flow in /add Handler (2172fa5)
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying `/add` prompts for date, supports confirming today's date, and handles custom manual override date entry.
    - [x] Implement date prompt states (e.g., `ADD_DATE` and `ADD_AWAITING_DATE`) in `handlers.ts` and callback query handlers.
    - [x] Verify all tests pass, code coverage remains >80%, and code compiles.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Conversational /add Date Prompts & Verification' (Protocol in workflow.md)
