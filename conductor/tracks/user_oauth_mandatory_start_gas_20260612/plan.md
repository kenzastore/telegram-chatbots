# Implementation Plan - Mandatory Google OAuth & State Cleanup (GAS Refactor)

## Phase 1: Implement /cancel Command and Logout State Cleanup [checkpoint: 4b50a17]

- [x] Task: Create unit tests for /cancel and logout state cleanup (e1789d8)
    - [x] Add unit tests in `tests/handlers.test.ts` verifying that the `/cancel` command is accessible for unauthenticated users.
    - [x] Add unit tests verifying `/cancel` deletes `STATE_<userId>` from user properties and responds with a cancellation message.
    - [x] Add unit tests verifying `/google_logout` cleans up the `STATE_<userId>` property in addition to credentials.
    - [x] Run the tests and confirm they fail (Red Phase).
- [x] Task: Implement /cancel command and update /google_logout handler (e1789d8)
    - [x] Add the `/cancel` case to the public command list and command router in `router.ts`.
    - [x] Implement the `/cancel` handler in `handlers.ts` (or `router.ts`) to clear `STATE_<userId>` from `PropertiesService.getUserProperties()`.
    - [x] Update the `/google_logout` command logic in `router.ts` / `handlers.ts` to also clear `STATE_<userId>`.
    - [x] Run tests and verify they pass (Green Phase).
    - [x] Verify typescript compilation succeeds.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Implement /cancel Command and Logout State Cleanup' (Protocol in workflow.md) (4b50a17)

## Phase 2: Verify Login Gate and Multi-User Separation [checkpoint: TBD]

- [x] Task: Create tests for unauthenticated command blocking and multi-user isolation (f2b5acf)
    - [x] Write/verify unit tests in `tests/handlers.test.ts` checking that unauthenticated messages, callback queries, and transactional commands are intercepted and blocked.
    - [x] Write unit tests verifying multi-user separation (User A's operations do not alter User B's spreadsheet ID, credentials, or state).
    - [x] Run tests and verify they pass (Green Phase).
    - [x] Check coverage reports and confirm `router.ts` and `handlers.ts` have >80% coverage.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Verify Login Gate and Multi-User Separation' (Protocol in workflow.md)
