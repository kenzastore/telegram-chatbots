/**
 * Core Chatbot Command Handlers
 */

function handleBalanceCommand(userId: number, chatId: number, token: string) {
  try {
    const accessToken = OAuth.getAccessTokenForUser(userId);
    const balance = Database.getUserBalance(userId, accessToken);

    const formattedBalance = formatCurrency(balance);
    sendTelegramMessage(chatId, `💰 <b>Your Net Balance:</b>\n\n<code>${formattedBalance}</code>`, token);
  } catch (error) {
    console.error("Error in handleBalanceCommand:", error);
    sendTelegramMessage(chatId, `❌ Error retrieving balance: ${error.message}`, token);
  }
}

function handleViewCommand(userId: number, chatId: number, token: string) {
  try {
    const accessToken = OAuth.getAccessTokenForUser(userId);
    const ssId = Database.getSpreadsheetId(userId, accessToken);
    const sheets = Database.getSheetsList(ssId, accessToken);
    
    // Find the current or latest transactions sheet
    const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();
    if (txSheets.length === 0) {
      sendTelegramMessage(chatId, "📭 You don't have any logged transactions yet. Start with /add or /quick!", token);
      return;
    }

    const latestSheet = txSheets[0];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${latestSheet}'!A:G`;
    const data = Database.apiCall(url, 'get', null, accessToken);

    if (!data.values || data.values.length <= 1) {
      sendTelegramMessage(chatId, `📭 No transactions logged in the sheet: <code>${latestSheet}</code>.`, token);
      return;
    }

    // Filter transactions belonging to this user
    const userTxs: any[] = [];
    for (let i = data.values.length - 1; i >= 1; i--) {
      const row = data.values[i];
      if (Number(row[0]) === userId) {
        userTxs.push({
          id: row[1],
          date: row[2],
          amount: Number(row[3]),
          description: row[4],
          type: row[5],
          balanceAfter: Number(row[6])
        });
      }
      if (userTxs.length >= 10) break; // Limit to last 10
    }

    if (userTxs.length === 0) {
      sendTelegramMessage(chatId, "📭 No transactions found for your user ID in the latest sheet.", token);
      return;
    }

    let messageText = `📊 <b>Recent History (Last ${userTxs.length} Transactions)</b>\nSheet: <code>${latestSheet}</code>\n\n`;
    // Print in chronological order (reverse the userTxs back)
    userTxs.reverse().forEach(tx => {
      const typeSign = tx.type === 'credit' ? '🟢 +' : '🔴 -';
      const formattedAmount = formatCurrency(tx.amount);
      messageText += `• <b>ID ${tx.id}</b> | 📅 ${tx.date}\n  ${typeSign} ${formattedAmount} (${tx.description})\n\n`;
    });

    const currentBalance = Database.getUserBalance(userId, accessToken, ssId);
    messageText += `💰 <b>Running Balance:</b> <code>${formatCurrency(currentBalance)}</code>`;

    sendTelegramMessage(chatId, messageText, token);
  } catch (error) {
    console.error("Error in handleViewCommand:", error);
    sendTelegramMessage(chatId, `❌ Error retrieving transaction history: ${error.message}`, token);
  }
}

/**
 * Currency Formatter Helper (Rupiah currency)
 */
function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Format numeric values manually to avoid internationalization formatting variations in GAS runtime
  const parts = absVal.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousand separators
  let formattedInteger = "";
  let count = 0;
  for (let i = integerPart.length - 1; i >= 0; i--) {
    formattedInteger = integerPart[i] + formattedInteger;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedInteger = "." + formattedInteger;
    }
  }
  
  return (isNegative ? "-" : "") + "Rp " + formattedInteger + "," + decimalPart;
}

/**
 * Stubs for Stateful and Advanced Commands (To be implemented in Phase 3)
 */

