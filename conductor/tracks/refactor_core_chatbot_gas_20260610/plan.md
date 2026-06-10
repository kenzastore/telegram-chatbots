# Implementation Plan - Refactor Core Chatbot Logic and DB to Google Apps Script

## Phase 1: Test Suite Setup & GAS Mocking [checkpoint: pending]

- [ ] Task: Configure Jest and GAS Mocks
    - [ ] Install `jest`, `ts-jest`, `@types/jest` as devDependencies.
    - [ ] Create a `jest.config.js` and a testing setup file (`tests/setup.ts`) to mock the global Google Apps Script API (e.g. `UrlFetchApp`, `PropertiesService`, `LockService`, `SpreadsheetApp`).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Test Suite Setup & GAS Mocking' (Protocol in workflow.md)

## Phase 2: Database Module & Test Refactoring [checkpoint: pending]

- [ ] Task: Refactor and Test Database Functions
    - [ ] Write Jest unit tests in `tests/database.test.ts` mirroring the tests from `telegram-chatbots/tests/test_db.py` (e.g., adding transactions, balance calculations, get history, error conditions).
    - [ ] Refactor and verify the implementation of Sheets REST DB wrapper methods in `database.ts` to pass the tests.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database Module & Test Refactoring' (Protocol in workflow.md)

## Phase 3: Core Handlers & Test Refactoring [checkpoint: pending]

- [ ] Task: Refactor and Test Basic Command Handlers
    - [ ] Write Jest unit tests in `tests/handlers.test.ts` mirroring basic commands `/start`, `/help`, `/balance`, and `/view` tests from `telegram-chatbots/tests/test_bot.py`.
    - [ ] Refactor and verify implementation of basic handlers and stateless routing in `handlers.ts` and `router.ts` to pass the tests.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Core Handlers & Test Refactoring' (Protocol in workflow.md)
