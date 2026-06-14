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
      if (userTxs.length >= 10) break;
    }

    if (userTxs.length === 0) {
      sendTelegramMessage(chatId, "📭 No transactions found for your user ID in the latest sheet.", token);
      return;
    }

    let messageText = `📊 <b>Recent History (Last ${userTxs.length} Transactions)</b>\nSheet: <code>${latestSheet}</code>\n\n`;
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
  
  const parts = absVal.toFixed(2).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  let formattedInteger = "";
  let count = 0;
  for (let i = integerPart.length - 1; i >= 0; i--) {
    formattedInteger = integerPart[i] + formattedInteger;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedInteger = "." + formattedInteger;
    }
  }
  
  return "Rp " + (isNegative ? "-" : "") + formattedInteger + "," + decimalPart;
}

/**
 * Quick Command and Interactive Add Flow Handlers
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
      scriptProperties.setProperty(tempTxKey, JSON.stringify(tempTx));

      userProperties.setProperty(stateKey, "ADD_DATE");

      const todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

      const keyboard = {
        inline_keyboard: [
          [
            { text: `📅 Today (${todayStr})`, callback_data: "add_date_today" }
          ],
          [
            { text: "✏️ Custom Date (YYYY-MM-DD)", callback_data: "add_date_custom" }
          ]
        ]
      };

      sendTelegramMessage(
        chatId,
        "📅 <b>Select Transaction Date:</b>\n\nChoose an option below or type/send a custom date in <code>YYYY-MM-DD</code> format:",
        token,
        keyboard
      );
      return;
    }

    if (activeState === "ADD_DATE") {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(text.trim())) {
        sendTelegramMessage(chatId, "⚠️ <b>Invalid date format.</b> Please send the date in <code>YYYY-MM-DD</code> format (e.g. <code>2026-06-14</code>) or choose one of the options:", token);
        return;
      }

      tempTx.date = text.trim();
      saveAndConfirmAddTransaction(userId, chatId, tempTx, token, stateKey, tempTxKey);
      return;
    }

    if (activeState === "ADD_AWAITING_DATE") {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(text.trim())) {
        sendTelegramMessage(chatId, "⚠️ <b>Invalid date format.</b> Please send the date in <code>YYYY-MM-DD</code> format (e.g. <code>2026-06-14</code>):", token);
        return;
      }

      tempTx.date = text.trim();
      saveAndConfirmAddTransaction(userId, chatId, tempTx, token, stateKey, tempTxKey);
      return;
    }

    // STATEFUL CLEAR ID ENTRY
    if (activeState === "CLEAR_AWAITING_ID") {
      const txId = Number(text.trim());
      if (isNaN(txId) || txId <= 0) {
        sendTelegramMessage(chatId, "⚠️ <b>Invalid ID.</b> Please send a positive numeric transaction ID (e.g., <code>12</code>):", token);
        return;
      }

      userProperties.deleteProperty(stateKey);

      const accessToken = OAuth.getAccessTokenForUser(userId);
      const ssId = Database.getSpreadsheetId(userId, accessToken);
      const sheets = Database.getSheetsList(ssId, accessToken);
      const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();
      
      let targetTx: any = null;

      // Search for transaction
      for (const sheetName of txSheets) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
        const data = Database.apiCall(url, 'get', null, accessToken);
        if (data.values && data.values.length > 1) {
          for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (Number(row[0]) === userId && Number(row[1]) === txId) {
              targetTx = {
                userId: Number(row[0]),
                id: Number(row[1]),
                date: row[2],
                amount: Number(row[3]),
                description: row[4],
                type: row[5],
                balanceAfter: Number(row[6])
              };
              break;
            }
          }
        }
        if (targetTx) break;
      }

      if (!targetTx) {
        sendTelegramMessage(chatId, `❌ Transaction ID <code>${txId}</code> not found.`, token);
        return;
      }

      const formattedAmount = formatCurrency(targetTx.amount);
      const typeLabel = targetTx.type === 'credit' ? '🟢 Income' : '🔴 Expense';

      const promptText = `⚠️ <b>Are you sure you want to permanently delete transaction ID ${txId}?</b>\n\n` +
        `📅 <b>Date:</b> ${targetTx.date}\n` +
        `➕ <b>Type:</b> ${typeLabel}\n` +
        `💰 <b>Amount:</b> ${formattedAmount}\n` +
        `📝 <b>Description:</b> ${targetTx.description}`;

      const keyboard = {
        inline_keyboard: [[
          { text: "✅ Yes, Delete", callback_data: `clear_confirm_id_${txId}` },
          { text: "❌ Cancel", callback_data: "clear_confirm_no" }
        ]]
      };

      sendTelegramMessage(chatId, promptText, token, keyboard);
      return;
    }

    // STATEFUL EDIT ID ENTRY
    if (activeState === "EDIT_AWAITING_ID") {
      const txId = Number(text.trim());
      if (isNaN(txId) || txId <= 0) {
        sendTelegramMessage(chatId, "⚠️ <b>Invalid ID.</b> Please send a positive numeric transaction ID (e.g., <code>12</code>):", token);
        return;
      }

      userProperties.deleteProperty(stateKey);
      const success = showEditMenu(userId, chatId, txId, token);
      if (!success) {
        sendTelegramMessage(chatId, `❌ Transaction ID <code>${txId}</code> not found.`, token);
      }
      return;
    }

    // STATEFUL EDIT ENTRY HANDLERS
    if (activeState.startsWith("EDIT_AWAITING_")) {
      const tempEditStr = scriptProperties.getProperty(`TEMP_EDIT_${userId}`);
      if (!tempEditStr) {
        sendTelegramMessage(chatId, "❌ Error: Temporary edit details not found. Please initiate /edit again.", token);
        userProperties.deleteProperty(stateKey);
        return;
      }

      const tempEdit = JSON.parse(tempEditStr);
      const txId = tempEdit.targetId;
      const field = activeState.replace("EDIT_AWAITING_", "") as 'DATE' | 'AMOUNT' | 'DESC';
      const updates: any = {};

      if (field === 'DATE') {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(text.trim())) {
          sendTelegramMessage(chatId, "⚠️ <b>Invalid date format.</b> Please send date in <code>YYYY-MM-DD</code> format (e.g. <code>2026-06-08</code>):", token);
          return;
        }
        updates.date = text.trim();
      }

      if (field === 'AMOUNT') {
        const cleanedText = text.replace(/rp\.?/gi, "").replace(/\./g, "").replace(/,/g, "").replace(/\s+/g, "").trim();
        const amount = parseFloat(cleanedText);
        if (isNaN(amount) || amount <= 0) {
          sendTelegramMessage(chatId, "⚠️ <b>Invalid amount.</b> Please enter a positive number:", token);
          return;
        }
        updates.amount = amount;
      }

      if (field === 'DESC') {
        if (!text.trim()) {
          sendTelegramMessage(chatId, "⚠️ Description cannot be empty:", token);
          return;
        }
        updates.description = text.trim();
      }

      const accessToken = OAuth.getAccessTokenForUser(userId);
      const result = Database.editTransaction(userId, txId, updates, accessToken);

      userProperties.deleteProperty(stateKey);
      scriptProperties.deleteProperty(`TEMP_EDIT_${userId}`);

      if (result) {
        const typeSign = result.type === 'credit' ? '🟢' : '🔴';
        const successText = `✅ <b>Transaction Updated Successfully!</b>\n\n` +
          `📅 <b>Date:</b> ${result.date}\n` +
          `➕ <b>Type:</b> ${typeSign} ${result.type}\n` +
          `💰 <b>Amount:</b> ${formatCurrency(result.amount)}\n` +
          `📝 <b>Description:</b> ${result.description}\n\n` +
          `💰 <b>New Running Balance:</b> <code>${formatCurrency(result.balanceAfter)}</code>`;
        sendTelegramMessage(chatId, successText, token);
      } else {
        sendTelegramMessage(chatId, `❌ Error: Transaction ID ${txId} was not found.`, token);
      }
      return;
    }
  } catch (error) {
    console.error("Error in handleStatefulMessage:", error);
    sendTelegramMessage(chatId, `❌ Error processing input: ${error.message}`, token);
    PropertiesService.getUserProperties().deleteProperty(`STATE_${userId}`);
    PropertiesService.getScriptProperties().deleteProperty(`TEMP_TX_${userId}`);
    PropertiesService.getScriptProperties().deleteProperty(`TEMP_EDIT_${userId}`);
  }
}

function saveAndConfirmAddTransaction(userId: number, chatId: number, tempTx: any, token: string, stateKey: string, tempTxKey: string, messageId?: number) {
  const userProperties = PropertiesService.getUserProperties();
  const scriptProperties = PropertiesService.getScriptProperties();

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

  if (messageId) {
    updateTelegramMessage(chatId, messageId, successText, token);
  } else {
    sendTelegramMessage(chatId, successText, token);
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

    if (data === "add_date_today") {
      const tempTxStr = scriptProperties.getProperty(tempTxKey);
      if (!tempTxStr) {
        answerCallbackQuery(callbackQuery.id, "❌ Error: Transaction details not found.", token);
        return;
      }
      const tempTx = JSON.parse(tempTxStr);
      tempTx.date = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

      answerCallbackQuery(callbackQuery.id, "Today selected", token);
      saveAndConfirmAddTransaction(userId, chatId, tempTx, token, stateKey, tempTxKey, callbackQuery.message.message_id);
      return;
    }


    if (data === "add_date_custom") {
      answerCallbackQuery(callbackQuery.id, "Custom date", token);
      userProperties.setProperty(stateKey, "ADD_AWAITING_DATE");
      updateTelegramMessage(chatId, callbackQuery.message.message_id, "👉 Please send the transaction date in <code>YYYY-MM-DD</code> format (e.g. <code>2026-06-14</code>):", token);
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

    // 4. CLEAR FLOW CALLBACKS
    if (data.startsWith("clear_")) {
      answerCallbackQuery(callbackQuery.id, "Processing clear choice...", token);
      handleClearCallback(userId, chatId, callbackQuery.message.message_id, data, token);
      return;
    }

    // 5. EDIT FLOW CALLBACKS
    if (data.startsWith("edit_")) {
      answerCallbackQuery(callbackQuery.id, "Processing edit choice...", token);
      handleEditCallback(userId, chatId, callbackQuery.message.message_id, data, token);
      return;
    }

    // 6. EXPORT FLOW CALLBACK
    if (data === "export_sheets") {
      try {
        answerCallbackQuery(callbackQuery.id, "Exporting data to Google Sheets...", token);
        updateTelegramMessage(chatId, callbackQuery.message.message_id, "⌛ <b>Exporting data to Google Sheets...</b>\n\nThis may take a moment. Please wait.", token);

        const accessToken = OAuth.getAccessTokenForUser(userId);
        const url = Database.exportDataToSpreadsheet(userId, accessToken);

        const successText = `📊 <b>Export Complete!</b>\n\nYour data has been successfully exported. You can view it here: <a href="${url}">Google Sheets Export</a>`;
        updateTelegramMessage(chatId, callbackQuery.message.message_id, successText, token);
      } catch (err) {
        console.error("Error exporting to Google Sheets:", err);
        updateTelegramMessage(chatId, callbackQuery.message.message_id, `❌ <b>Export Failed</b>\n\nError: ${err.message}`, token);
      }
      return;
    }

    answerCallbackQuery(callbackQuery.id, "Processing...", token);
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

/**
 * Clear Command and Callback Handlers
 */

