# Specification - User Google OAuth2 Authentication and Dynamic Sheets Creation

## Overview
Replace the static single service-account Google Sheets export with user-specific Google OAuth2 authentication. When a user requests to export their summaries/transactions, the bot checks if the user has authenticated. If not, the bot provides an authentication link. Once authenticated, the bot dynamically creates a new Google Spreadsheet in the user's Google Drive, stores the spreadsheet ID, and exports the transaction data to it.

## Functional Requirements
1. **Google App Credentials Setup**:
   - The bot administrator configures `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the `.env` file.

2. **User Authentication Flow**:
   - When the user triggers the export summary/sheet function (via callback `export_sheets` or a command):
     - The bot checks if OAuth credentials (access/refresh tokens) for the user's Telegram `user_id` exist in the database.
     - If not:
       - The bot generates a Google OAuth2 authorization URL requesting the `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` scopes.
       - The bot replies to the user with a link to authenticate and instructions telling them to copy the authorization code from their browser and reply to the bot with it.
       - The bot enters a state to wait for the authorization code.
       - Once the user replies with the code, the bot exchanges it for credentials (access/refresh tokens), stores them in the database associated with the user's Telegram ID, and continues the export flow.
     - If yes:
       - Use the saved credentials to access Sheets/Drive. If the access token is expired, refresh it using the refresh token.

3. **Dynamic Spreadsheet Creation**:
   - The bot checks if a `spreadsheet_id` is registered in the database for the user's Telegram ID.
   - If not:
     - The bot calls the Google Sheets API (or Drive API) using the user's authorized credentials to create a new spreadsheet named `Savings & Transaction Bot Export`.
     - Save the new `spreadsheet_id` in the database under the user's configurations.
   - If yes:
     - Use the saved `spreadsheet_id` for the export.

4. **Data Export**:
   - Perform the same worksheets creation and formatting (weekly/monthly summaries, transactions) on the user's newly created/saved spreadsheet as defined in the previous export spec.
   - Provide the clickable link to the user.

5. **Database Updates**:
   - Create a table `user_configs`:
     - `user_id` INTEGER PRIMARY KEY (stores Telegram user ID).
     - `spreadsheet_id` TEXT (stores the user's Google Sheet ID).
     - `google_credentials` TEXT (stores JSON serialized credentials for OAuth2).
   - Implement database helper functions to get/set/delete these configurations.

6. **Logout/Reset Auth Command**:
   - Add a command `/google_logout` to revoke access, delete credentials and spreadsheet configuration from the database, and notify the user.

## Non-Functional Requirements
- Secure storage: credentials/tokens are stored in the local SQLite database.
- Error handling: if OAuth code is invalid, or access is revoked, notify the user with instructions to re-authenticate.

## Acceptance Criteria
- Triggering Google Sheets export without previous login redirects user to a Google login link.
- Entering the correct OAuth verification code in the bot completes authentication, creates a new spreadsheet on the user's Google account, and exports data successfully.
- Subsequent exports run seamlessly without re-asking for authentication or creating a new sheet.
- `/google_logout` deletes all authentication details and spreadsheet config for that user.
