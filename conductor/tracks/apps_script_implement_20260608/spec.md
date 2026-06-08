# Specification - Google Apps Script Migration Implementation & Stabilization

## Overview
This track implements and stabilizes the migration of the Telegram savings bot from Python/SQLite to Google Apps Script. It moves the project to a serverless architecture using TypeScript, local build compilation via `clasp`, and Google Sheets as the relational database. It implements Multi-User OAuth2 authentication so each user logs transactions to their own Google Drive spreadsheet.

## Functional Requirements
1.  **Google OAuth2 Integration**:
    *   Implement `/google_login` and `/google_logout` commands.
    *   `/google_login` generates a secure authorization link containing the user's Telegram ID.
    *   Implement `doGet(e)` callback in Apps Script to handle Google OAuth2 authorization code redirect, exchange code for refresh tokens, and store them securely in `PropertiesService` (keyed by Telegram User ID).
    *   Before executing transactional commands, verify that the user is authenticated. If not, block execution and prompt to login.
2.  **Spreadsheet Operations & Database Wrapper**:
    *   On user's first transaction, dynamically create a new Google Spreadsheet named `Telegram Savings Bot` in their Google Drive using their OAuth2 access token.
    *   Support dynamic creation of sheets for each month (e.g., `YYYY-MM Transactions` and `YYYY-MM Summaries`).
    *   Provide row appending and editing functions using `LockService` to prevent race conditions.
3.  **Chatbot Commands**:
    *   `/start` & `/help`: Welcomes and guides the user.
    *   `/add`: Initiates interactive flow (Type -> Amount -> Description -> Save).
    *   `/quick <sentence>`: Natural language transaction parser.
    *   `/balance`: Displays net balance.
    *   `/view`: Displays the last 10 transactions.
    *   `/clear`: Deletes transactions by choice (Recent, ID, Week, Month) with confirmation.
    *   `/edit`: Modifies a transaction's fields by ID.
    *   `/summary`: Aggregates weekly/monthly logs.
4.  **Router and Session State Machine**:
    *   Implement `routeUpdate` to handle update payloads, tracking stateful inputs (`STATE_<telegram_user_id>`) in `PropertiesService`.

## Non-Functional Requirements
*   **TypeScript / clasp**: Managed locally in TypeScript, compiling to Google Apps Script JavaScript via `clasp push`.
*   **GAS Execution Limits**: All Google Sheet reads and writes must be batched to stay well within the 30-second execution time limit for webapps.
*   **Error Handling**: Handlers catch exceptions and log them to a central script error sheet or console logs.

## Acceptance Criteria
*   Google OAuth2 login successfully connects a user's Google Drive and creates their personal spreadsheet.
*   All commands (/add, /quick, /balance, /view, /clear, /edit, /summary) are functional.
*   Webhooks run stably with no execution timeouts or script failures.
