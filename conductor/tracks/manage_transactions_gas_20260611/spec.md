# Specification - Edit, Remove, and Clear Transactions - GAS Refactor

## Overview
This track refactors/adapts the interactive bot conversation handlers and tests for editing, removing, and clearing transactions from Python to Google Apps Script. It ensures full parity in bot interaction flows, double-confirmation menus, and subsequent balance recalculations, and introduces complete unit testing coverage in Jest.

## Functional Requirements
1. **Interactive Transaction Editing (`/edit`)**:
   - Triggers the editing flow and sets state machine appropriately.
   - If `/edit` is executed without arguments, prompts the user to enter/send the transaction ID.
   - Once an ID is provided (either via command argument or stateful entry), validates it, and prompts the user step-by-step for Date, Type, Amount, and Description.
   - Handles inline callback queries for "Keep current" fields, cancellation, and confirmation.
   - Once edits are confirmed, updates the database, triggers chronological balance recalculation, and formats outputs using the Rupiah currency helper.
2. **Interactive Clearing/Deletion (`/clear`)**:
   - Offers an inline keyboard with choices: Recent, By ID, This Week, This Month.
   - When clearing "By ID", the bot prompts the user to enter/send the transaction ID.
   - Before prompting for confirmation to delete, the bot must retrieve and display the transaction details/properties (Date, Type, Amount, Description) of that specific transaction ID so the user can verify what they are deleting.
   - Displays confirmation screen with detailed summary of target deletion (number of transactions affected, ID, and details of the transaction if clearing by ID).
   - Handles confirm ("Confirm Delete ⚠️") and cancel ("Cancel ❌") callbacks.
   - Once deleted, updates the database, triggers chronological balance recalculation/repair for remaining transactions, and displays the updated current net balance in the success message.
3. **Parity in Bot Responses**:
   - Ensure all success/error bot messages, buttons, and state properties match Python's functional requirements.

## Non-Functional Requirements
- **TypeScript Type Safety**: Enforce type definitions for transactions and state values.
- **TDD / Testing Coverage**: Follow the Test-Driven Development (TDD) cycle. Keep unit test coverage at >80% for modified files.

## Acceptance Criteria
- `/edit` state transitions work correctly, updating transaction date, type, amount, or description, and showing edit summaries.
- `/clear` allows selection of different ranges, asks for double confirmation, and deletes records successfully.
- Balance recalculation is automatically triggered upon any command that modifies data (including edit and clear/delete) to keep all running balances correct, and updated balances are correctly displayed in the bot replies.
- All unit tests in Jest pass successfully.
