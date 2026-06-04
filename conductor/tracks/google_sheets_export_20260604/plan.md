# Implementation Plan - Export Summary to Google Sheet

## Phase 1: Setup and Google APIs Client Integration

- [ ] Task: Dependency Setup & Config (Phase 1)
    - [ ] Install `google-api-python-client`, `google-auth-httplib2`, and `google-auth-oauthlib`. Update `requirements.txt`.
    - [ ] Update `config.py` and `.env.example` to read and validate `GOOGLE_SERVICE_ACCOUNT_FILE` path.
- [ ] Task: Google Sheets Integration Helper Module (Phase 1)
    - [ ] Write unit tests mocking the Google Sheets API and Google Drive API for spreadsheet creation, tab creation, cell range updates, and public link sharing.
    - [ ] Implement `sheets.py` containing service account auth and high-level export helper functions.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup and Google APIs Client Integration' (Protocol in workflow.md)

## Phase 2: Bot Handler and Inline Button Integration

- [ ] Task: /summary Inline Button (Phase 2)
    - [ ] Write unit tests for `/summary` command showing the inline button "Export to Google Sheets 📊".
    - [ ] Update `/summary` handler in `bot.py` to output the inline keyboard with the button.
- [ ] Task: Callback Handler and Export Flow (Phase 2)
    - [ ] Write unit tests mocking callback query handler trigger, fetching data, invoking `sheets.py` helper, and editing/sending message with the spreadsheet URL.
    - [ ] Implement callback query handler in `bot.py` to handle the export trigger.
    - [ ] Run test suite, verify code coverage is >80%, and commit changes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Bot Handler and Inline Button Integration' (Protocol in workflow.md)
