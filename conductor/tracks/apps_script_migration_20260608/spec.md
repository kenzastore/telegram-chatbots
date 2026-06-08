# Specification - Telegram Chatbot to Google Apps Script Migration Guide

## Overview
Create a comprehensive architectural plan and step-by-step refactoring guide (`apps_script_migration_guide.md`) in the project root to migrate this Python/SQLite/Telegram chatbot project to run on Google Apps Script (GAS) written in TypeScript and managed via clasp.

## Scope of the Migration Guide
The guide must address the following key areas:

1. **Execution Model Migration**:
   - Detail the transition from a long-running Python server process to a stateless, event-driven model using Google Apps Script `doPost(e)` to handle incoming Telegram webhooks.
   - Address configuring and registering/unregistering webhooks with the Telegram API.
2. **State Management**:
   - Map the current SQLite database schema and tables (`transactions`, cached balances) to Google Sheets worksheets.
   - Explain how to use `PropertiesService` (User/Script properties) or `CacheService` to maintain session/conversation states (replacing `context.user_data` state machines).
3. **Asynchronous Operations**:
   - Detail how to handle tasks that typically rely on Python's async/await or background tasks within the synchronous execution limitations of Apps Script (e.g. 30-second execution time limits).
4. **Library & Dependency Management**:
   - Provide concrete strategies and mappings for replacing Python packages (`python-telegram-bot`, `google-api-python-client`, `sqlite3`) with native Google Apps Script services (`UrlFetchApp`, `SpreadsheetApp`, `CacheService`, `PropertiesService`).
5. **Error Handling & Logging**:
   - Provide concrete implementation techniques for logging errors to Google Cloud Logging (`console.error`) or a dedicated spreadsheet log, ensuring visibility and stability.
6. **Detailed Code Mappings & Snippets**:
   - Specific modular mapping of Python files (`bot.py`, `db.py`, `sheets.py`, `config.py`) to Apps Script files.
   - Copy-pasteable TypeScript code snippets for:
     - The `doPost(e)` entrypoint.
     - A lightweight command router/dispatcher.
     - Spreadsheet database wrapper functions (reading/writing transactions).
     - Migrating the `/quick` natural language parser to Apps Script JS/TS regex.

## Non-Functional Requirements
- **Formatting**: Clear Markdown structure, using alerts and mermaid diagrams where appropriate.
- **Constraints**: Fully document GAS constraints (30-second runtime limit, URL fetch quotas, Sheet size limits).

## Acceptance Criteria
- A markdown file `apps_script_migration_guide.md` is created in the repository's root.
- The guide covers all 5 Apps Script constraints listed in `conductor/reference/refactor.md`.
- Code snippets are written in clean, readable TypeScript compatible with Apps Script clasp setup.
