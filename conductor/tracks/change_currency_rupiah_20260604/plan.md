# Implementation Plan - Change Currency to Rupiah

## Phase 1: Helper Implementation & Tests [checkpoint: b81255e]

- [x] Task: Implement Rupiah Formatting Helper (fa58485)
    - [x] Create a `format_rupiah` helper function (e.g. in `bot.py` or a helpers module) that takes a float and returns it formatted as `Rp X.XXX,XX`.
    - [x] Add unit tests for `format_rupiah` in a new or existing test file.
    - [x] Run test suite and verify coverage.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Helper Implementation & Tests' (Protocol in workflow.md)

## Phase 2: Refactor Bot Commands and Update Tests

- [ ] Task: Update Bot Output Formatting
    - [ ] Refactor transaction confirmation message in `bot.py` to use `format_rupiah`.
    - [ ] Refactor `/balance` command response in `bot.py` to use `format_rupiah`.
    - [ ] Refactor `/view` command response in `bot.py` to use `format_rupiah`.
    - [ ] Refactor `/summary` command response in `bot.py` to use `format_rupiah`.
- [ ] Task: Update Bot Test Suite
    - [ ] Modify `tests/test_bot.py` assertions to expect the new `Rp X.XXX,XX` format instead of `$X.XX`.
    - [ ] Run test suite to verify everything passes and coverage remains >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Refactor Bot Commands and Update Tests' (Protocol in workflow.md)
