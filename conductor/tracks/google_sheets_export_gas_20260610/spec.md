# Specification - Google Sheets Export Track (GAS version)

## Overview
Port the Google Sheets Export feature from the original Python implementation into the Google Apps Script (GAS) codebase. This feature allows users to trigger a manual export of their transaction logs and financial summaries directly to a Google Spreadsheet stored in their own Google Drive (using their OAuth2 access token). The export is triggered via an inline keyboard button under the `/summary` command. The first export will create a new spreadsheet, store its ID, and set permissions so that "anyone with the link can view" it. Subsequent exports will overwrite/update the same spreadsheet to avoid cluttering the user's Drive.

## Functional Requirements
1. **Inline Button Trigger**:
   * Add an inline button "Export to Google Sheets 📊" (with callback data `export_sheets`) under the `/summary` command message response.
   * When clicked, acknowledge the callback query and display a temporary status message (e.g., "Exporting data to Google Sheets...").
2. **Spreadsheet Selection & Lifecycle**:
   * Check if the user has an existing export spreadsheet ID stored in `PropertiesService` (key: `EXPORT_SS_ID_<userId>`).
   * **First-time Export**:
     - If no ID is stored, create a new spreadsheet in the user's Google Drive using the Sheets API v4 REST endpoint. Title: `Finance Bot Export - <UserId>`.
     - Save the new spreadsheet ID in `PropertiesService` under the key `EXPORT_SS_ID_<userId>`.
     - Use the Drive API v3 permissions REST endpoint to set the sharing permissions to public reader: role `reader` for type `anyone`.
   * **Subsequent Exports**:
     - If an ID is stored, check if it exists and is accessible. If yes, reuse it. If it was deleted/inaccessible, create a new one, update the stored ID, and set public reader permissions.
3. **Data Export Structure**:
   * Clear the existing contents of the export spreadsheet and write fresh data into two sheets/tabs:
     - **Tab 1: Transactions**: Export all transactions for the user from the database. Columns: `ID`, `Date`, `Amount`, `Description`, `Type`, `Balance After`.
     - **Tab 2: Summaries**: Export the aggregated weekly and monthly summaries grouped by description.
4. **Success Response**:
   * Once completed, send the URL of the export spreadsheet to the user in a message:
     `📊 <b>Export Complete!</b>\n\nYour data has been successfully exported. You can view it here: <a href="<Spreadsheet URL>">Google Sheets Export</a>`

## Non-Functional Requirements
* **API Error Handling**: Gracefully handle missing OAuth tokens, API call limits, or invalid spreadsheet IDs by notifying the user (e.g., "❌ Export failed: ...").
* **Jest Unit Testing**: Maintain coverage by writing Jest tests in `tests/handlers.test.ts` or a new `tests/export.test.ts`. Mock Sheets and Drive API REST calls.

## Acceptance Criteria
* The `/summary` command prints the summaries and provides an inline button: "Export to Google Sheets 📊".
* Clicking the button creates/updates a spreadsheet in the user's Google Drive and returns the spreadsheet link to the user.
* The spreadsheet has two tabs ("Transactions" and "Summaries") populated and styled correctly.
* The spreadsheet permissions allow anyone with the link to view the spreadsheet.
* Local unit tests cover the export logic, and `npm test` runs successfully.

## Out of Scope
* Bidirectional sync (modifying sheets does not update database).
* Supporting multiple export files per user (one export file per user is reused).
