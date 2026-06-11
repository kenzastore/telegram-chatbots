# Implementation Plan - Currency Customization to Rupiah (GAS Refactor)

## Phase 1: Rupiah Formatting & Parsing Alignment [checkpoint: 4986feb]

- [x] Task: Verify and Align Currency Formatting and Parser Tests (87653a4)
    - [x] Add failing unit tests in `tests/handlers.test.ts` (or equivalent helper test file) validating formatCurrency under positive, negative, zero, and fractional amounts to match Python's output.
    - [x] Add failing unit tests in `tests/quick.test.ts` (or equivalent test file) checking parsing compatibility for all Indonesian multiplier suffixes like `rp`, `k`, `rb`, `jt`, `juta`, `m`, `miliar` with various spacing/cases.
- [x] Task: Align Implementation of formatCurrency and Quick Parser (87653a4)
    - [x] Refactor or verify `formatCurrency` in `handlers.ts` (or helper modules) to implement the exact format mapping.
    - [x] Refactor or verify regex and parser logic in `quick.ts` to support all Indonesian currency terms and multipliers correctly.
    - [x] Run the test suite and verify that the tests for formatting and parsing pass.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Rupiah Formatting & Parsing Alignment' (Protocol in workflow.md)

## Phase 2: Bot Output Verification & Full Alignment [checkpoint: TBD]

- [ ] Task: Integrate formatting across Bot Output Handlers and Verify Sheets
    - [ ] Verify that bot output handlers for `/add`, `/balance`, `/view`, and `/summary` in `handlers.ts` format transaction values and balances correctly using the refactored formatCurrency helper.
    - [ ] Verify that spreadsheet exports (in `database.ts`) continue to write raw numbers instead of pre-formatted currency strings.
    - [ ] Run the full Jest test suite with coverage enabled and check that the coverage is >80%.
    - [ ] Run typescript type checker and linter/formatter on modified files.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Output Verification & Full Alignment' (Protocol in workflow.md)
