# Implementation Plan - Manage Transactions (Edit, Remove, Clear)

## Phase 1: Database Helpers and Tests [checkpoint: f07e91b]

- [x] Task: Implement DB Operations & Balance Recalculation (82d3def)
    - [x] Implement `recalculate_balances(db_path)` in `db.py` to re-compute running balances sorted by `date ASC, id ASC`.
    - [x] Implement `get_transaction(db_path, tx_id)` in `db.py`.
    - [x] Implement `update_transaction(db_path, tx_id, date, amount, description, tx_type)` in `db.py` which triggers balance recalculation.
    - [x] Implement `delete_transaction(db_path, tx_id)` in `db.py` which triggers balance recalculation.
    - [x] Implement `clear_transactions(db_path, choice, param=None)` in `db.py` to handle clearing recent, weekly, or monthly entries, followed by balance recalculation.
- [x] Task: Write Database Tests (82d3def)
    - [x] Add unit tests in `tests/test_db.py` to cover updating, deleting, and clearing transactions, validating that running balances are correctly recalculated.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Helpers and Tests' (Protocol in workflow.md)

## Phase 2: Bot Edit Command & Tests [checkpoint: 8e41c72]

- [x] Task: Implement Edit Conversation Handler (26bed61)
    - [x] Register `/edit` command and build its ConversationHandler in `bot.py` with states: `EDIT_ID`, `EDIT_DATE`, `EDIT_TYPE`, `EDIT_AMOUNT`, `EDIT_DESCRIPTION`, `EDIT_CONFIRM`.
    - [x] Support inline buttons to "Keep current: <value>" for each field.
    - [x] Implement confirmation and update logic.
- [x] Task: Test Edit Command (26bed61)
    - [x] Write unit tests in `tests/test_bot.py` to verify the step-by-step editing flow and successful updates.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Bot Edit Command & Tests' (Protocol in workflow.md)

## Phase 3: Bot Clear Command & Tests

- [ ] Task: Implement Clear Inline Keyboard
    - [ ] Register `/clear` command in `bot.py` that displays inline keyboard choices: Recent, ID, Week, Month.
    - [ ] Handle choices and prompt for confirmation with inline buttons ("Confirm Delete" / "Cancel").
    - [ ] Implement delete execution callback.
- [ ] Task: Test Clear Command
    - [ ] Write unit tests in `tests/test_bot.py` to cover different `/clear` options and confirmations.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Bot Clear Command & Tests' (Protocol in workflow.md)
