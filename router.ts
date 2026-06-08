```typescript
function routeUpdate(update: TelegramUpdate, token: string) {
  if (update.message) {
    const chat_id = update.message.chat.id;
    const user_id = update.message.from.id;
    const text = update.message.text?.trim() || "";

    const userProperties = PropertiesService.getUserProperties();
    const activeState = userProperties.getProperty(`STATE_${ user_id } `);

    if (activeState) {
      handleStatefulMessage(user_id, chat_id, text, activeState, token);
      return;
    }

    if (text.startsWith("/")) {
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      switch (command) {
        case "/start":
          sendTelegramMessage(chat_id, "Welcome to Savings Tracker Bot! Use /add or /quick to start logging transactions.", token);
          break;
        case "/quick":
          handleQuickCommand(user_id, chat_id, args, token);
          break;
        case "/balance":
          handleBalanceCommand(user_id, chat_id, token);
          break;
        case "/add":
          startAddFlow(user_id, chat_id, token);
          break;
        default:
          sendTelegramMessage(chat_id, "Unknown command. Try /add, /quick, /balance, /help.", token);
      }
    }
  } else if (update.callback_query) {
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

UrlFetchApp.fetch(url, options);
}
```