function handleQuickCommand(userId: number, chatId: number, args: string, token: string) {
  try {
    if (!args) {
      sendTelegramMessage(chatId, "💡 <b>Usage:</b> <code>/quick &lt;spent/got&gt; &lt;amount&gt; &lt;description&gt; [yesterday/today]</code>\n\nExample:\n• <code>/quick spent 50k for lunch yesterday</code>\n• <code>/quick got 1.5jt from salary</code>", token);
      return;
    }

    const parsed = parseTransactionSentence(args);
    if (!parsed) {
      sendTelegramMessage(chatId, "⚠️ <b>Could not parse sentence.</b> Make sure to include transaction type (spent/got/bayar/etc.), amount, and description.\n\nExample:\n• <code>/quick spent 50k for lunch yesterday</code>", token);
      return;
    }

    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(`TEMP_QUICK_${userId}`, JSON.stringify(parsed));

    const formattedAmount = formatCurrency(parsed.amount);
    const typeLabel = parsed.type === 'credit' ? '🟢 Credit (Income)' : '🔴 Debit (Expense)';

    const confirmText = `📝 <b>Confirm Transaction Details:</b>\n\n` +
      `📅 <b>Date:</b> ${parsed.date}\n` +
      `➕ <b>Type:</b> ${typeLabel}\n` +
      `💰 <b>Amount:</b> ${formattedAmount}\n` +
      `📝 <b>Description:</b> ${parsed.description}\n\n` +
      `Do you want to save this transaction?`;

    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Yes, Save", callback_data: "quick_confirm_yes" },
        { text: "❌ Cancel", callback_data: "quick_confirm_no" }
      ]]
    };

    sendTelegramMessage(chatId, confirmText, token, keyboard);
  } catch (error) {
    console.error("Error in handleQuickCommand:", error);
    sendTelegramMessage(chatId, `❌ Error: ${error.message}`, token);
  }
}

function startAddFlow(userId: number, chatId: number, token: string) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(`STATE_${userId}`, "ADD_TYPE");

    const keyboard = {
      inline_keyboard: [[
        { text: "🔴 Expense (Debit)", callback_data: "add_type_debit" },
        { text: "🟢 Income (Credit)", callback_data: "add_type_credit" }
      ]]
    };

    sendTelegramMessage(chatId, "➕ <b>Log Transaction:</b>\n\nPlease select the transaction type:", token, keyboard);
  } catch (error) {
    console.error("Error in startAddFlow:", error);
    sendTelegramMessage(chatId, `❌ Error initiating log flow: ${error.message}`, token);
  }
}

function handleStatefulMessage(userId: number, chatId: number, text: string, activeState: string, token: string) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const scriptProperties = PropertiesService.getScriptProperties();
    const tempTxKey = `TEMP_TX_${userId}`;
    const stateKey = `STATE_${userId}`;

    const tempTxStr = scriptProperties.getProperty(tempTxKey);
    const tempTx = tempTxStr ? JSON.parse(tempTxStr) : {};

    if (activeState === "ADD_AMOUNT") {
      const cleanedText = text.replace(/rp\.?/gi, "").replace(/\./g, "").replace(/,/g, "").replace(/\s+/g, "").trim();
      const amount = parseFloat(cleanedText);
      if (isNaN(amount) || amount <= 0) {
        sendTelegramMessage(chatId, "⚠️ <b>Invalid amount.</b> Please send a positive numeric value (e.g., <code>50000</code>):", token);
        return;
      }

      tempTx.amount = amount;
      scriptProperties.setProperty(tempTxKey, JSON.stringify(tempTx));

      userProperties.setProperty(stateKey, "ADD_DESC");
      sendTelegramMessage(chatId, "📝 Please enter a brief description (e.g., <code>Lunch</code>, <code>Monthly Salary</code>):", token);
      return;
    }

    if (activeState === "ADD_DESC") {
      if (!text) {
        sendTelegramMessage(chatId, "⚠️ Description cannot be empty. Please enter a brief description:", token);
        return;
      }

      tempTx.description = text;
      tempTx.date = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

      const accessToken = OAuth.getAccessTokenForUser(userId);
      const savedTx = Database.addTransaction(userId, tempTx, accessToken);

      userProperties.deleteProperty(stateKey);
      scriptProperties.deleteProperty(tempTxKey);

      const typeSign = savedTx.type === 'credit' ? '🟢' : '🔴';
      const typeLabel = savedTx.type === 'credit' ? 'Income' : 'Expense';
      
      const successText = `✅ <b>Transaction Saved Successfully!</b>\n\n` +
        `📅 <b>Date:</b> ${savedTx.date}\n` +
        `➕ <b>Type:</b> ${typeSign} ${typeLabel}\n` +
        `💰 <b>Amount:</b> ${formatCurrency(savedTx.amount)}\n` +
        `📝 <b>Description:</b> ${savedTx.description}\n\n` +
        `💰 <b>Current Balance:</b> <code>${formatCurrency(savedTx.balanceAfter)}</code>`;

      sendTelegramMessage(chatId, successText, token);
      return;
    }
  } catch (error) {
    console.error("Error in handleStatefulMessage:", error);
    sendTelegramMessage(chatId, `❌ Error processing input: ${error.message}`, token);
    PropertiesService.getUserProperties().deleteProperty(`STATE_${userId}`);
    PropertiesService.getScriptProperties().deleteProperty(`TEMP_TX_${userId}`);
  }
}

