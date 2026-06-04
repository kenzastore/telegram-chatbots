# Implementation Plan - Monthly Cut-off Summaries & Monthly Sheets Export

## Phase 1: Database and Core Summary Refactoring

- [x] Task: Refactor DB Summary Queries (e0c91f7)
    - [x] Write failing unit tests in `tests/test_db.py` for fetching transactions and summaries filtered by a specific calendar month.
    - [x] Implement `db.get_transactions_by_month(db_path, year, month)` and update `db.get_summaries(db_path, period, year, month)` in `db.py`.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Update Bot Monthly Summary Handler
    - [x] Write failing unit tests in `tests/test_bot.py` verifying `/summary monthly` displays transactions for the current calendar month.
    - [x] Update `show_summary` in `bot.py` to retrieve current calendar month summaries using the refactored DB helpers.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [~] Task: Conductor - User Manual Verification 'Phase 1: Database and Core Summary Refactoring' (Protocol in workflow.md)

## Phase 2: Google Sheets Monthly Tabs Export

- [ ] Task: Group and Export Data to Monthly Tabs
    - [ ] Write failing unit tests in `tests/test_sheets.py` for grouping transactions by month and writing them to dynamic monthly tabs (e.g. `YYYY-MM Transactions`).
    - [ ] Refactor `sheets.py` to group transactions by calendar month, check sheet/tab existence, create missing monthly tabs, and update data inside them.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Google Sheets Monthly Tabs Export' (Protocol in workflow.md)
