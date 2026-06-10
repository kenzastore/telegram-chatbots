export {};
const { Database } = require('../database.ts');

describe("Database Module Tests", () => {
  let fetchMock: jest.Mock;
  const userId = 12345;
  const accessToken = "mock_access_token";

  beforeEach(() => {
    fetchMock = (global as any).UrlFetchApp.fetch;
    fetchMock.mockClear();
    (PropertiesService.getScriptProperties() as any).clear();
  });

  describe("getSpreadsheetId", () => {
    it("should return spreadsheet ID from cache if it exists", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "existing_ss_id");
      
      const ssId = Database.getSpreadsheetId(userId, accessToken);
      
      expect(ssId).toBe("existing_ss_id");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should search and return spreadsheet ID from Drive API if it exists on Drive", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          files: [{ id: "drive_ss_id" }]
        })
      });

      const ssId = Database.getSpreadsheetId(userId, accessToken);
      
      expect(ssId).toBe("drive_ss_id");
      expect(PropertiesService.getScriptProperties().getProperty(`SPREADSHEET_ID_${userId}`)).toBe("drive_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain("https://www.googleapis.com/drive/v3/files");
    });

    it("should create a new spreadsheet if it does not exist on Drive", () => {
      // 1. Search call returns empty files list
      // 2. Create call returns spreadsheet object with ID
      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ files: [] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ spreadsheetId: "new_created_ss_id" })
        });

      const ssId = Database.getSpreadsheetId(userId, accessToken);

      expect(ssId).toBe("new_created_ss_id");
      expect(PropertiesService.getScriptProperties().getProperty(`SPREADSHEET_ID_${userId}`)).toBe("new_created_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUserBalance", () => {
    it("should return 0 if there are no transaction sheets", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");
      // Mocks getSheetsList returning no sheets
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ sheets: [] })
      });

      const balance = Database.getUserBalance(userId, accessToken);
      expect(balance).toBe(0);
    });

    it("should retrieve the balance of the last transaction for the user", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");
      
      // 1. getSheetsList call
      // 2. get values call for YYYY-MM Transactions sheet
      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            sheets: [
              { properties: { title: "2026-06 Transactions" } },
              { properties: { title: "2026-05 Transactions" } }
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"],
              [String(userId), "2", "2026-06-02", "30", "Lunch", "debit", "70"],
              ["99999", "3", "2026-06-03", "40", "Snack", "debit", "60"] // other user
            ]
          })
        });

      const balance = Database.getUserBalance(userId, accessToken);
      expect(balance).toBe(70);
    });
  });

  describe("addTransaction", () => {
    it("should add a credit transaction and calculate balance correctly", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      // 1. getSheetsList (ensureMonthSheet)
      // 2. B:B ID check (read next ID)
      // 3. getSheetsList (getUserBalance)
      // 4. get values for balance calculation (getUserBalance)
      // 5. append transaction
      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["id"], ["1"]] }) // last ID is 1
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ updates: { updatedRows: 1 } })
        });

      const tx = {
        date: "2026-06-02",
        amount: 50,
        description: "Bonus",
        type: "credit" as const
      };

      const result = Database.addTransaction(userId, tx, accessToken);

      expect(result.id).toBe(2);
      expect(result.balanceAfter).toBe(150); // 100 + 50
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it("should add a debit transaction and calculate balance correctly", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["id"], ["1"]] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ updates: { updatedRows: 1 } })
        });

      const tx = {
        date: "2026-06-02",
        amount: 40,
        description: "Dinner",
        type: "debit" as const
      };

      const result = Database.addTransaction(userId, tx, accessToken);

      expect(result.id).toBe(2);
      expect(result.balanceAfter).toBe(60); // 100 - 40
    });
  });

  describe("deleteTransaction", () => {
    it("should return false if transaction is not found", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["user_id", "id"]] })
        });

      const deleted = Database.deleteTransaction(userId, 999, accessToken);
      expect(deleted).toBe(false);
    });

    it("should delete transaction row and trigger balance recalculation if found", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"],
              [String(userId), "2", "2026-06-02", "30", "Lunch", "debit", "70"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions", sheetId: 111 } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // delete API call
        })
        // Recalculation API calls: read first, then write range
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"] // row 2 was deleted
            ]
          })
        });

      const deleted = Database.deleteTransaction(userId, 2, accessToken);
      expect(deleted).toBe(true);
    });
  });

  describe("editTransaction", () => {
    it("should return null if transaction is not found", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["user_id", "id"]] })
        });

      const result = Database.editTransaction(userId, 999, { description: "Updated" }, accessToken);
      expect(result).toBeNull();
    });

    it("should update transaction in place if month does not change", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // update put
        })
        // Recalculation API calls: read first, then write range
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // write range
        })
        // Read back updated transaction
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [[String(userId), "1", "2026-06-01", "120", "Updated Salary", "credit", "120"]]
          })
        });

      const result = Database.editTransaction(userId, 1, { amount: 120, description: "Updated Salary" }, accessToken);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(120);
      expect(result.description).toBe("Updated Salary");
    });
  });

  describe("clearTransactionsRange", () => {
    it("should clear recent transaction successfully", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions", sheetId: 111 } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // delete API call
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["user_id", "id"]] }) // recalculateBalances read
        });

      const result = Database.clearTransactionsRange(userId, "recent", accessToken);
      expect(result).toContain("Recent transaction deleted successfully!");
    });

    it("should clear month transactions successfully", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      const currentMonthSheet = Database.getMonthSheetName("2026-06-10"); // matches dummy run month
      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: currentMonthSheet } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"],
              ["9999", "2", "2026-06-02", "50", "Other", "debit", "50"]
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // clear
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // put
        });

      const result = Database.clearTransactionsRange(userId, "month", accessToken);
      expect(result).toContain("Cleared 1 transaction(s)");
    });

    it("should clear week transactions successfully", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-09", "100", "Salary", "credit", "100"], // within last 7 days
              ["9999", "2", "2026-06-01", "50", "Other", "debit", "50"] // outside or other user
            ]
          })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // clear
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }) // write back
        });

      const result = Database.clearTransactionsRange(userId, "week", accessToken);
      expect(result).toContain("Cleared 1 transaction(s)");
    });
  });

  describe("editTransaction with month change", () => {
    it("should delete from old sheet and add to new sheet when month changes", () => {
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");

      fetchMock
        // 1. getSheetsList (editTransaction)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions" } }] })
        })
        // 2. get A:G (editTransaction find)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-06-01", "100", "Salary", "credit", "100"]
            ]
          })
        })
        // 3. getSheetIdByTitle (editTransaction delete old)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-06 Transactions", sheetId: 111 } }] })
        })
        // 4. delete old row
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true })
        })
        // 5. recalculateBalances read
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["user_id", "id"]] })
        })
        // 6. addTransaction (new sheet ensureMonthSheet getSheetsList)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-05 Transactions" } }] })
        })
        // 7. addTransaction (B:B read ID)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [["id"]] })
        })
        // 8. addTransaction (getUserBalance getSheetsList)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [{ properties: { title: "2026-05 Transactions" } }] })
        })
        // 9. addTransaction (getUserBalance get values)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ values: [] })
        })
        // 10. addTransaction (append row)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ updates: {} })
        });

      const result = Database.editTransaction(userId, 1, { date: "2026-05-15" }, accessToken);
      expect(result).not.toBeNull();
      expect(result.date).toBe("2026-05-15");
    });
  });
});
