Provide a comprehensive architectural plan and step-by-step refactoring guide to migrate an entire Telegram chatbot project to run on Google Apps Script. The guide should address specific constraints of the Apps Script environment, including:

1. **Execution Model:** Transitioning from a long-running server process to a stateless, event-driven model using `doPost(e)` to handle incoming webhooks.
2. **State Management:** Replacing local file systems or in-memory variables with persistent storage solutions suitable for Apps Script, such as Google Sheets, Properties Service, or Firebase.
3. **Asynchronous Operations:** Handling tasks that typically rely on async/await or background workers within the synchronous limitations of Apps Script.
4. **Library & Dependency Management:** Strategies for replacing Node.js/Python packages with Google Apps Script services or external API calls.
5. **Error Handling & Logging:** Implementing robust error catching and logging using Google Cloud Logging or spreadsheet-based logs to ensure stability.

Please provide code snippets demonstrating the transformation of a standard webhook handler into a Google Apps Script compatible function.
