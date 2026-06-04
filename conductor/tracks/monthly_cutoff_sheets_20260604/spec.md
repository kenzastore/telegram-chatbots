# Specification - Monthly Cut-off Summaries & Monthly Sheets Export

## Overview
This track modifies the chatbot's financial summary calculation period and Google Sheets export organization to align with calendar months. 
1. The transaction summary feature (`/summary`) will compute monthly aggregates based on calendar months (1st to the last day of the month) instead of a dynamic 30-day sliding window.
2. The Google Sheets export feature will dynamically create or update worksheets (tabs) grouped by calendar month (e.g., `YYYY-MM Transactions` and `YYYY-MM Summaries`) within the configured Google Spreadsheet.

## Functional Requirements
1. **Calendar Month summaries**:
   - The `/summary` command's monthly period will aggregate transaction credits and debits from the 1st of the current month up to the current date.
   - The weekly summary remains unchanged (last 7 days).
2. **Google Sheets Monthly Sheets**:
   - When exporting, the bot will dynamically group all historical and current transactions by their calendar month (`YYYY-MM`).
   - For each month `YYYY-MM` represented in the database:
     - The transactions will be written to a tab named `YYYY-MM Transactions`.
     - The summaries will be written to a tab named `YYYY-MM Summaries`.
   - If the tabs already exist in the spreadsheet, they will be overwritten/updated with the latest data.
3. **Database and Export helpers**:
   - Update `db.py` to retrieve summaries and transactions filtered by calendar month.
   - Update `sheets.py` to group transactions by month, verify tab existence, create missing tabs, and update them.

## Acceptance Criteria
1. Running `/summary` monthly displays aggregated totals only for the current calendar month.
2. Exporting to Google Sheets creates separate monthly tabs (`YYYY-MM Transactions` / `YYYY-MM Summaries`) for each month that has recorded transactions.
3. Exporting updates existing monthly tabs without duplicate tab creation.
4. Unit tests are updated and coverage is >80%.
