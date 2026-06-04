# Initial Concept

Design a comprehensive project plan for a personal Telegram chatbot dedicated to tracking savings and daily financial transactions. The chatbot should focus on simplicity and ease of use for recording daily income and expenditures. Please include the following components in the plan:

---

# Product Definition: Savings & Financial Transaction Telegram Chatbot

## Core Vision
A lightweight, personal Telegram chatbot designed to make logging daily income (credits) and expenditures (debits) as frictionless as possible. The bot aims to help users track their savings, understand their daily spending habits, and view real-time balances directly from their chat client.

## Core Functionality & User Workflow
Users can log transactions through interactive chat conversations or single-command parsing.
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
   - Offers weekly and monthly aggregates of credits and debits grouped by description/category.
5. **Google Sheets Export**:
   - Allows exporting the full transaction logs and weekly/monthly summaries into a newly created Google Spreadsheet (viewable by anyone with the link) via an inline keyboard button.

## Data Structure
The chatbot stores records in a relational database with the following fields:
* **id**: INTEGER PRIMARY KEY AUTOINCREMENT
* **date**: TEXT (ISO 8601 format: `YYYY-MM-DD`)
* **amount**: REAL (Numeric value, always positive)
* **description**: TEXT (e.g., "Lunch", "Bonus")
* **type**: TEXT (Value must be either `'debit'` or `'credit'`)
* **balance_after**: REAL (Cached running balance at the time of the transaction for audit/speed)

## Command Set
* `/start` - Initial setup, greeting, and help instructions.
* `/add` - Initiate transaction logging workflow.
* `/view` - View recent transaction history.
* `/summary` - View financial summaries (weekly/monthly).
* `/balance` - Retrieve current running balance.
* `/help` - Show command usage guide and descriptions.

## Technology Stack
* **Language**: Python 3.9+
* **Telegram Framework**: `python-telegram-bot` (v20+ with asyncio)
* **Database**: SQLite (built-in, file-based, highly portable)
* **Deployment/Hosting**: Docker (for local run or self-hosting on a cheap VPS)
