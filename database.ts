```typescript
interface Transaction {
  userId: number;
  id: number;
  date: string;
  amount: number;
  description: string;
  type: 'debit' | 'credit';
  balanceAfter: number;
}

function getTransactionsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ssId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Transactions");
  if (!sheet) {
    sheet = ss.insertSheet("Transactions");
    sheet.appendRow(["user_id", "id", "date", "amount", "description", "type", "balance_after"]);
  }
  return sheet;
}

function addTransaction(tx: Omit<Transaction, 'id' | 'balanceAfter'>): Transaction {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10 second timeout lock

    const sheet = getTransactionsSheet();
    const lastRow = sheet.getLastRow();
    const nextId = lastRow <= 1 ? 1 : Number(sheet.getRange(lastRow, 2).getValue()) + 1;

    const currentBalance = getUserBalance(tx.userId);
    const delta = tx.type === 'credit' ? tx.amount : -tx.amount;
    const newBalance = currentBalance + delta;

    sheet.appendRow([
      tx.userId,
      nextId,
      tx.date,
      tx.amount,
      tx.description,
      tx.type,
      newBalance
    ]);

    return {
      ...tx,
      id: nextId,
      balanceAfter: newBalance
    };
  } finally {
    lock.releaseLock();
  }
}

function getUserBalance(userId: number): number {
  const sheet = getTransactionsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (Number(data[i][0]) === userId) {
      return Number(data[i][6]);
    }
  }
  return 0;
}
```