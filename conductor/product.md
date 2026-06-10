# Initial Concept

Design a comprehensive project plan for a personal Telegram chatbot dedicated to tracking savings and daily financial transactions. The chatbot should focus on simplicity and ease of use for recording daily income and expenditures. Please include the following components in the plan:

---

# Product Definition: Savings & Financial Transaction Telegram Chatbot

## Core Vision
A lightweight, personal Telegram chatbot designed to make logging daily income (credits) and expenditures (debits) as frictionless as possible. The bot aims to help users track their savings, understand their daily spending habits, and view real-time balances directly from their chat client.

## Core Functionality & User Workflow
Every user accessing the bot must first log in to Google via OAuth2. Unauthenticated commands (other than `/start`, `/help`, and `/cancel`) are blocked. Users can log transactions through interactive chat conversations or single-command parsing once authenticated.

0. **Mandatory Google Login Gate**:
   - When a user starts the bot or executes any transactional command, the bot checks for valid Google credentials. If missing, the user is prompted to connect their account via `/google_login` and cannot proceed until authenticated.
1. **Adding a Transaction (`/add`)**:
   - **Trigger**: User types `/add` or selects the option.
   - **Inputs**:
     - **Date**: Defaults to today, but can be customized (e.g., via date picker buttons or manual override).
     - **Transaction Type**: Debit (Expense) or Credit (Income).
     - **Amount**: The numeric amount.
     - **Description/Category**: A brief note describing the transaction (e.g., "Groceries", "Salary").
   - **Confirmation**: The bot saves the transaction, recalculates the balance, and shows a confirmation message with the updated balance.
2. **Checking Balance (`/balance`)**:
   - Displays the current net balance (Total Credits - Total Debits) across all records.
3. **Viewing History (`/view`)**:
   - Lists the last N transactions (defaulting to 10) in a cleanly formatted table.
4. **Summaries (`/summary`)**:
   - Offers weekly summaries (last 7 days) and monthly financial summaries aggregated by calendar month (current month from day 1). Includes an inline keyboard button "Export to Google Sheets 📊" to export the user's transaction data.
5. **Editing a Transaction (`/edit`)**:
   - Initiates an interactive conversation flow to update Date, Type, Amount, and Description of a transaction by ID, recalculating balances chronologically.
6. **Clearing Transactions (`/clear`)**:
   - Initiates an interactive selection menu (Recent, ID, Week, Month) with double-confirmation confirmation prompts to delete transactions, recalculating balances.
7. **Google Sheets Integration**:
   - Allows users to connect their Google accounts via OAuth2 and write transaction logs and summaries directly into separate worksheets grouped dynamically by calendar month (e.g., `YYYY-MM Transactions` and `YYYY-MM Summaries`) within a dynamically created spreadsheet in their own Google Drive.
8. **Quick Add (`/quick`)**:
   - **Trigger**: User types `/quick <sentence>`.
   - **Inputs**: A single natural language sentence (supports both English and Indonesian) containing transaction type, amount (with multipliers), date (today, yesterday, etc.), and description.
   - **Confirmation**: The bot parses the sentence, prompts the user to confirm via inline buttons, saves the transaction on confirmation, and displays the updated running balance.
9. **Manual Export to Google Sheets**:
   - **Trigger**: User clicks "Export to Google Sheets 📊" button.
   - **Workflow**: If the user has not exported before, the bot automatically creates a new spreadsheet in the user's Google Drive titled `Finance Bot Export - <UserId>` and updates permissions to "anyone with the link can view". On subsequent requests, the existing spreadsheet is updated.
   - **Output Sheets**: Export consists of worksheets grouped dynamically by calendar month, specifically `YYYY-MM Transactions` and `YYYY-MM Summaries` tabs for each month represented in the database (defaulting to the current month if no transactions).
   - **Confirmation**: A Telegram message is sent back to the user with the direct link to the exported spreadsheet.

## Data Structure
The chatbot stores records in a relational database with the following fields:
* **user_id**: INTEGER (Telegram user ID used to scope and isolate transactions per user)
* **id**: INTEGER PRIMARY KEY AUTOINCREMENT
* **date**: TEXT (ISO 8601 format: `YYYY-MM-DD`)
* **amount**: REAL (Numeric value, always positive)
* **description**: TEXT (e.g., "Lunch", "Bonus")
* **type**: TEXT (Value must be either `'debit'` or `'credit'`)
* **balance_after**: REAL (Cached running balance at the time of the transaction for audit/speed)

## Command Set
* `/start` - Initial setup, greeting, and help instructions.
* `/add` - Initiate transaction logging workflow.
* `/edit` - Edit a transaction's fields by ID.
* `/clear` - Clear transactions by choice (Recent, ID, Week, Month).
* `/quick` - Quickly add a transaction via a single natural language sentence.
* `/view` - View recent transaction history.
* `/summary` - View financial summaries (weekly/monthly).
* `/balance` - Retrieve current running balance.
* `/google_login` - Connect Google account for sheets export.
* `/google_logout` - Disconnect Google account.
* `/help` - Show command usage guide and descriptions.

## Technology Stack
* **Language**: TypeScript (compiled to Google Apps Script JavaScript via clasp)
* **Telegram Service**: Raw HTTP requests using Google Apps Script `UrlFetchApp`
* **Database**: Google Sheets (via Google Apps Script `SpreadsheetApp` service)
* **Deployment/Hosting**: Google Apps Script Web App (stateless webhook environment)
