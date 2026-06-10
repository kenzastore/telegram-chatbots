# Implementation Plan - Google Sheets Export Track (GAS version)

## Phase 1: Inline Trigger & Google Sheets/Drive API Client Setup [checkpoint: pending]

- [x] Task: Update the /summary command to include the "Export to Google Sheets 📊" inline button (a12d62d)
    - [x] Add the "Export to Google Sheets 📊" inline button with callback data `export_sheets` under the `/summary` command response.
    - [x] Implement callback router interceptor for `export_sheets` callback data to acknowledge the query and reply with a temporary status.
- [ ] Task: Implement Google API Client Helpers for Sheets and Drive
    - [ ] Create helper methods in `database.ts` (or an `export.ts` module) to create a new spreadsheet and set its permissions to public reader via the Google Drive API.
    - [ ] Write Jest unit tests to mock and verify these raw HTTP Sheets & Drive API calls.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Inline Trigger & Google Sheets/Drive API Client Setup' (Protocol in workflow.md)

## Phase 2: Spreadsheet Selection & Lifecycle Logic [checkpoint: pending]

- [ ] Task: Implement Spreadsheet Storage and Lifecycle Logic
    - [ ] Implement the look-up and check logic for `EXPORT_SS_ID_<userId>` in `PropertiesService`.
    - [ ] Build first-time creation vs reuse/overwrite logic for the spreadsheet.
    - [ ] Write Jest unit tests in a new `tests/export.test.ts` (or update `tests/handlers.test.ts`) covering first-time vs subsequent export lifecycle and verify mock calls.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Spreadsheet Selection & Lifecycle Logic' (Protocol in workflow.md)

## Phase 3: Data Export Format & Response Handler [checkpoint: pending]

- [ ] Task: Transform and Write Data to Export Tabs
    - [ ] Implement the transformation logic to output all database transactions to the "Transactions" tab.
    - [ ] Implement the aggregation and layout formatting for weekly/monthly summaries to the "Summaries" tab.
    - [ ] Add final handler that wipes existing data in the sheets, writes fresh content, and replies to the user with the clickable sheet URL.
    - [ ] Complete Jest unit tests, verify that overall code coverage is >80%, and execute tests cleanly.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Data Export Format & Response Handler' (Protocol in workflow.md)
