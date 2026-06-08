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
  sendTelegramMessage(chatId, "⏳ <i>Quick add implementation in progress...</i>", token);
}

function startAddFlow(userId: number, chatId: number, token: string) {
  sendTelegramMessage(chatId, "⏳ <i>Interactive add flow implementation in progress...</i>", token);
}

function handleStatefulMessage(userId: number, chatId: number, text: string, activeState: string, token: string) {
  sendTelegramMessage(chatId, `Received stateful input: ${text} in state ${activeState}. Feature in progress.`, token);
}

function handleCallbackQuery(callbackQuery: any, token: string) {
  const chatId = callbackQuery.message.chat.id;
  sendTelegramMessage(chatId, `Callback received: ${callbackQuery.data}. Feature in progress.`, token);
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
