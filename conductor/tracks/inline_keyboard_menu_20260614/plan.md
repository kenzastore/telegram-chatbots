# Implementation Plan - Virtual Keyboard Command Menu

## Phase 1: Test-Driven Development & Unit Tests [checkpoint: 6c06232]

- [x] Task: Write failing unit tests for the Custom Reply Keyboard (c5e7af4)
    - [x] Create test cases in `tests/command_menu.test.ts` verifying that `/start`, `/help`, etc., include the `reply_markup` with the ReplyKeyboardMarkup structure.
    - [x] Confirm tests fail (Red Phase).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Test-Driven Development & Unit Tests' (Protocol in workflow.md) (6c06232)

## Phase 2: Implementation & Manual Verification

- [x] Task: Implement Command Menu ReplyKeyboardMarkup utility
    - [x] Create `getCommandMenuReplyMarkup` helper function in `handlers.ts` or `router.ts` (using the specified 4-row layout).
- [x] Task: Integrate Custom Reply Keyboard in command responses
    - [x] Integrate into public/unauthenticated command responses: `/start`, `/help`, `/google_login`, `/google_logout`, `/cancel`.
    - [x] Integrate into authenticated command responses: `/balance`, `/view`, `/summary`, `/debug`.
    - [x] Integrate into stateful completion steps: `/add` final step, `/quick` confirm/cancel, `/clear` execution/cancel, `/edit` execution/cancel.
- [x] Task: Verify unit tests pass and refactor (Green Phase)
    - [x] Ensure all 120 tests pass.
    - [x] Check code coverage to ensure it remains >80% for new code.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Manual Verification' (Protocol in workflow.md)
