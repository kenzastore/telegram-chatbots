# Tech Stack: Savings & Financial Transaction Telegram Chatbot

## Language
*   **TypeScript / JavaScript (ES6)**: Local development is done in TypeScript, compiled and uploaded to Google Apps Script.

## Libraries & Frameworks
*   **Google Apps Script Built-in Services**:
    *   **UrlFetchApp**: Used for outgoing raw HTTP API requests to the Telegram Bot API.
    *   **SpreadsheetApp**: Used to interact with Google Sheets as the relational database storage.
    *   **PropertiesService**: Used for storing persistent script configurations (e.g., bot tokens) and user state machine records.
    *   **LockService**: Used to manage concurrent write operations and prevent database race conditions.

## Tools & DevOps
*   **@google/clasp**: Command Line Apps Script Projects tool to manage, pull, push, and deploy Apps Script code locally.
*   **Google Sheets**: Serving both as the backend database and the user-facing financial dashboard.
*   **Google Cloud Logging**: Integrated execution logs (`console.log`, `console.error`) accessible via the Apps Script dashboard.
