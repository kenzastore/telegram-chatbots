# Implementation Plan - Quick Add Transaction via Typed Sentences

## Phase 1: Parsing Engine & Unit Tests [checkpoint: ]

- [ ] Task: Write failing unit tests for parsing engine
    - [ ] Create test case `test_parse_transaction_sentence` in `tests/test_bot.py` with multiple test inputs covering:
        - Expense keywords (`spent`, `bayar`, `beli`, etc.)
        - Income keywords (`receive`, `terima`, `gaji`, etc.)
        - Numeric amounts with suffixes (`50k`, `1.5jt`, `200.000`, `1m`)
        - Relative dates (`today`, `yesterday`, `kemarin`, `hari ini`)
        - Clean description extraction (removing stop prepositions like `for`, `on`, `untuk`, `di`)
    - [ ] Run the tests and confirm they fail (Red Phase).
- [ ] Task: Implement parsing engine in `bot.py`
    - [ ] Implement `parse_transaction_sentence(sentence: str, reference_date: datetime = None)` in `bot.py`.
    - [ ] Implement regex-based extraction of type, amount, date, and description.
    - [ ] Run tests and verify they pass (Green Phase).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Parsing Engine & Unit Tests' (Protocol in workflow.md)

## Phase 2: Bot Command /quick Integration & Tests [checkpoint: ]

- [ ] Task: Implement /quick command handler
    - [ ] Register `/quick` command handler (`quick_start`) in `bot.py`.
    - [ ] Validate input (must have arguments).
    - [ ] Parse sentence using `parse_transaction_sentence`.
    - [ ] Store parsed transaction dict in `context.user_data["quick_tx"]`.
    - [ ] Show parsed fields to the user and prompt with "Confirm Save ✅" and "Cancel ❌" inline buttons.
- [ ] Task: Implement Callback Handlers
    - [ ] Register `quick_confirm_callback` for callback data `quick_confirm`. Save the transaction using `db.add_transaction`, trigger running balance recalculation, and restore the main menu.
    - [ ] Register `quick_cancel_callback` for callback data `quick_cancel` and `/cancel` command. Abort the transaction and restore the main menu.
- [ ] Task: Write Command Integration Tests
    - [ ] Add tests in `tests/test_bot.py` to cover:
        - Running `/quick` without args (assert instructions text).
        - Running `/quick` with valid sentence (assert confirmation message and inline buttons).
        - Clicking "Confirm Save" (assert database insert, balance recalculation, and success message).
        - Clicking "Cancel" or running `/cancel` (assert cancel message).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Command /quick Integration & Tests' (Protocol in workflow.md)
