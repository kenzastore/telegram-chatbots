# Implementation Plan - Export Summary to Google Sheet

## Phase 1: Setup and Google APIs Client Integration [checkpoint: 197faf8]

- [x] Task: Dependency Setup & Config (Phase 1) (428b050)
    - [x] Install `google-api-python-client`, `google-auth-httplib2`, and `google-auth-oauthlib`. Update `requirements.txt`.
    - [x] Update `config.py` and `.env.example` to read and validate `GOOGLE_SERVICE_ACCOUNT_FILE` path.
- [x] Task: Google Sheets Integration Helper Module (Phase 1) (c4e1509)
    - [x] Write unit tests mocking the Google Sheets API and Google Drive API for spreadsheet creation, tab creation, cell range updates, and public link sharing.
    - [x] Implement `sheets.py` containing service account auth and high-level export helper functions.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and Google APIs Client Integration' (Protocol in workflow.md) (197faf8)

## Phase 2: Bot Handler and Inline Button Integration [checkpoint: acb3669]

- [x] Task: /summary Inline Button (Phase 2) (88c22da)
    - [x] Write unit tests for `/summary` command showing the inline button "Export to Google Sheets 📊".
    - [x] Update `/summary` handler in `bot.py` to output the inline keyboard with the button.
- [x] Task: Callback Handler and Export Flow (Phase 2) (da68c29)
    - [x] Write unit tests mocking callback query handler trigger, fetching data, invoking `sheets.py` helper, and editing/sending message with the spreadsheet URL.
    - [x] Implement callback query handler in `bot.py` to handle the export trigger.
    - [x] Run test suite, verify code coverage is >80%, and commit changes.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Bot Handler and Inline Button Integration' (Protocol in workflow.md) (acb3669)
