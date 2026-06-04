# Specification - Google Sheets Export Track

## Overview
Add the ability to export transaction logs and financial summaries directly to a newly created Google Spreadsheet. The export is triggered via an inline keyboard button under the `/summary` command. The bot authenticates using a Google Service Account configured in `.env`, generates a new spreadsheet, writes the data to two tabs ("Transactions" and "Summaries"), sets the sharing permissions to public reader ("anyone with the link"), and returns the clickable URL link to the user.

## Functional Requirements
1. **Inline Button Trigger**:
   * Append an inline button "Export to Google Sheets 📊" to the `/summary` command message response.
   * When clicked, acknowledge the callback query and display a temporary status message (e.g., "Creating spreadsheet...").
2. **Google Authentication**:
   * Authenticate using a Google Service Account. The path to the credentials JSON file is specified in the `.env` file via `GOOGLE_SERVICE_ACCOUNT_FILE`.
3. **Spreadsheet Creation & Structure**:
   * Create a new Google Spreadsheet titled: `Finance Bot Export - <Current Date>` (format: `YYYY-MM-DD`).
   * **Tab 1: Transactions**: Export all columns from the SQLite database `transactions` table: `id`, `date`, `amount`, `description`, `type`, `balance_after`.
   * **Tab 2: Summaries**: Export the aggregated weekly and monthly summaries grouped by description.
4. **Permissions**:
   * Use the Google Drive API to set permissions of the newly created spreadsheet so that anyone with the link can view it (role `reader` for type `anyone`).
5. **Success Response**:
   * Send the URL of the newly created spreadsheet as a message to the user.

## Non-Functional Requirements
* **API Error Handling**: Gracefully handle missing configuration (`GOOGLE_SERVICE_ACCOUNT_FILE`), file load errors, or Google API connection issues/limits by notifying the user instead of crashing the bot.
* **TDD and Coverage**: Implement tests mocking Google API responses to ensure the logic works without making live HTTP calls. Maintain overall project test coverage above 80%.

## Acceptance Criteria
* Clicking the "Export to Google Sheets" button invokes the Google Sheets and Drive APIs.
* A new Google Spreadsheet is created with "Transactions" and "Summaries" tabs formatted with appropriate column headers.
* The spreadsheet is readable by anyone with the link.
* The bot sends the link to the user.
* All unit tests pass with mocked APIs.

## Out of Scope
* Individual user Google OAuth flow (users do not authenticate their own accounts).
* Modifying existing spreadsheets (always creates a new one).
* Bidirectional sync (importing sheet data back into the SQLite database).
