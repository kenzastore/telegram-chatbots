# Implementation Plan - Quick Add Transaction via Typed Sentences (GAS Refactor)

## Phase 1: Quick Add Date Parser & Sentence Cleanup Testing & Alignment [checkpoint: 5985b98]

- [x] Task: Create tests for Natural Language Date Parser (9709182)
    - [x] Write failing unit tests in `tests/quick.test.ts` for all relative, numeric, and textual date format variations, verifying they are correctly parsed into `YYYY-MM-DD` relative to Asia/Jakarta (GMT+7) timezone.
    - [x] Write failing unit tests in `tests/quick.test.ts` for description cleanup, verifying leading and trailing prepositions are stripped correctly.
- [x] Task: Align Parser Implementation (9709182)
    - [x] Refactor `quick.ts` to implement full date regex parsing and preposition cleanup, passing the unit tests.
    - [x] Run `npm test` and verify that all test cases pass.
    - [x] Ensure typescript type checks succeed.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Quick Add Date Parser & Sentence Cleanup Testing & Alignment' (Protocol in workflow.md) (5985b98)

## Phase 2: Quick Add Stateful Bot Flow Verification & Checkpointing [checkpoint: eaf9644]

- [x] Task: Verify Stateful Bot Flow Mocks & Coverage (02cd8a9)
    - [x] Write unit tests in `tests/handlers.test.ts` verifying `/quick` command error usage message, successful parsed confirmation flow, `quick_confirm_yes` / `quick_confirm_no` callbacks, and correct balance display.
    - [x] Run Jest coverage checks and verify `quick.ts` has >80% coverage and overall tests pass.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Quick Add Stateful Bot Flow Verification & Checkpointing' (Protocol in workflow.md) (eaf9644)

## Phase 3: Stateful Sentence Input for Empty /quick Command

- [x] Task: Write failing unit tests for stateful /quick flow
    - [x] Add tests in `tests/command_menu.test.ts` verifying that `/quick` without args sets state to `QUICK_AWAITING_SENTENCE` and prompts for input.
    - [x] Add tests verifying that sending a text message in `QUICK_AWAITING_SENTENCE` state invokes the parser, clears the state, and presents confirmation.
- [x] Task: Implement stateful /quick flow
    - [x] Update `handleQuickCommand` in `handlers.ts` to set state to `QUICK_AWAITING_SENTENCE` when `args` is empty.
    - [x] Update `handleStatefulMessage` in `handlers.ts` to capture `QUICK_AWAITING_SENTENCE` state, clear the state, and call `handleQuickCommand` with the user text.
- [x] Task: Run unit tests and verify they pass
    - [x] Ensure all test cases pass.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Stateful Sentence Input for Empty /quick Command' (Protocol in workflow.md)

## Phase 4: Date Placement Flexibility

- [x] Task: Write failing unit tests for date placement flexibility
    - [x] Add tests in `tests/quick.test.ts` to verify date parsing when the date is placed at the first (beginning) of the sentence.
    - [x] Add tests in `tests/quick.test.ts` to verify date parsing when the date is placed in the middle of the sentence.
- [x] Task: Ensure date parser supports flexible placement
    - [x] Verify that description extraction, type extraction, and date extraction all correctly isolate and clean up the date irrespective of its location.
- [x] Task: Run unit tests and verify they pass
    - [x] Ensure all test cases pass.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Date Placement Flexibility' (Protocol in workflow.md)


