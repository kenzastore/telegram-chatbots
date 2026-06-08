# Specification - Edit, Remove, and Clear Transactions

## Overview
This track adds the ability to edit, remove, or batch clear transactions using a clean, interactive conversation flow and confirmation prompts inside the Telegram bot.

## Functional Requirements
1. **Interactive Transaction Editing (`/edit`)**:
   - Triggers a ConversationHandler.
   - **Step 1: ID Input**: Prompts the user to enter the transaction ID.
   - **Step 2: Edit Fields**: Prompts the user step-by-step for Date, Type, Amount, and Description. For each field, the bot offers an inline button or option to "Keep current: <value>".
   - **Step 3: Save & Confirmation**: Displays a summary of the edits and asks the user to confirm. Once confirmed, updates the database and recalculates subsequent balances.
2. **Interactive Clearing/Deletion (`/clear`)**:
   - Triggers an inline keyboard with choices:
     - **Recent**: Clear the last transaction logged.
     - **By ID**: Delete a specific transaction by ID.
     - **This Week**: Clear all transactions logged in the last 7 days.
     - **This Month**: Clear all transactions for the current calendar month.
     - **Specific Month**: Prompts the user to enter a specific month (`YYYY-MM`) to clear.
3. **Deletion Confirmation**:
   - Any selection in `/clear` prompts a confirmation inline keyboard (with "Confirm Delete ⚠️" and "Cancel ❌" buttons) listing a summary of how many transactions or which ID will be cleared.
4. **Subsequent Balance Recalculation**:
   - When a transaction is updated or deleted, the bot must recalculate `balance_after` for all transactions sequentially sorted by `date ASC, id ASC` to maintain consistency in the history.

## Non-Functional Requirements
- Maintain high code coverage (>80%).
- Ensure SQLite db integrity.

## Acceptance Criteria
- `/edit` allows updating all properties of a transaction by ID.
- `/clear` successfully deletes recent, specific IDs, weekly, or monthly logs with double confirmation.
- Modifying or deleting records updates the running balances correctly.
- All tests pass.