function startClearFlow(userId: number, chatId: number, token: string) {
  try {
    const keyboard = {
      inline_keyboard: [
        [
          { text: "🕒 Delete Recent", callback_data: "clear_opt_recent" },
          { text: "🔢 Delete by ID", callback_data: "clear_opt_id" }
        ],
        [
          { text: "📅 Clear Last 7 Days", callback_data: "clear_opt_week" },
          { text: "🗓️ Clear This Month", callback_data: "clear_opt_month" }
        ],
        [
          { text: "❌ Cancel", callback_data: "clear_opt_cancel" }
        ]
      ]
    };

    sendTelegramMessage(chatId, "🗑️ <b>Clear Transactions Option Menu</b>\n\nChoose what range of transactions you wish to delete:", token, keyboard);
  } catch (error) {
    console.error("Error in startClearFlow:", error);
    sendTelegramMessage(chatId, `❌ Error: ${error.message}`, token);
  }
}

function handleClearCallback(userId: number, chatId: number, messageId: number, data: string, token: string) {
  try {
    const accessToken = OAuth.getAccessTokenForUser(userId);

    if (data === "clear_opt_cancel") {
      updateTelegramMessage(chatId, messageId, "❌ Clear operation cancelled.", token);
      return;
    }

    if (data === "clear_opt_recent") {
      const confirmText = "⚠️ <b>Are you sure you want to delete your most recent transaction?</b>";
      const keyboard = {
        inline_keyboard: [[
          { text: "✅ Yes, Delete", callback_data: "clear_confirm_recent" },
          { text: "❌ Cancel", callback_data: "clear_opt_cancel" }
        ]]
      };
      updateTelegramMessage(chatId, messageId, confirmText, token, keyboard);
      return;
    }

    if (data === "clear_opt_week") {
      const confirmText = "⚠️ <b>Are you sure you want to permanently delete all transactions from the last 7 days?</b>";
      const keyboard = {
        inline_keyboard: [[
          { text: "✅ Yes, Clear Week", callback_data: "clear_confirm_week" },
          { text: "❌ Cancel", callback_data: "clear_opt_cancel" }
        ]]
      };
      updateTelegramMessage(chatId, messageId, confirmText, token, keyboard);
      return;
    }

    if (data === "clear_opt_month") {
      const confirmText = "⚠️ <b>Are you sure you want to permanently delete all your transactions in this calendar month?</b>";
      const keyboard = {
        inline_keyboard: [[
          { text: "✅ Yes, Clear Month", callback_data: "clear_confirm_month" },
          { text: "❌ Cancel", callback_data: "clear_opt_cancel" }
        ]]
      };
      updateTelegramMessage(chatId, messageId, confirmText, token, keyboard);
      return;
    }

    if (data === "clear_opt_id") {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.setProperty(`STATE_${userId}`, "CLEAR_AWAITING_ID");
      updateTelegramMessage(chatId, messageId, "👉 Please type and send the Transaction ID you wish to delete:", token);
      return;
    }

    // CONFIRM ACTIONS
    if (data === "clear_confirm_recent") {
      const resultText = Database.clearTransactionsRange(userId, 'recent', accessToken);
      const newBalance = Database.getUserBalance(userId, accessToken);
      const balanceText = `\n\n📈 Current Net Balance: <b>${formatCurrency(newBalance)}</b>`;
      updateTelegramMessage(chatId, messageId, resultText + balanceText, token);
      return;
    }

    if (data === "clear_confirm_week") {
      const resultText = Database.clearTransactionsRange(userId, 'week', accessToken);
      const newBalance = Database.getUserBalance(userId, accessToken);
      const balanceText = `\n\n📈 Current Net Balance: <b>${formatCurrency(newBalance)}</b>`;
      updateTelegramMessage(chatId, messageId, resultText + balanceText, token);
      return;
    }

    if (data === "clear_confirm_month") {
      const resultText = Database.clearTransactionsRange(userId, 'month', accessToken);
      const newBalance = Database.getUserBalance(userId, accessToken);
      const balanceText = `\n\n📈 Current Net Balance: <b>${formatCurrency(newBalance)}</b>`;
      updateTelegramMessage(chatId, messageId, resultText + balanceText, token);
      return;
    }

    if (data.startsWith("clear_confirm_id_")) {
      const txId = Number(data.replace("clear_confirm_id_", ""));
      const deleted = Database.deleteTransaction(userId, txId, accessToken);
      if (deleted) {
        const newBalance = Database.getUserBalance(userId, accessToken);
        updateTelegramMessage(chatId, messageId, `✅ <b>Transaction ID ${txId} deleted successfully!</b>\nBalances recalculated chronologically.\n\n📈 Current Net Balance: <b>${formatCurrency(newBalance)}</b>`, token);
      } else {
        updateTelegramMessage(chatId, messageId, `❌ Error: Transaction ID ${txId} not found in database.`, token);
      }
      return;
    }

    if (data === "clear_confirm_no") {
      updateTelegramMessage(chatId, messageId, "❌ Clear operation cancelled.", token);
      return;
    }
  } catch (error) {
    console.error("Error in handleClearCallback:", error);
    sendTelegramMessage(chatId, `❌ Clear Error: ${error.message}`, token);
  }
}

