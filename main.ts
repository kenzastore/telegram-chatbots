```typescript
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message?: { message_id: number; chat: { id: number }; text: string };
    data: string;
  };
}

/**
 * Handles incoming Telegram Webhook updates.
 */
function doPost(e: GoogleAppsScript.Events.DoPost) {
  try {
    const contents = JSON.parse(e.postData.contents) as TelegramUpdate;
    console.log("Received Update:", JSON.stringify(contents));

    const token = PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN Script Property.");
    }

    // Process update stateless
    routeUpdate(contents, token);

    // Return success to Telegram
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error handling doPost:", error);
    logErrorToSheet(error);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function logErrorToSheet(error: any) {
  try {
    const ssId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    const ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("ErrorLogs");
    if (!sheet) {
      sheet = ss.insertSheet("ErrorLogs");
      sheet.appendRow(["Timestamp", "Message", "Stack"]);
    }
    sheet.appendRow([new Date(), error.message, error.stack]);
  } catch (e) {
    console.error("Failed to write to ErrorLogs sheet:", e);
  }
}
```