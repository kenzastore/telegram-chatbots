# Implementation Plan - Inline Keyboard Command Menu

## Phase 1: Test-Driven Development & Unit Tests [checkpoint: 9fac241]

- [x] Task: Write failing unit tests for the Command Menu (de52072)
    - [x] Create test cases in `tests/handlers.test.ts` or a new test file that verify `sendCommandMenu` is called when commands start/finish.
    - [x] Write tests verifying that `menu_` callback queries trigger the correct command logic.
    - [x] Confirm tests fail (Red Phase).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test-Driven Development & Unit Tests' (Protocol in workflow.md) (9fac241)

## Phase 2: Implementation & Manual Verification

- [ ] Task: Implement Command Menu utility
    - [ ] Create `sendCommandMenu` helper function in `handlers.ts` or `router.ts` (using the specified 4-row layout).
- [ ] Task: Integrate Command Menu in command endpoints
    - [ ] Integrate into public/unauthenticated commands: `/start`, `/help`, `/google_login`, `/google_logout`, `/cancel`.
    - [ ] Integrate into authenticated command handlers or `routeUpdate` exit: `/balance`, `/view`, `/summary`, `/debug`.
    - [ ] Integrate into stateful completion steps: `/add` final step, `/quick` confirm/cancel, `/clear` execution/cancel, `/edit` execution/cancel.
- [ ] Task: Add Callback Routing for Command Menu buttons
    - [ ] Update callback query router in `router.ts` / `handlers.ts` to map `menu_/quick` to prompt message, and other `menu_` actions to their respective functions.
- [ ] Task: Verify unit tests pass and refactor (Green Phase)
    - [ ] Ensure all 117+ tests pass.
    - [ ] Check code coverage to ensure it remains >80% for new code.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Manual Verification' (Protocol in workflow.md)
