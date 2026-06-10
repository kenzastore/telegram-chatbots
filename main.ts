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
  let chatId: number | undefined;
  let token: string | null = null;
  try {
    const contents = JSON.parse(e.postData.contents) as TelegramUpdate;
    console.log("Received Update:", JSON.stringify(contents));

    token = PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN Script Property.");
    }

    if (contents.message) {
      chatId = contents.message.chat.id;
    } else if (contents.callback_query && contents.callback_query.message) {
      chatId = contents.callback_query.message.chat.id;
    }

    // Process update stateless
    routeUpdate(contents, token);

    // Return success to Telegram
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error handling doPost:", error);
    logErrorToSheet(error);

    try {
      PropertiesService.getScriptProperties().setProperty("LAST_ERROR", `${new Date().toISOString()}: ${error.message}\n${error.stack}`);
    } catch (e) {
      console.error("Failed to save LAST_ERROR property:", e);
    }

    if (chatId && token) {
      try {
        sendTelegramMessage(
          chatId,
          `❌ <b>System Error</b>\n\nAn error occurred while processing your request:\n<code>${error.message}</code>\n\nPlease check your Google Apps Script settings.`,
          token
        );
      } catch (sendErr) {
        console.error("Failed to send error message to Telegram:", sendErr);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles incoming GET requests (Google OAuth2 redirect callback).
 */
function doGet(e: GoogleAppsScript.Events.DoGet) {
  try {
    const code = e.parameter.code;
    const state = e.parameter.state; // Telegram user ID

    if (!code || !state) {
      return HtmlService.createHtmlOutput(
        "<html><body style='font-family: sans-serif; text-align: center; padding-top: 50px;'>" +
        "<h2 style='color: #c62828;'>Authentication Failed</h2>" +
        "<p>Missing code or state parameters.</p>" +
        "</body></html>"
      );
    }

    // Exchange auth code and save refresh token
    OAuth.handleAuthRedirect(code, state);

    // Notify user on Telegram
    const token = PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
    if (token) {
      sendTelegramMessage(
        Number(state),
        "🎉 <b>Google account connected successfully!</b>\n\nYour transactions will now be saved in your Google Drive under a spreadsheet named <code>Telegram Savings Bot</code>.",
        token
      );
    }

    return HtmlService.createHtmlOutput(
      "<html><body style='font-family: sans-serif; text-align: center; padding-top: 50px;'>" +
      "<h2 style='color: #2e7d32;'>Authentication Successful!</h2>" +
      "<p>Your Google account has been connected to the bot.</p>" +
      "<p>You can now close this window and return to Telegram.</p>" +
      "</body></html>"
    );
  } catch (error) {
    console.error("Error handling redirect doGet:", error);
    return HtmlService.createHtmlOutput(
      "<html><body style='font-family: sans-serif; text-align: center; padding-top: 50px;'>" +
      "<h2 style='color: #c62828;'>Authentication Failed</h2>" +
      `<p>Error details: ${error.message}</p>` +
      "<p>Please try initiating `/google_login` again from Telegram.</p>" +
      "</body></html>"
    );
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

function debugScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const token = scriptProperties.getProperty("TELEGRAM_BOT_TOKEN");
  const clientId = scriptProperties.getProperty("GOOGLE_CLIENT_ID");
  const clientSecret = scriptProperties.getProperty("GOOGLE_CLIENT_SECRET");
  const redirectUri = scriptProperties.getProperty("REDIRECT_URI");

  console.log("=== Bot Debug Diagnostics ===");
  console.log("TELEGRAM_BOT_TOKEN:", token ? `Set (Length: ${token.length})` : "Missing");
  console.log("GOOGLE_CLIENT_ID:", clientId ? `Set (${clientId.substring(0, 15)}...)` : "Missing");
  console.log("GOOGLE_CLIENT_SECRET:", clientSecret ? "Set" : "Missing");
  console.log("REDIRECT_URI:", redirectUri ? redirectUri : "Missing");

  if (token) {
    try {
      const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      console.log("Telegram Webhook Info:", response.getContentText());
    } catch (e) {
      console.error("Failed to fetch webhook info:", e.message);
    }
  } else {
    console.log("No token, skipping webhook info check.");
  }
}