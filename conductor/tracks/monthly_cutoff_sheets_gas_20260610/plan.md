# Implementation Plan - Monthly Cut-off Summaries & Monthly Sheets Export (GAS)

## Phase 1: Calendar Month Summary Refactoring [checkpoint: 6052a2f]

- [x] Task: Refactor DB/Handler Monthly Summary Logic (5b9cc69)
    - [x] Write failing unit tests in `tests/handlers.test.ts` (and/or `tests/database.test.ts`) that verify monthly summary calculations only include transactions starting from the 1st of the current calendar month.
    - [x] Update `handlers.ts` and monthly summary calculations to aggregate transactions from the 1st day of the current calendar month instead of a rolling 30-day window.
    - [x] Run the test suite and confirm that the new and existing tests pass with coverage >80%.
    - [x] Commit implementation code changes with a clean commit message.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Calendar Month Summary Refactoring' (Protocol in workflow.md) (6052a2f)

## Phase 2: Google Sheets Monthly Tabs Export

- [ ] Task: Refactor Sheets Export to Group by Month and Update Specific Tabs
    - [ ] Write failing unit tests in `tests/database.test.ts` for `Database.exportDataToSpreadsheet` that verify grouping by month, dynamic tab creation via batch update, tab clearing, and writing transaction/summary records to the corresponding `YYYY-MM Transactions` and `YYYY-MM Summaries` tabs.
    - [ ] Refactor `Database.exportDataToSpreadsheet` in `database.ts` to:
        - [ ] Extract year-month `YYYY-MM` from transaction dates.
        - [ ] Query the list of existing worksheets in the spreadsheet.
        - [ ] Make a Sheets API `batchUpdate` request to add missing sheets for all months represented (defaulting to the current month if no transactions).
        - [ ] Clear existing data for all target sheets using the Sheets API clear endpoint.
        - [ ] Batch update or update each target worksheet with formatted transaction rows and month-aggregated summary rows.
    - [ ] Run the test suite and confirm that all tests pass with coverage >80%.
    - [ ] Commit implementation code changes with a clean commit message.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Google Sheets Monthly Tabs Export' (Protocol in workflow.md)
