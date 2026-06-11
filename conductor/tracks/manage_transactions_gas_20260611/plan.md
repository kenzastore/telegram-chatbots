# Implementation Plan - Edit, Remove, and Clear Transactions (GAS Refactor)

## Phase 1: Interactive /edit Flow Testing & Refinement [checkpoint: TBD]

- [x] Task: Create tests for Stateful Edit Bot Flow (d269cd3)
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying the `/edit` command initialization (e.g. triggering `/edit <id>`, handling missing args, id not found, and setting state).
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying edit field transitions (Date, Type, Amount, Description) and "Keep current" button callbacks.
    - [x] Write failing unit tests in `tests/handlers.test.ts` verifying saving edit updates, showing summaries, and checking balance recalculations are triggered and formatted correctly in Rupiah.
- [x] Task: Align Edit Flow Implementation (d269cd3)
    - [x] Refactor or verify `/edit` stateful handlers and callbacks in `handlers.ts` to pass the tests.
    - [x] Run edit-related test suite and verify that all test cases pass.
- [~] Task: Conductor - User Manual Verification 'Phase 1: Interactive /edit Flow Testing & Refinement' (Protocol in workflow.md)

## Phase 2: Interactive /clear Flow Testing & Refinement [checkpoint: TBD]

- [ ] Task: Create tests for Stateful Clear Bot Flow
    - [ ] Write failing unit tests in `tests/handlers.test.ts` verifying the `/clear` command, showing choice options (Recent, By ID, Week, Month).
    - [ ] Write failing unit tests in `tests/handlers.test.ts` verifying double confirmation dialog details and cancel callback query handling.
    - [ ] Write failing unit tests in `tests/handlers.test.ts` verifying clear execution, deletion of transactions, and balance recalculations.
- [ ] Task: Align Clear Flow Implementation
    - [ ] Refactor or verify `/clear` callbacks and handlers in `handlers.ts` to pass the tests.
    - [ ] Run the full Jest test suite with coverage enabled and check that the coverage is >80%.
    - [ ] Run typescript type checker and linter/formatter on modified files.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Interactive /clear Flow Testing & Refinement' (Protocol in workflow.md)
