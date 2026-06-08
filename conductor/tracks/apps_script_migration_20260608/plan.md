# Implementation Plan - Telegram Chatbot to Google Apps Script Migration Guide

## Phase 1: Architectural Design & File Mapping

- [x] Task: Define Architectural Comparison & File Mapping
    - [x] Create `apps_script_migration_guide.md` in the project root.
    - [x] Write the introduction and the core architectural comparison between Python server process (polling) and Google Apps Script (stateless webhook).
    - [x] Define a detailed file-to-file mapping table from the Python project (`bot.py`, `db.py`, `sheets.py`, `config.py`) to Google Apps Script files.
- [x] Task: Document Execution Model & Webhook Registration
    - [x] Explain the stateless `doPost(e)` execution model.
    - [x] Document the Telegram webhook registration process, including `curl` commands to register and check webhook status.
    - [x] Design the command routing architecture to handle stateless incoming updates.
- [~] Task: Conductor - User Manual Verification 'Phase 1: Architectural Design & File Mapping' (Protocol in workflow.md)

## Phase 2: System Migration, Limitations & Code Snippets

- [ ] Task: Document Database, State & Library Migration
    - [ ] Define the SQLite-to-Google Sheets schema mapping and worksheets setup.
    - [ ] Detail user session/state management using `PropertiesService` or `CacheService`.
    - [ ] Document how to handle Apps Script runtime limitations (30-second execution limit).
    - [ ] Map Python dependencies (`python-telegram-bot`, `google-api`, etc.) to Apps Script equivalents (`UrlFetchApp`, `SpreadsheetApp`).
    - [ ] Detail error handling and logging strategies using Cloud Logging or Sheet logging.
- [ ] Task: Write TypeScript Code Snippets
    - [ ] Write the `doPost(e)` entrypoint and webhook request parsing code in TypeScript.
    - [ ] Write a lightweight router and callback dispatcher in TypeScript.
    - [ ] Write Google Sheet database wrapper functions (inserting/retrieving transactions, balance calculations).
    - [ ] Write the natural language quick add parser using TypeScript regex (handling amounts, suffixes, relative/absolute dates, descriptions).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: System Migration, Limitations & Code Snippets' (Protocol in workflow.md)

## Phase 3: Final Review and Integration

- [ ] Task: Document Review and Cleanup
    - [ ] Review the entire migration guide for correctness, markdown formatting, link integrity, and clarity.
    - [ ] Verify that all 5 key constraints and all code snippets are complete and correct.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Review and Integration' (Protocol in workflow.md)