/**
 * Edit Command and Callback Handlers
 */

function showEditMenu(userId: number, chatId: number, txId: number, token: string): boolean {
  const accessToken = OAuth.getAccessTokenForUser(userId);
  const ssId = Database.getSpreadsheetId(userId, accessToken);
  const sheets = Database.getSheetsList(ssId, accessToken);
  const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();
  
  let targetTx: any = null;
  let foundSheet = "";

  // Search for transaction
  for (const sheetName of txSheets) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
    const data = Database.apiCall(url, 'get', null, accessToken);
    if (data.values && data.values.length > 1) {
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        if (Number(row[0]) === userId && Number(row[1]) === txId) {
          targetTx = {
            userId: Number(row[0]),
            id: Number(row[1]),
            date: row[2],
            amount: Number(row[3]),
            description: row[4],
            type: row[5],
            balanceAfter: Number(row[6])
          };
          foundSheet = sheetName;
          break;
        }
      }
    }
    if (targetTx) break;
  }

  if (!targetTx) {
    return false;
  }

  // Cache target ID details
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: txId, sheetName: foundSheet }));

  const formattedAmount = formatCurrency(targetTx.amount);
  const typeLabel = targetTx.type === 'credit' ? '🟢 Income' : '🔴 Expense';

  const text = `✏️ <b>Edit Transaction ID ${txId}:</b>\n\n` +
    `📅 <b>Date:</b> ${targetTx.date}\n` +
    `➕ <b>Type:</b> ${typeLabel}\n` +
    `💰 <b>Amount:</b> ${formattedAmount}\n` +
    `📝 <b>Description:</b> ${targetTx.description}\n\n` +
    `Choose which field you want to edit:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📅 Date", callback_data: "edit_field_date" },
        { text: "➕ Type", callback_data: "edit_field_type" }
      ],
      [
        { text: "💰 Amount", callback_data: "edit_field_amount" },
        { text: "📝 Description", callback_data: "edit_field_desc" }
      ],
      [
        { text: "❌ Cancel", callback_data: "edit_field_cancel" }
      ]
    ]
  };

  sendTelegramMessage(chatId, text, token, keyboard);
  return true;
}

function startEditFlow(userId: number, chatId: number, args: string, token: string) {
  try {
    if (!args || !args.trim()) {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "EDIT_AWAITING_ID");
      sendTelegramMessage(chatId, "👉 Please send the transaction ID you want to edit:", token);
      return;
    }

    const txId = Number(args.trim());
    if (isNaN(txId) || txId <= 0) {
      sendTelegramMessage(chatId, "💡 <b>Usage:</b> <code>/edit &lt;transaction_id&gt;</code>\n\nExample: <code>/edit 5</code>", token);
      return;
    }

    const success = showEditMenu(userId, chatId, txId, token);
    if (!success) {
      sendTelegramMessage(chatId, `❌ Transaction ID <code>${txId}</code> not found.`, token);
    }
  } catch (error) {
    console.error("Error in startEditFlow:", error);
    sendTelegramMessage(chatId, `❌ Edit Error: ${error.message}`, token);
  }
}

function handleEditCallback(userId: number, chatId: number, messageId: number, data: string, token: string) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const scriptProperties = PropertiesService.getScriptProperties();
    const stateKey = `STATE_${userId}`;

    if (data === "edit_field_cancel") {
      scriptProperties.deleteProperty(`TEMP_EDIT_${userId}`);
      userProperties.deleteProperty(stateKey);
      updateTelegramMessage(chatId, messageId, "❌ Edit cancelled.", token);
      return;
    }

    const tempEditStr = scriptProperties.getProperty(`TEMP_EDIT_${userId}`);
    if (!tempEditStr) {
      updateTelegramMessage(chatId, messageId, "❌ Error: Edit details expired. Please run /edit again.", token);
      return;
    }
    const tempEdit = JSON.parse(tempEditStr);
    const txId = tempEdit.targetId;

    if (data === "edit_field_date") {
      userProperties.setProperty(stateKey, "EDIT_AWAITING_DATE");
      updateTelegramMessage(chatId, messageId, `📅 <b>Edit ID ${txId} Date</b>\n\n👉 Please type and send the new date (format: <code>YYYY-MM-DD</code>):`, token);
      return;
    }

    if (data === "edit_field_amount") {
      userProperties.setProperty(stateKey, "EDIT_AWAITING_AMOUNT");
      updateTelegramMessage(chatId, messageId, `💰 <b>Edit ID ${txId} Amount</b>\n\n👉 Please send the new numeric amount (e.g. <code>75000</code>):`, token);
      return;
    }

    if (data === "edit_field_desc") {
      userProperties.setProperty(stateKey, "EDIT_AWAITING_DESC");
      updateTelegramMessage(chatId, messageId, `📝 <b>Edit ID ${txId} Description</b>\n\n👉 Please enter the new description:`, token);
      return;
    }

    if (data === "edit_field_type") {
      const keyboard = {
        inline_keyboard: [[
          { text: "🔴 Expense (Debit)", callback_data: "edit_confirm_type_debit" },
          { text: "🟢 Income (Credit)", callback_data: "edit_confirm_type_credit" }
        ], [
          { text: "❌ Cancel", callback_data: "edit_field_cancel" }
        ]]
      };
      updateTelegramMessage(chatId, messageId, `➕ <b>Edit ID ${txId} Type</b>\n\nSelect the new transaction type:`, token, keyboard);
      return;
    }

    // TYPE SELECTIONS CONFIRM
    if (data.startsWith("edit_confirm_type_")) {
      const newType = data.replace("edit_confirm_type_", "") as 'debit' | 'credit';
      const accessToken = OAuth.getAccessTokenForUser(userId);
      const result = Database.editTransaction(userId, txId, { type: newType }, accessToken);

      userProperties.deleteProperty(stateKey);
      scriptProperties.deleteProperty(`TEMP_EDIT_${userId}`);

      if (result) {
        const typeSign = result.type === 'credit' ? '🟢' : '🔴';
        const text = `✅ <b>Transaction Type Updated!</b>\n\n` +
          `📅 <b>Date:</b> ${result.date}\n` +
          `➕ <b>Type:</b> ${typeSign} ${result.type}\n` +
          `💰 <b>Amount:</b> ${formatCurrency(result.amount)}\n` +
          `📝 <b>Description:</b> ${result.description}\n\n` +
          `💰 <b>New Running Balance:</b> <code>${formatCurrency(result.balanceAfter)}</code>`;
        updateTelegramMessage(chatId, messageId, text, token);
      } else {
        updateTelegramMessage(chatId, messageId, `❌ Error: Transaction ID ${txId} was not found.`, token);
      }
      return;
    }
  } catch (error) {
    console.error("Error in handleEditCallback:", error);
    sendTelegramMessage(chatId, `❌ Edit Callback Error: ${error.message}`, token);
  }
}

/**
 * Summary Command Handler
 */

function handleSummaryCommand(userId: number, chatId: number, token: string) {
  try {
    const accessToken = OAuth.getAccessTokenForUser(userId);
    const ssId = Database.getSpreadsheetId(userId, accessToken);
    const sheets = Database.getSheetsList(ssId, accessToken);
    
    // Aggregation Variables
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    let weekIncome = 0;
    let weekExpense = 0;

    const now = new Date();
    const currentMonthPrefix = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
    const currentMonthSheet = Database.getMonthSheetName(Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd"));
    const thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thresholdStr = Utilities.formatDate(thresholdDate, "Asia/Jakarta", "yyyy-MM-dd");
    const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const currentMonthStartStr = `${currentMonthPrefix}-01`;

    // 1. Process Current Month Sheet
    if (sheets.indexOf(currentMonthSheet) !== -1) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${currentMonthSheet}'!A:G`;
      const data = Database.apiCall(url, 'get', null, accessToken);
      if (data.values && data.values.length > 1) {
        for (let i = 1; i < data.values.length; i++) {
          const row = data.values[i];
          if (Number(row[0]) === userId) {
            const amount = Number(row[3]);
            const type = row[5];
            const date = row[2];

            // Monthly summary: 1st of current calendar month up to today
            if (date >= currentMonthStartStr && date <= todayStr) {
              if (type === 'credit') {
                thisMonthIncome += amount;
              } else {
                thisMonthExpense += amount;
              }
            }

            // Weekly summary: thresholdStr up to today
            if (date >= thresholdStr && date <= todayStr) {
              if (type === 'credit') {
                weekIncome += amount;
              } else {
                weekExpense += amount;
              }
            }
          }
        }
      }
    }

    // 2. Process Previous Month Sheet (if threshold date crosses month boundaries)
    const prevMonthSheet = Database.getMonthSheetName(Utilities.formatDate(thresholdDate, "Asia/Jakarta", "yyyy-MM-dd"));
    if (prevMonthSheet !== currentMonthSheet && sheets.indexOf(prevMonthSheet) !== -1) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${prevMonthSheet}'!A:G`;
      const data = Database.apiCall(url, 'get', null, accessToken);
      if (data.values && data.values.length > 1) {
        for (let i = 1; i < data.values.length; i++) {
          const row = data.values[i];
          if (Number(row[0]) === userId) {
            const amount = Number(row[3]);
            const type = row[5];
            const date = row[2];

            if (date >= thresholdStr && date <= todayStr) {
              if (type === 'credit') weekIncome += amount;
              else weekExpense += amount;
            }
          }
        }
      }
    }

    // Format results
    const monthNet = thisMonthIncome - thisMonthExpense;
    const weekNet = weekIncome - weekExpense;

    const summaryText = `📊 <b>Financial Summary Report</b>\n\n` +
      `📅 <b>This Calendar Month:</b>\n` +
      `🟢 Income: <code>${formatCurrency(thisMonthIncome)}</code>\n` +
      `🔴 Expenses: <code>${formatCurrency(thisMonthExpense)}</code>\n` +
      `⚖️ Net: <b>${formatCurrency(monthNet)}</b>\n\n` +
      `📅 <b>Last 7 Days (Week):</b>\n` +
      `🟢 Income: <code>${formatCurrency(weekIncome)}</code>\n` +
      `🔴 Expenses: <code>${formatCurrency(weekExpense)}</code>\n` +
      `⚖️ Net: <b>${formatCurrency(weekNet)}</b>`;

    const keyboard = {
      inline_keyboard: [[
        { text: "Export to Google Sheets 📊", callback_data: "export_sheets" }
      ]]
    };

    sendTelegramMessage(chatId, summaryText, token, keyboard);
  } catch (error) {
    console.error("Error in handleSummaryCommand:", error);
    sendTelegramMessage(chatId, `❌ Summary Error: ${error.message}`, token);
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    handleBalanceCommand,
    handleViewCommand,
    formatCurrency,
    handleQuickCommand,
    startAddFlow,
    handleStatefulMessage,
    handleCallbackQuery,
    startClearFlow,
    startEditFlow,
    handleSummaryCommand
  };
}

