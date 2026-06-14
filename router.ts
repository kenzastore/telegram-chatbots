function routeUpdate(update: TelegramUpdate, token: string) {
  if (update.message) {
    const chat_id = update.message.chat.id;
    const user_id = update.message.from.id;
    const text = update.message.text?.trim() || "";

    const userProperties = PropertiesService.getUserProperties();
    const activeState = userProperties.getProperty(`STATE_${user_id}`);

    if (text.startsWith("/")) {
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      // Public commands (unauthenticated)
      if (command === "/start") {
        if (OAuth.isUserAuthenticated(user_id)) {
          sendTelegramMessage(chat_id, "Welcome back to Savings Tracker Bot! You are already connected to your Google account. Use the menu commands below to manage your transactions.", token, getCommandMenuReplyMarkup());
        } else {
          sendTelegramMessage(chat_id, "Welcome to Savings Tracker Bot! Connect your Google account first with /google_login. Use /add or /quick to log transactions.", token, getCommandMenuReplyMarkup());
        }
        return;
      }
      if (command === "/help") {
        const helpText = "🤖 <b>Savings Tracker Bot Help Guide</b>\n\n" +
          "<b>Authentication:</b>\n" +
          "/google_login - Connect your Google account\n" +
          "/google_logout - Disconnect your Google account\n\n" +
          "<b>Commands:</b>\n" +
          "/add - Interactive multi-step transaction log\n" +
          "/quick &lt;sentence&gt; - Quick-add using natural language\n" +
          "/balance - Check your current net balance\n" +
          "/view - View your recent transaction history\n" +
          "/clear - Delete transaction records\n" +
          "/edit - Edit a transaction's details by ID\n" +
          "/summary - View weekly/monthly aggregates";
        sendTelegramMessage(chat_id, helpText, token, getCommandMenuReplyMarkup());
        return;
      }
      if (command === "/google_login") {
        if (OAuth.isUserAuthenticated(user_id)) {
          sendTelegramMessage(chat_id, "✅ You are already connected to your Google account. Use /google_logout to disconnect or switch accounts.", token, getCommandMenuReplyMarkup());
          return;
        }
        const authUrl = OAuth.getAuthUrl(user_id);
        sendTelegramMessage(chat_id, "Click the button below to sign in with Google:", token, {
          inline_keyboard: [[
            { text: "🔑 Connect Google Account", url: authUrl }
          ]]
        });
        return;
      }
      if (command === "/google_logout") {
        OAuth.logoutUser(user_id);
        PropertiesService.getUserProperties().deleteProperty(`STATE_${user_id}`);
        sendTelegramMessage(chat_id, "👋 <b>Logged out successfully.</b> Your Google credentials and mappings have been deleted.", token, getCommandMenuReplyMarkup());
        return;
      }
      if (command === "/cancel") {
        PropertiesService.getUserProperties().deleteProperty(`STATE_${user_id}`);
        sendTelegramMessage(chat_id, "❌ <b>Operation cancelled.</b>", token, getCommandMenuReplyMarkup());
        return;
      }
      if (command === "/debug") {
        const scriptProperties = PropertiesService.getScriptProperties();
        const botToken = scriptProperties.getProperty("TELEGRAM_BOT_TOKEN");
        const clientId = scriptProperties.getProperty("GOOGLE_CLIENT_ID");
        const clientSecret = scriptProperties.getProperty("GOOGLE_CLIENT_SECRET");
        const redirectUri = scriptProperties.getProperty("REDIRECT_URI");
        const lastError = scriptProperties.getProperty("LAST_ERROR") || "None";

        const debugMsg = "🔍 <b>Bot Debug Diagnostics</b>\n\n" +
          `• <b>TELEGRAM_BOT_TOKEN</b>: ${botToken ? `Set (Length: ${botToken.length})` : "❌ Missing"}\n` +
          `• <b>GOOGLE_CLIENT_ID</b>: ${clientId ? `Set (${clientId.substring(0, 15)}...)` : "❌ Missing"}\n` +
          `• <b>GOOGLE_CLIENT_SECRET</b>: ${clientSecret ? "Set (Hidden)" : "❌ Missing"}\n` +
          `• <b>REDIRECT_URI</b>: ${redirectUri ? `<code>${redirectUri}</code>` : "❌ Missing"}\n\n` +
          `⚠️ <b>Last Recorded Error:</b>\n<pre>${lastError}</pre>`;

        sendTelegramMessage(chat_id, debugMsg, token, getCommandMenuReplyMarkup());
        return;
      }

      // Check Authentication Gate for other commands
      if (!OAuth.isUserAuthenticated(user_id)) {
        sendTelegramMessage(chat_id, "⚠️ <b>Google Login Required</b>\n\nYou must connect your Google account to use this command. Run /google_login to get started.", token, getCommandMenuReplyMarkup());
        return;
      }

      // Route Authenticated commands
      switch (command) {
        case "/quick":
          handleQuickCommand(user_id, chat_id, args, token);
          break;
        case "/balance":
          handleBalanceCommand(user_id, chat_id, token);
          break;
        case "/add":
          startAddFlow(user_id, chat_id, token);
          break;
        case "/view":
          handleViewCommand(user_id, chat_id, token);
          break;
        case "/clear":
          startClearFlow(user_id, chat_id, token);
          break;
        case "/edit":
          startEditFlow(user_id, chat_id, args, token);
          break;
        case "/summary":
          handleSummaryCommand(user_id, chat_id, token);
          break;
        default:
          sendTelegramMessage(chat_id, "Unknown command. Try /add, /quick, /balance, /help.", token, getCommandMenuReplyMarkup());
      }
    } else {
      // Handle non-command messages (stateful flow inputs)
      if (!OAuth.isUserAuthenticated(user_id)) {
        sendTelegramMessage(chat_id, "⚠️ <b>Google Login Required</b>\n\nPlease login first with /google_login.", token, getCommandMenuReplyMarkup());
        return;
      }
      if (activeState) {
        handleStatefulMessage(user_id, chat_id, text, activeState, token);
      } else {
        sendTelegramMessage(chat_id, "Send a command like /add or /quick to start logging. Type /help for assistance.", token, getCommandMenuReplyMarkup());
      }
    }
  } else if (update.callback_query) {
    const user_id = update.callback_query.from.id;
    if (!OAuth.isUserAuthenticated(user_id)) {
      answerCallbackQuery(update.callback_query.id, "⚠️ Login required.", token);
      return;
    }
    handleCallbackQuery(update.callback_query, token);
  }
}

function sendTelegramMessage(chatId: number, text: string, token: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const content = response.getContentText();
  if (responseCode !== 200) {
    throw new Error(`Telegram API sendMessage failed (${responseCode}): ${content}`);
  }
}

function answerCallbackQuery(callbackQueryId: string, text: string, token: string) {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
    text: text
  };
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const content = response.getContentText();
  if (responseCode !== 200) {
    throw new Error(`Telegram API answerCallbackQuery failed (${responseCode}): ${content}`);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { routeUpdate, sendTelegramMessage, answerCallbackQuery };
}