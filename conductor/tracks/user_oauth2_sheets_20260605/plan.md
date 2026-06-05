# Implementation Plan - User Google OAuth2 Authentication and Dynamic Sheets Creation

## Phase 1: Database Setup and Google OAuth Helper Functions [checkpoint: 1b6677d]

- [x] Task: Create database tables and helpers (db34273)
    - [x] Write failing unit tests for new DB configuration functions in `tests/test_db.py` (or `tests/test_bot.py`).
    - [x] Update `init_db` in `db.py` to create the `user_configs` table containing `user_id` (PRIMARY KEY), `spreadsheet_id`, and `google_credentials`.
    - [x] Implement helpers: `get_user_config(db_path, user_id)`, `set_user_credentials(db_path, user_id, credentials_str)`, `set_user_spreadsheet(db_path, user_id, spreadsheet_id)`, and `clear_user_config(db_path, user_id)`.
    - [x] Run tests and verify they pass (Green Phase).
- [x] Task: Implement Google OAuth2 helper functions (b1e8b88)
    - [x] Write failing unit tests for authorization URL generation and token exchange in `tests/test_sheets.py` (or similar).
    - [x] Implement `get_authorization_url()` and `exchange_code_for_credentials(auth_code)` in `sheets.py`.
    - [x] Implement a helper `get_user_sheets_service(user_credentials_str)` to instantiate the Google Sheets/Drive client using user credentials.
    - [x] Run tests and verify they pass (Green Phase).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Setup and Google OAuth Helper Functions' (Protocol in workflow.md)

## Phase 2: Telegram Bot Flow Integration and Logout Command [checkpoint: ]

- [x] Task: Implement auth prompt & code submission conversation flow (fb343e8)
    - [x] Write integration tests for auth prompt flow, handling invalid codes, and cancellation.
    - [x] Implement `/google_login` command and state handler to catch the code submission in `bot.py`.
    - [x] Ensure user states are cleaned up and user is notified on successful authentication.
    - [x] Run tests and verify they pass (Green Phase).
- [x] Task: Integrate auth check & dynamic creation into export flow (df7c8a7)
    - [x] Write integration tests for `export_sheets_callback` verifying it checks login status, prompts if unauthenticated, and uses custom spreadsheets.
    - [x] Modify `export_sheets_callback` in `bot.py` to check user credentials in the DB. If missing, redirect to auth flow. If present, retrieve sheets service, check for saved `spreadsheet_id`, dynamically create a new sheet if missing, and perform the export.
    - [x] Run tests and verify they pass (Green Phase).
- [x] Task: Implement /google_logout command (7809482)
    - [x] Write tests for `/google_logout` validating DB cleanup and message responses.
    - [x] Implement `google_logout` handler in `bot.py` to remove DB credentials and spreadsheet ID and revoke tokens if possible.
    - [x] Run tests and verify they pass (Green Phase).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Telegram Bot Flow Integration and Logout Command' (Protocol in workflow.md)
