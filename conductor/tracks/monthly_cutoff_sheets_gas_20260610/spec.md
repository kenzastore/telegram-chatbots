# Specification - Monthly Cut-off Summaries & Monthly Sheets Export (GAS)

## Overview
This track refactors the chatbot's financial summary calculation period and Google Sheets export structure to align with calendar months.
1. The transaction summary feature (`/summary`) will compute monthly aggregates based on calendar months (1st of the current month to today) instead of a dynamic 30-day sliding window.
2. The Google Sheets export feature will dynamically create or update worksheets (tabs) grouped by calendar month (e.g., `YYYY-MM Transactions` and `YYYY-MM Summaries`) within the user's Google Spreadsheet.

## Functional Requirements
1. **Calendar Month summaries (`/summary`)**:
   - The `/summary` command's monthly period will aggregate transaction credits and debits from the 1st of the current calendar month up to the current date.
   - The weekly summary remains unchanged (last 7 days).
2. **Google Sheets Monthly Sheets Export**:
   - When exporting, the bot will dynamically group all historical and current transactions by their calendar month (`YYYY-MM`).
   - For each month `YYYY-MM` represented in the database:
     - The transactions will be written to a tab named `YYYY-MM Transactions`.
     - The summaries will be written to a tab named `YYYY-MM Summaries`.
   - If a month-specific tab already exists in the spreadsheet, it will be cleared first and then updated/overwritten with the latest data.
   - If there are no transactions in the database, the bot will default to exporting empty tabs for the current calendar month.
3. **Internal Architecture & API helpers (Google Apps Script)**:
   - Refactor `Database.exportDataToSpreadsheet` in [database.ts](file:///home/karel/projects/telegram-gas-bot/database.ts) to:
     - Retrieve all user transactions.
     - Group transactions by calendar month (`YYYY-MM`).
     - Retrieve existing sheets list from the user's export spreadsheet using the Google Sheets REST API.
     - Automatically create any missing sheets (e.g. `YYYY-MM Transactions` and `YYYY-MM Summaries`) using a `batchUpdate` Sheets API call.
     - Clear existing values in the specific sheets before updating.
     - Write the transaction details and monthly summaries to the respective month-specific tabs.
   - Refactor transaction calculations in [handlers.ts](file:///home/karel/projects/telegram-gas-bot/handlers.ts) and `/summary` output to align with the new calendar month monthly summary logic.

## Acceptance Criteria
1. Running `/summary` displays monthly totals aggregated from the 1st of the current calendar month to the current date.
2. Clicking "Export to Google Sheets 📊" creates separate monthly tabs (`YYYY-MM Transactions` / `YYYY-MM Summaries`) in the export spreadsheet for each calendar month that has transactions.
3. If no transactions exist, the export spreadsheet is populated with empty `YYYY-MM Transactions` and `YYYY-MM Summaries` tabs for the current calendar month.
4. Subsequent exports update existing monthly tabs correctly, clearing old content, without duplicate tab creation.
5. Unit tests in `tests/database.test.ts` and `tests/handlers.test.ts` are updated to cover calendar month calculations and month-grouped sheets export logic with mock APIs.
6. The test suite passes completely with a code coverage of >80%.
