# Implementation Plan - Quick Add Transaction via Typed Sentences

## Phase 1: Parsing Engine & Unit Tests [checkpoint: 56874b6]

- [x] Task: Write failing unit tests for parsing engine (b6c9120)
    - [x] Create test case `test_parse_transaction_sentence` in `tests/test_bot.py` with multiple test inputs covering:
        - Expense keywords (`spent`, `bayar`, `beli`, etc.)
        - Income keywords (`receive`, `terima`, `gaji`, etc.)
        - Numeric amounts with suffixes (`50k`, `1.5jt`, `200.000`, `1m`)
        - Relative dates (`today`, `yesterday`, `kemarin`, `hari ini`)
        - Clean description extraction (removing stop prepositions like `for`, `on`, `untuk`, `di`)
    - [x] Run the tests and confirm they fail (Red Phase).
- [x] Task: Implement parsing engine in `bot.py` (b6c9120)
    - [x] Implement `parse_transaction_sentence(sentence: str, reference_date: datetime = None)` in `bot.py`.
    - [x] Implement regex-based extraction of type, amount, date, and description.
    - [x] Run tests and verify they pass (Green Phase).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Parsing Engine & Unit Tests' (Protocol in workflow.md) (56874b6)

## Phase 2: Bot Command /quick Integration & Tests [checkpoint: ]

- [x] Task: Implement /quick command handler (27f401f)
    - [x] Register `/quick` command handler (`quick_start`) in `bot.py`.
    - [x] Validate input (must have arguments).
    - [x] Parse sentence using `parse_transaction_sentence`.
    - [x] Store parsed transaction dict in `context.user_data["quick_tx"]`.
    - [x] Show parsed fields to the user and prompt with "Confirm Save ✅" and "Cancel ❌" inline buttons.
- [x] Task: Implement Callback Handlers (27f401f)
    - [x] Register `quick_confirm_callback` for callback data `quick_confirm`. Save the transaction using `db.add_transaction`, trigger running balance recalculation, and restore the main menu.
    - [x] Register `quick_cancel_callback` for callback data `quick_cancel` and `/cancel` command. Abort the transaction and restore the main menu.
- [x] Task: Write Command Integration Tests (27f401f)
    - [x] Add tests in `tests/test_bot.py` to cover:
        - Running `/quick` without args (assert instructions text).
        - Running `/quick` with valid sentence (assert confirmation message and inline buttons).
        - Clicking "Confirm Save" (assert database insert, balance recalculation, and success message).
        - Clicking "Cancel" or running `/cancel` (assert cancel message).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Command /quick Integration & Tests' (Protocol in workflow.md)
