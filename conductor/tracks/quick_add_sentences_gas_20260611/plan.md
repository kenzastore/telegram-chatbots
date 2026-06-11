# Implementation Plan - Quick Add Transaction via Typed Sentences (GAS Refactor)

## Phase 1: Quick Add Date Parser & Sentence Cleanup Testing & Alignment [checkpoint: TBD]

- [x] Task: Create tests for Natural Language Date Parser (9709182)
    - [x] Write failing unit tests in `tests/quick.test.ts` for all relative, numeric, and textual date format variations, verifying they are correctly parsed into `YYYY-MM-DD` relative to Asia/Jakarta (GMT+7) timezone.
    - [x] Write failing unit tests in `tests/quick.test.ts` for description cleanup, verifying leading and trailing prepositions are stripped correctly.
- [x] Task: Align Parser Implementation (9709182)
    - [x] Refactor `quick.ts` to implement full date regex parsing and preposition cleanup, passing the unit tests.
    - [x] Run `npm test` and verify that all test cases pass.
    - [x] Ensure typescript type checks succeed.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Quick Add Date Parser & Sentence Cleanup Testing & Alignment' (Protocol in workflow.md)

## Phase 2: Quick Add Stateful Bot Flow Verification & Checkpointing [checkpoint: TBD]

- [ ] Task: Verify Stateful Bot Flow Mocks & Coverage
    - [ ] Write unit tests in `tests/handlers.test.ts` verifying `/quick` command error usage message, successful parsed confirmation flow, `quick_confirm_yes` / `quick_confirm_no` callbacks, and correct balance display.
    - [ ] Run Jest coverage checks and verify `quick.ts` has >80% coverage and overall tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Quick Add Stateful Bot Flow Verification & Checkpointing' (Protocol in workflow.md)
