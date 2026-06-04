# Implementation Plan - Change Currency to Rupiah

## Phase 1: Helper Implementation & Tests [checkpoint: b81255e]

- [x] Task: Implement Rupiah Formatting Helper (fa58485)
    - [x] Create a `format_rupiah` helper function (e.g. in `bot.py` or a helpers module) that takes a float and returns it formatted as `Rp X.XXX,XX`.
    - [x] Add unit tests for `format_rupiah` in a new or existing test file.
    - [x] Run test suite and verify coverage.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Helper Implementation & Tests' (Protocol in workflow.md)

## Phase 2: Refactor Bot Commands and Update Tests [checkpoint: e6ad8b5]

- [x] Task: Update Bot Output Formatting (9c3c584)
    - [x] Refactor transaction confirmation message in `bot.py` to use `format_rupiah`.
    - [x] Refactor `/balance` command response in `bot.py` to use `format_rupiah`.
    - [x] Refactor `/view` command response in `bot.py` to use `format_rupiah`.
    - [x] Refactor `/summary` command response in `bot.py` to use `format_rupiah`.
- [x] Task: Update Bot Test Suite (9c3c584)
    - [x] Modify `tests/test_bot.py` assertions to expect the new `Rp X.XXX,XX` format instead of `$X.XX`.
    - [x] Run test suite to verify everything passes and coverage remains >80%.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Refactor Bot Commands and Update Tests' (Protocol in workflow.md)
