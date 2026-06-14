# Implementation Plan - Edit, Remove, and Clear Transactions (GAS Refactor)

## Phase 1: Interactive /edit Flow Testing & Refinement [checkpoint: 0082a56]

- [x] Task: Create tests for Stateful Edit Bot Flow (d269cd3)
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying the `/edit` command initialization (e.g. triggering `/edit <id>`, handling missing args, id not found, and setting state).
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying edit field transitions (Date, Type, Amount, Description) and "Keep current" button callbacks.
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying saving edit updates, showing summaries, and checking balance recalculations are triggered and formatted correctly in Rupiah.
- [x] Task: Align Edit Flow Implementation (d269cd3)
    - [x] Refactor or verify `/edit` stateful handlers and callbacks in `handlers.ts` to pass the tests.
    - [x] Run edit-related test suite and verify that all test cases pass.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Interactive /edit Flow Testing & Refinement' (Protocol in workflow.md)

## Phase 2: Interactive /clear Flow Testing & Refinement [checkpoint: 7360d0c]

- [x] Task: Create tests for Stateful Clear Bot Flow (28ae724)
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying the `/clear` command, showing choice options (Recent, By ID, Week, Month).
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying double confirmation dialog details and cancel callback query handling.
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying clear execution, deletion of transactions, and balance recalculations.
- [x] Task: Align Clear Flow Implementation (5381931)
    - [x] Refactor or verify `/clear` callbacks and handlers in `handlers.ts` to pass the tests.
    - [x] Run the full Jest test suite with coverage enabled and check that the coverage is >80%.
    - [x] Run typescript type checker and linter/formatter on modified files.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Interactive /clear Flow Testing & Refinement' (Protocol in workflow.md) (7360d0c)

## Phase 3: Conversational /edit ID prompts & Verification [checkpoint: d989f82]

- [x] Task: Implement ID prompt for /edit without arguments (396d7ac)
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying `/edit` without arguments prompts the user to enter the transaction ID and sets state `EDIT_AWAITING_ID`.
    - [x] Implement prompt state `EDIT_AWAITING_ID` handling in `handlers.ts` to parse the ID input and launch the edit field selection menu.
    - [x] Verify all tests pass, code coverage remains >80%, and code compiles.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Conversational /edit ID prompts & Verification' (Protocol in workflow.md) (d989f82)
