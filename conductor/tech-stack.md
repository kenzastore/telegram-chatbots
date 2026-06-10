# Tech Stack: Savings & Financial Transaction Telegram Chatbot

## Language
*   **TypeScript / JavaScript (ES6)**: Local development is done in TypeScript, compiled and uploaded to Google Apps Script.

## Libraries & Frameworks
*   **Google Apps Script Built-in Services**:
    *   **UrlFetchApp**: Used for outgoing raw HTTP API requests to the Telegram Bot API.
    *   **SpreadsheetApp**: Used to interact with Google Sheets as the relational database storage.
    *   **PropertiesService**: Used for storing persistent script configurations (e.g., bot tokens) and user state machine records.
    *   **LockService**: Used to manage concurrent write operations and prevent database race conditions.
*   **External Google REST APIs (via UrlFetchApp)**:
    *   **Google Sheets API v4**: Used to create, clear, and write data to the user's exported spreadsheet.
    *   **Google Drive API v3**: Used to set sharing permissions on the created spreadsheet to "anyone with the link can view".

## Tools & DevOps
*   **@google/clasp**: Command Line Apps Script Projects tool to manage, pull, push, and deploy Apps Script code locally.
*   **Google Sheets**: Serving both as the backend database and the user-facing financial dashboard.
*   **Google Cloud Logging**: Integrated execution logs (`console.log`, `console.error`) accessible via the Apps Script dashboard.

## Local Testing Stack
*   **Jest**: JavaScript/TypeScript testing framework used for local unit testing.
*   **ts-jest**: TypeScript preprocessor with source map support for Jest, enabling seamless testing of `.ts` files.
*   **GAS Mocks**: Custom local mocks of global Google Apps Script services (`UrlFetchApp`, `PropertiesService`, `LockService`, `SpreadsheetApp`, `Utilities`, `Logger`) to facilitate running unit tests locally in Node.js.
