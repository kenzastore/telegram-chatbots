# Implementation Plan - Mandatory Google OAuth & State Cleanup (GAS Refactor)

## Phase 1: Implement /cancel Command and Logout State Cleanup [checkpoint: TBD]

- [ ] Task: Create unit tests for /cancel and logout state cleanup
    - [ ] Add unit tests in `tests/handlers.test.ts` verifying that the `/cancel` command is accessible for unauthenticated users.
    - [ ] Add unit tests verifying `/cancel` deletes `STATE_<userId>` from user properties and responds with a cancellation message.
    - [ ] Add unit tests verifying `/google_logout` cleans up the `STATE_<userId>` property in addition to credentials.
    - [ ] Run the tests and confirm they fail (Red Phase).
- [ ] Task: Implement /cancel command and update /google_logout handler
    - [ ] Add the `/cancel` case to the public command list and command router in `router.ts`.
    - [ ] Implement the `/cancel` handler in `handlers.ts` (or `router.ts`) to clear `STATE_<userId>` from `PropertiesService.getUserProperties()`.
    - [ ] Update the `/google_logout` command logic in `router.ts` / `handlers.ts` to also clear `STATE_<userId>`.
    - [ ] Run tests and verify they pass (Green Phase).
    - [ ] Verify typescript compilation succeeds.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Implement /cancel Command and Logout State Cleanup' (Protocol in workflow.md)

## Phase 2: Verify Login Gate and Multi-User Separation [checkpoint: TBD]

- [ ] Task: Create tests for unauthenticated command blocking and multi-user isolation
    - [ ] Write/verify unit tests in `tests/handlers.test.ts` checking that unauthenticated messages, callback queries, and transactional commands are intercepted and blocked.
    - [ ] Write unit tests verifying multi-user separation (User A's operations do not alter User B's spreadsheet ID, credentials, or state).
    - [ ] Run tests and verify they pass (Green Phase).
    - [ ] Check coverage reports and confirm `router.ts` and `handlers.ts` have >80% coverage.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Verify Login Gate and Multi-User Separation' (Protocol in workflow.md)
