interface Transaction {
  userId: number;
  id: number;
  date: string;
  amount: number;
  description: string;
  type: 'debit' | 'credit';
  balanceAfter: number;
}

const Database = {
  /**
   * Helper to make authorized Google API requests.
   */
  apiCall(url: string, method: 'get' | 'post' | 'put', payload: any, accessToken: string): any {
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    if (payload) {
      if (method === 'get') {
        const query = Object.keys(payload)
          .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(payload[k])}`)
          .join("&");
        url = `${url}?${query}`;
      } else {
        options.payload = JSON.stringify(payload);
      }
    }

    const response = UrlFetchApp.fetch(url, options);
    const text = response.getContentText();
    const status = response.getResponseCode();

    if (status < 200 || status >= 300) {
      throw new Error(`Google API call failed (${status}): ${text}`);
    }

    return text ? JSON.parse(text) : null;
  },

  /**
   * Gets the user's spreadsheet ID, creating it if it doesn't exist.
   */
  getSpreadsheetId(userId: number, accessToken: string): string {
    const key = `SPREADSHEET_ID_${userId}`;
    let ssId = PropertiesService.getScriptProperties().getProperty(key);
    if (ssId) return ssId;

    const searchUrl = "https://www.googleapis.com/drive/v3/files";
    const searchParams = {
      q: "name='Telegram Savings Bot' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id)"
    };

    const searchResult = this.apiCall(searchUrl, 'get', searchParams, accessToken);
    if (searchResult.files && searchResult.files.length > 0) {
      ssId = searchResult.files[0].id;
      PropertiesService.getScriptProperties().setProperty(key, ssId);
      return ssId;
    }

    const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const createPayload = {
      properties: {
        title: "Telegram Savings Bot"
      }
    };

    const newSheet = this.apiCall(createUrl, 'post', createPayload, accessToken);
    ssId = newSheet.spreadsheetId;
    PropertiesService.getScriptProperties().setProperty(key, ssId);
    return ssId;
  },

  /**
   * Returns sheet titles in the spreadsheet.
   */
  getSheetsList(ssId: string, accessToken: string): string[] {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}`;
    const result = this.apiCall(url, 'get', { fields: "sheets(properties(title))" }, accessToken);
    return result.sheets.map((s: any) => s.properties.title as string);
  },

  /**
   * Gets the sheet ID for a specific sheet title.
   */
  getSheetIdByTitle(ssId: string, title: string, accessToken: string): number {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}`;
    const result = this.apiCall(url, 'get', { fields: "sheets(properties(sheetId,title))" }, accessToken);
    const sheet = result.sheets.find((s: any) => s.properties.title === title);
    if (!sheet) {
      throw new Error(`Sheet "${title}" not found.`);
    }
    return sheet.properties.sheetId;
  },

  /**
   * Gets the sheet name for a specific date (format: YYYY-MM Transactions).
   */
  getMonthSheetName(dateStr: string): string {
    const parts = dateStr.split("-");
    return `${parts[0]}-${parts[1]} Transactions`;
  },

  /**
   * Ensures the worksheet for the current month exists and has headers.
   */
  ensureMonthSheet(ssId: string, sheetName: string, accessToken: string): void {
    const sheets = this.getSheetsList(ssId, accessToken);
    if (sheets.indexOf(sheetName) !== -1) return;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`;
    const payload = {
      requests: [{
        addSheet: {
          properties: { title: sheetName }
        }
      }]
    };
    this.apiCall(url, 'post', payload, accessToken);

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A1:G1`;
    const writePayload = {
      values: [["user_id", "id", "date", "amount", "description", "type", "balance_after"]]
    };
    const putUrl = `${writeUrl}?valueInputOption=USER_ENTERED`;
    this.apiCall(putUrl, 'put', writePayload, accessToken);
  },

  /**
   * Gets the running balance for a user.
   */
  getUserBalance(userId: number, accessToken: string, ssId?: string): number {
    if (!ssId) {
      ssId = this.getSpreadsheetId(userId, accessToken);
    }
    const sheets = this.getSheetsList(ssId, accessToken);
    const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();
    if (txSheets.length === 0) return 0;

    for (const sheetName of txSheets) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
      const data = this.apiCall(url, 'get', null, accessToken);
      if (data.values && data.values.length > 1) {
        for (let i = data.values.length - 1; i >= 1; i--) {
          if (Number(data.values[i][0]) === userId) {
            return Number(data.values[i][6]);
          }
        }
      }
    }
    return 0;
  },

  /**
   * Appends a new transaction.
   */
  addTransaction(userId: number, tx: Omit<Transaction, 'id' | 'balanceAfter' | 'userId'>, accessToken: string): Transaction {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);

      const ssId = this.getSpreadsheetId(userId, accessToken);
      const sheetName = this.getMonthSheetName(tx.date);
      this.ensureMonthSheet(ssId, sheetName, accessToken);

      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!B:B`;
      const readResult = this.apiCall(readUrl, 'get', null, accessToken);      
      const lastRowIndex = readResult.values ? readResult.values.length : 1;
      const nextId = lastRowIndex <= 1 ? 1 : Number(readResult.values[lastRowIndex - 1][0]) + 1;

      const currentBalance = this.getUserBalance(userId, accessToken, ssId);
      const delta = tx.type === 'credit' ? tx.amount : -tx.amount;
      const newBalance = currentBalance + delta;

      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G:append?valueInputOption=USER_ENTERED`;
      const appendPayload = {
        values: [[userId, nextId, tx.date, tx.amount, tx.description, tx.type, newBalance]]
      };
      this.apiCall(appendUrl, 'post', appendPayload, accessToken);

      return {
        userId: userId,
        id: nextId,
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        type: tx.type,
        balanceAfter: newBalance
      };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Deletes a transaction by ID.
   */
  deleteTransaction(userId: number, transactionId: number, accessToken: string): boolean {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);

      const ssId = this.getSpreadsheetId(userId, accessToken);
      const sheets = this.getSheetsList(ssId, accessToken);
      const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();

      for (const sheetName of txSheets) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
        const data = this.apiCall(url, 'get', null, accessToken);
        if (data.values && data.values.length > 1) {
          for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (Number(row[0]) === userId && Number(row[1]) === transactionId) {
              const sheetId = this.getSheetIdByTitle(ssId, sheetName, accessToken);
              
              const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`;
              const deletePayload = {
                requests: [{
                  deleteDimension: {
                    range: {
                      sheetId: sheetId,
                      dimension: "ROWS",
                      startIndex: i,
                      endIndex: i + 1
                    }
                  }
                }]
              };
              this.apiCall(deleteUrl, 'post', deletePayload, accessToken);

              this.recalculateBalances(ssId, sheetName, i, accessToken);
              return true;
            }
          }
        }
      }
      return false;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Modifies a transaction by ID.
   */
  editTransaction(userId: number, transactionId: number, updates: { date?: string, amount?: number, description?: string, type?: 'debit' | 'credit' }, accessToken: string): Transaction | null {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);

      const ssId = this.getSpreadsheetId(userId, accessToken);
      const sheets = this.getSheetsList(ssId, accessToken);
      const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();

      for (const sheetName of txSheets) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
        const data = this.apiCall(url, 'get', null, accessToken);
        if (data.values && data.values.length > 1) {
          for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (Number(row[0]) === userId && Number(row[1]) === transactionId) {
              const currentTx: Transaction = {
                userId: Number(row[0]),
                id: Number(row[1]),
                date: row[2],
                amount: Number(row[3]),
                description: row[4],
                type: row[5] as 'debit' | 'credit',
                balanceAfter: Number(row[6])
              };

              const newDate = updates.date || currentTx.date;
              const newMonthSheet = this.getMonthSheetName(newDate);

              if (newMonthSheet !== sheetName) {
                const sheetId = this.getSheetIdByTitle(ssId, sheetName, accessToken);
                const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`;
                const deletePayload = {
                  requests: [{
                    deleteDimension: {
                      range: { sheetId: sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 }
                    }
                  }]
                };
                this.apiCall(deleteUrl, 'post', deletePayload, accessToken);
                this.recalculateBalances(ssId, sheetName, i, accessToken);

                const insertTx = {
                  date: newDate,
                  amount: updates.amount !== undefined ? updates.amount : currentTx.amount,
                  description: updates.description || currentTx.description,
                  type: updates.type || currentTx.type
                };
                return this.addTransaction(userId, insertTx, accessToken);
              } else {
                const updatedTx = {
                  userId: userId,
                  id: transactionId,
                  date: newDate,
                  amount: updates.amount !== undefined ? updates.amount : currentTx.amount,
                  description: updates.description || currentTx.description,
                  type: updates.type || currentTx.type,
                  balanceAfter: currentTx.balanceAfter
                };

                const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A${i + 1}:F${i + 1}?valueInputOption=USER_ENTERED`;
                const updatePayload = {
                  values: [[userId, transactionId, updatedTx.date, updatedTx.amount, updatedTx.description, updatedTx.type]]
                };
                this.apiCall(updateUrl, 'put', updatePayload, accessToken);

                this.recalculateBalances(ssId, sheetName, i, accessToken);
                
                const readBackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A${i + 1}:G${i + 1}`;
                const readBack = this.apiCall(readBackUrl, 'get', null, accessToken);
                return {
                  userId: Number(readBack.values[0][0]),
                  id: Number(readBack.values[0][1]),
                  date: readBack.values[0][2],
                  amount: Number(readBack.values[0][3]),
                  description: readBack.values[0][4],
                  type: readBack.values[0][5] as 'debit' | 'credit',
                  balanceAfter: Number(readBack.values[0][6])
                };
              }
            }
          }
        }
      }
      return null;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Recalculates all balances in a sheet starting from startIndex.
   */
  recalculateBalances(ssId: string, sheetName: string, startIndex: number, accessToken: string): void {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
    const data = this.apiCall(url, 'get', null, accessToken);
    if (!data.values || data.values.length <= 1) return;

    const values = data.values;
    for (let j = startIndex; j < values.length; j++) {
      const prevBalance = j === 1 ? 0 : Number(values[j - 1][6]);
      const amount = Number(values[j][3]);
      const type = values[j][5];
      const delta = type === 'credit' ? amount : -amount;
      values[j][6] = prevBalance + delta;
    }

    const writeRange = `'${sheetName}'!G${startIndex + 1}:G${values.length}`;
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
    const writePayload = {
      values: values.slice(startIndex).map(r => [r[6]])
    };
    this.apiCall(writeUrl, 'put', writePayload, accessToken);
  },

  /**
   * High-performance batch clear of transactions within range: 'recent', 'week', 'month'.
   */
  clearTransactionsRange(userId: number, rangeType: 'recent' | 'week' | 'month', accessToken: string): string {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);

      const ssId = this.getSpreadsheetId(userId, accessToken);
      const sheets = this.getSheetsList(ssId, accessToken);
      const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort().reverse();

      if (txSheets.length === 0) return "No transactions found.";

      if (rangeType === 'recent') {
        // Find latest row for user and delete
        for (const sheetName of txSheets) {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
          const data = this.apiCall(url, 'get', null, accessToken);
          if (data.values && data.values.length > 1) {
            for (let i = data.values.length - 1; i >= 1; i--) {
              if (Number(data.values[i][0]) === userId) {
                const txId = Number(data.values[i][1]);
                const sheetId = this.getSheetIdByTitle(ssId, sheetName, accessToken);
                
                // Delete row
                const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`;
                const deletePayload = {
                  requests: [{
                    deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } }
                  }]
                };
                this.apiCall(deleteUrl, 'post', deletePayload, accessToken);
                this.recalculateBalances(ssId, sheetName, i, accessToken);

                return `✅ <b>Recent transaction deleted successfully!</b>\nID: <code>${txId}</code>\nDescription: <code>${data.values[i][4]}</code>`;
              }
            }
          }
        }
        return "No recent transactions found.";
      }

      if (rangeType === 'month') {
        // Delete all rows in current month sheet for this user
        const currentMonthSheet = this.getMonthSheetName(Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"));
        if (sheets.indexOf(currentMonthSheet) === -1) return "No transactions found for this month.";

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${currentMonthSheet}'!A:G`;
        const data = this.apiCall(url, 'get', null, accessToken);
        if (!data.values || data.values.length <= 1) return "No transactions found for this month.";

        const header = data.values[0];
        const remainingRows = data.values.slice(1).filter((r: any) => Number(r[0]) !== userId);
        const deletedCount = data.values.length - 1 - remainingRows.length;

        if (deletedCount === 0) return "No transactions found for your user ID this month.";

        // Recalculate balances for remaining rows
        const newValues = [header];
        for (let j = 0; j < remainingRows.length; j++) {
          const prevBalance = j === 0 ? 0 : Number(newValues[j][6]);
          const amount = Number(remainingRows[j][3]);
          const type = remainingRows[j][5];
          const delta = type === 'credit' ? amount : -amount;
          remainingRows[j][6] = prevBalance + delta;
          newValues.push(remainingRows[j]);
        }

        // Clear the sheet
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${currentMonthSheet}'!A:G:clear`;
        this.apiCall(clearUrl, 'post', null, accessToken);

        // Write back
        const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${currentMonthSheet}'!A1?valueInputOption=USER_ENTERED`;
        this.apiCall(writeUrl, 'put', { values: newValues }, accessToken);

        return `✅ <b>Cleared ${deletedCount} transaction(s)</b> from this calendar month (<code>${currentMonthSheet}</code>).`;
      }

      if (rangeType === 'week') {
        // Delete all rows in the last 7 days (requires checking current month and maybe previous month sheet)
        const now = new Date();
        const thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thresholdStr = Utilities.formatDate(thresholdDate, "Asia/Jakarta", "yyyy-MM-dd");

        let totalDeleted = 0;
        
        // Loop at most latest 2 sheets (covers last 7 days completely)
        for (let s = 0; s < Math.min(txSheets.length, 2); s++) {
          const sheetName = txSheets[s];
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
          const data = this.apiCall(url, 'get', null, accessToken);
          if (!data.values || data.values.length <= 1) continue;

          const header = data.values[0];
          const remainingRows = data.values.slice(1).filter((r: any) => {
            const isUser = Number(r[0]) === userId;
            const isWithinWeek = r[2] >= thresholdStr;
            return !(isUser && isWithinWeek);
          });
          const deletedCount = data.values.length - 1 - remainingRows.length;

          if (deletedCount > 0) {
            totalDeleted += deletedCount;
            // Write back remaining rows with balance recalculation
            const newValues = [header];
            for (let j = 0; j < remainingRows.length; j++) {
              const prevBalance = j === 0 ? 0 : Number(newValues[j][6]);
              const amount = Number(remainingRows[j][3]);
              const type = remainingRows[j][5];
              const delta = type === 'credit' ? amount : -amount;
              remainingRows[j][6] = prevBalance + delta;
              newValues.push(remainingRows[j]);
            }

            const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G:clear`;
            this.apiCall(clearUrl, 'post', null, accessToken);

            const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A1?valueInputOption=USER_ENTERED`;
            this.apiCall(writeUrl, 'put', { values: newValues }, accessToken);
          }
        }

        return `✅ <b>Cleared ${totalDeleted} transaction(s)</b> logged in the last 7 days.`;
      }

      return "Invalid clear range.";
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Creates a new Google Spreadsheet for export.
   */
  createExportSpreadsheet(title: string, accessToken: string): string {
    const url = "https://sheets.googleapis.com/v4/spreadsheets";
    const payload = {
      properties: {
        title: title
      },
      sheets: [
        { properties: { title: "Transactions" } },
        { properties: { title: "Summaries" } }
      ]
    };
    const result = this.apiCall(url, 'post', payload, accessToken);
    return result.spreadsheetId;
  },

  /**
   * Sets sharing permissions of a spreadsheet to reader for anyone.
   */
  setSpreadsheetPublicReader(fileId: string, accessToken: string): void {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    const payload = {
      role: "reader",
      type: "anyone"
    };
    this.apiCall(url, 'post', payload, accessToken);
  },

  /**
   * Returns valid export spreadsheet ID, creating it if it doesn't exist.
   */
  getOrCreateExportSpreadsheet(userId: number, accessToken: string): string {
    const key = `EXPORT_SS_ID_${userId}`;
    let ssId = PropertiesService.getScriptProperties().getProperty(key);

    if (ssId) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}`;
        this.apiCall(url, 'get', null, accessToken);
        return ssId;
      } catch (e) {
        console.warn(`Stored export spreadsheet ID ${ssId} is invalid/inaccessible. Recreating...`, e);
      }
    }

    const title = `Finance Bot Export - ${userId}`;
    ssId = this.createExportSpreadsheet(title, accessToken);
    this.setSpreadsheetPublicReader(ssId, accessToken);
    PropertiesService.getScriptProperties().setProperty(key, ssId);
    return ssId;
  },

  /**
   * Returns all transactions for the user from the database.
   */
  getAllUserTransactions(userId: number, accessToken: string): Transaction[] {
    const ssId = this.getSpreadsheetId(userId, accessToken);
    const sheets = this.getSheetsList(ssId, accessToken);
    const txSheets = sheets.filter(s => s.endsWith(" Transactions")).sort(); // ascending chronologically
    const allTxs: Transaction[] = [];

    for (const sheetName of txSheets) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!A:G`;
      const data = this.apiCall(url, 'get', null, accessToken);
      if (data.values && data.values.length > 1) {
        for (let i = 1; i < data.values.length; i++) {
          const row = data.values[i];
          if (Number(row[0]) === userId) {
            allTxs.push({
              userId: Number(row[0]),
              id: Number(row[1]),
              date: row[2],
              amount: Number(row[3]),
              description: row[4],
              type: row[5] as 'debit' | 'credit',
              balanceAfter: Number(row[6])
            });
          }
        }
      }
    }
    return allTxs;
  },

  /**
   * Main export runner: fetches all user transactions, groups summaries, writes to export sheet, and returns URL.
   */
  exportDataToSpreadsheet(userId: number, accessToken: string): string {
    const exportSsId = this.getOrCreateExportSpreadsheet(userId, accessToken);
    const allTxs = this.getAllUserTransactions(userId, accessToken);

    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // 1. Group transactions by calendar month
    const monthlyGroups: { [month: string]: Transaction[] } = {};
    for (const tx of allTxs) {
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(tx);
    }

    // Default to current month if no transactions exist
    if (Object.keys(monthlyGroups).length === 0) {
      monthlyGroups[currentMonthPrefix] = [];
    }

    // 2. Fetch existing worksheets in the export spreadsheet
    const ssUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}`;
    const ssData = this.apiCall(ssUrl, 'get', null, accessToken);
    const existingTitles: string[] = (ssData.sheets || []).map((s: any) => s.properties.title);

    // 3. Form requests to add missing sheets
    const requests: any[] = [];
    for (const monthKey of Object.keys(monthlyGroups)) {
      const txTab = `${monthKey} Transactions`;
      const sumTab = `${monthKey} Summaries`;
      if (existingTitles.indexOf(txTab) === -1) {
        requests.push({ addSheet: { properties: { title: txTab } } });
      }
      if (existingTitles.indexOf(sumTab) === -1) {
        requests.push({ addSheet: { properties: { title: sumTab } } });
      }
    }

    if (requests.length > 0) {
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}:batchUpdate`;
      this.apiCall(batchUrl, 'post', { requests }, accessToken);
    }

    // 4. Clear and write transactions and monthly summaries for each month
    for (const monthKey of Object.keys(monthlyGroups)) {
      const txList = monthlyGroups[monthKey];
      const txTab = `${monthKey} Transactions`;
      const sumTab = `${monthKey} Summaries`;

      // 4.1 Format transaction data
      const transactionRows: any[][] = [
        ["ID", "Date", "Amount", "Description", "Type", "Balance After"]
      ];
      for (const tx of txList) {
        transactionRows.push([
          tx.id,
          tx.date,
          tx.amount,
          tx.description,
          tx.type,
          tx.balanceAfter
        ]);
      }

      // 4.2 Format summary data
      const summaryRows: any[][] = [
        [`Monthly Summary (${monthKey})`],
        ["Description", "Type", "Total"]
      ];

      const sums: { [key: string]: number } = {};
      for (const tx of txList) {
        const key = `${tx.description}|||${tx.type}`;
        sums[key] = (sums[key] || 0) + tx.amount;
      }

      const sortedKeys = Object.keys(sums).sort();
      for (const key of sortedKeys) {
        const [desc, type] = key.split("|||");
        summaryRows.push([desc, type, sums[key]]);
      }

      // 4.3 Clear existing content in both target worksheets
      const clearTxUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}/values/'${txTab}'!A:G:clear`;
      this.apiCall(clearTxUrl, 'post', null, accessToken);

      const clearSumUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}/values/'${sumTab}'!A:C:clear`;
      this.apiCall(clearSumUrl, 'post', null, accessToken);

      // 4.4 Write values to worksheets
      const writeTxUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}/values/'${txTab}'!A1?valueInputOption=USER_ENTERED`;
      this.apiCall(writeTxUrl, 'put', { values: transactionRows }, accessToken);

      const writeSumUrl = `https://sheets.googleapis.com/v4/spreadsheets/${exportSsId}/values/'${sumTab}'!A1?valueInputOption=USER_ENTERED`;
      this.apiCall(writeSumUrl, 'put', { values: summaryRows }, accessToken);
    }

    return `https://docs.google.com/spreadsheets/d/${exportSsId}`;
  }
};

if (typeof module !== 'undefined') {
  module.exports = { Database };
}