function handleCallbackQuery(callbackQuery: any, token: string) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  try {
    const userProperties = PropertiesService.getUserProperties();
    const scriptProperties = PropertiesService.getScriptProperties();
    const stateKey = `STATE_${userId}`;
    const tempTxKey = `TEMP_TX_${userId}`;

    if (data.startsWith("add_type_")) {
      const type = data.replace("add_type_", "") as 'debit' | 'credit';
      const tempTx = { type: type };
      scriptProperties.setProperty(tempTxKey, JSON.stringify(tempTx));

      userProperties.setProperty(stateKey, "ADD_AMOUNT");
      
      const typeSign = type === 'credit' ? '🟢 Income' : '🔴 Expense';
      const text = `➕ <b>Log Transaction:</b>\n\nSelected Type: <b>${typeSign}</b>\n\n👉 Please type and send the transaction amount:`;
      
      answerCallbackQuery(callbackQuery.id, "Type selected", token);
      updateTelegramMessage(chatId, callbackQuery.message.message_id, text, token);
      return;
    }

    if (data === "quick_confirm_yes") {
      const tempQuickStr = scriptProperties.getProperty(`TEMP_QUICK_${userId}`);
      if (!tempQuickStr) {
        answerCallbackQuery(callbackQuery.id, "❌ Error: Details not found.", token);
        return;
      }

      const tempQuick = JSON.parse(tempQuickStr);
      const accessToken = OAuth.getAccessTokenForUser(userId);
      const savedTx = Database.addTransaction(userId, tempQuick, accessToken);

      scriptProperties.deleteProperty(`TEMP_QUICK_${userId}`);

      const typeSign = savedTx.type === 'credit' ? '🟢' : '🔴';
      const typeLabel = savedTx.type === 'credit' ? 'Income' : 'Expense';

      const successText = `✅ <b>Quick Transaction Saved!</b>\n\n` +
        `📅 <b>Date:</b> ${savedTx.date}\n` +
        `➕ <b>Type:</b> ${typeSign} ${typeLabel}\n` +
        `💰 <b>Amount:</b> ${formatCurrency(savedTx.amount)}\n` +
        `📝 <b>Description:</b> ${savedTx.description}\n\n` +
        `💰 <b>Current Balance:</b> <code>${formatCurrency(savedTx.balanceAfter)}</code>`;

      answerCallbackQuery(callbackQuery.id, "Transaction saved!", token);
      updateTelegramMessage(chatId, callbackQuery.message.message_id, successText, token);
      return;
    }

    if (data === "quick_confirm_no") {
      scriptProperties.deleteProperty(`TEMP_QUICK_${userId}`);
      answerCallbackQuery(callbackQuery.id, "Cancelled", token);
      updateTelegramMessage(chatId, callbackQuery.message.message_id, "❌ Quick add transaction cancelled.", token);
      return;
    }

    answerCallbackQuery(callbackQuery.id, "Processing...", token);
    
    if (data.startsWith("clear_")) {
      handleClearCallback(userId, chatId, callbackQuery.message.message_id, data, token);
    } else if (data.startsWith("edit_")) {
      handleEditCallback(userId, chatId, callbackQuery.message.message_id, data, token);
    }
  } catch (error) {
    console.error("Error in handleCallbackQuery:", error);
    answerCallbackQuery(callbackQuery.id, "❌ Error", token);
    sendTelegramMessage(chatId, `❌ Callback Error: ${error.message}`, token);
  }
}

function updateTelegramMessage(chatId: number, messageId: number, text: string, token: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  const payload = {
    chat_id: chatId,
    message_id: messageId,
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

function startClearFlow(userId: number, chatId: number, token: string) {
  sendTelegramMessage(chatId, "⏳ <i>Clear flow implementation in progress...</i>", token);
}

function startEditFlow(userId: number, chatId: number, args: string, token: string) {
  sendTelegramMessage(chatId, "⏳ <i>Edit flow implementation in progress...</i>", token);
}

function handleSummaryCommand(userId: number, chatId: number, token: string) {
  sendTelegramMessage(chatId, "⏳ <i>Summary Aggregation implementation in progress...</i>", token);
}

function handleClearCallback(userId: number, chatId: number, messageId: number, data: string, token: string) {
  sendTelegramMessage(chatId, `Clear callback received: ${data}. Feature in progress.`, token);
}

function handleEditCallback(userId: number, chatId: number, messageId: number, data: string, token: string) {
  sendTelegramMessage(chatId, `Edit callback received: ${data}. Feature in progress.`, token);
}
