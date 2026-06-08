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

    // Search for existing file in Drive
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

    // Create new spreadsheet
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

    // Create sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}:batchUpdate`;
    const payload = {
      requests: [{
        addSheet: {
          properties: { title: sheetName }
        }
      }]
    };
    this.apiCall(url, 'post', payload, accessToken);

    // Append headers
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

      // Read current rows to determine next ID
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/'${sheetName}'!B:B`;
      const readResult = this.apiCall(readUrl, 'get', null, accessToken);      
      const lastRowIndex = readResult.values ? readResult.values.length : 1;
      const nextId = lastRowIndex <= 1 ? 1 : Number(readResult.values[lastRowIndex - 1][0]) + 1;

      // Get latest running balance
      const currentBalance = this.getUserBalance(userId, accessToken, ssId);
      const delta = tx.type === 'credit' ? tx.amount : -tx.amount;
      const newBalance = currentBalance + delta;

      // Append row
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
  }
};