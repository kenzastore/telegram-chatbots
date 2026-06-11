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
          getContentText: () => JSON.stringify({ ok: true })
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
          getContentText: () => JSON.stringify({ ok: true })
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

  describe("Export Spreadsheet Helpers", () => {
    it("should create a new export spreadsheet with Transactions and Summaries sheets", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ spreadsheetId: "export_ss_id" })
      });

      const ssId = Database.createExportSpreadsheet("Finance Bot Export - 12345", accessToken);

      expect(ssId).toBe("export_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe("https://sheets.googleapis.com/v4/spreadsheets");
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.properties.title).toBe("Finance Bot Export - 12345");
      expect(payload.sheets).toEqual([
        { properties: { title: "Transactions" } },
        { properties: { title: "Summaries" } }
      ]);
    });

    it("should set spreadsheet permissions to public reader", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ id: "perm_id" })
      });

      Database.setSpreadsheetPublicReader("export_ss_id", accessToken);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe("https://www.googleapis.com/drive/v3/files/export_ss_id/permissions");
      expect(callArgs[1].method).toBe("post");
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.role).toBe("reader");
      expect(payload.type).toBe("anyone");
    });
  });

  describe("getOrCreateExportSpreadsheet Lifecycle", () => {
    it("should return existing spreadsheet ID from script properties if it is valid", () => {
      PropertiesService.getScriptProperties().setProperty(`EXPORT_SS_ID_${userId}`, "cached_export_ss_id");

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ spreadsheetId: "cached_export_ss_id" })
      });

      const ssId = Database.getOrCreateExportSpreadsheet(userId, accessToken);

      expect(ssId).toBe("cached_export_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe("https://sheets.googleapis.com/v4/spreadsheets/cached_export_ss_id");
    });

    it("should create new spreadsheet if script properties is empty", () => {
      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ spreadsheetId: "new_export_ss_id" })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ id: "perm_id" })
        });

      const ssId = Database.getOrCreateExportSpreadsheet(userId, accessToken);

      expect(ssId).toBe("new_export_ss_id");
      expect(PropertiesService.getScriptProperties().getProperty(`EXPORT_SS_ID_${userId}`)).toBe("new_export_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe("https://sheets.googleapis.com/v4/spreadsheets");
      expect(fetchMock.mock.calls[1][0]).toBe("https://www.googleapis.com/drive/v3/files/new_export_ss_id/permissions");
    });

    it("should create new spreadsheet if cached ID is invalid/deleted", () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      PropertiesService.getScriptProperties().setProperty(`EXPORT_SS_ID_${userId}`, "deleted_ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 404,
          getContentText: () => "Not Found"
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ spreadsheetId: "recreated_export_ss_id" })
        })
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ id: "perm_id" })
        });

      const ssId = Database.getOrCreateExportSpreadsheet(userId, accessToken);

      expect(ssId).toBe("recreated_export_ss_id");
      expect(PropertiesService.getScriptProperties().getProperty(`EXPORT_SS_ID_${userId}`)).toBe("recreated_export_ss_id");
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0][0]).toBe("https://sheets.googleapis.com/v4/spreadsheets/deleted_ss_id");
      expect(fetchMock.mock.calls[1][0]).toBe("https://sheets.googleapis.com/v4/spreadsheets");
      consoleSpy.mockRestore();
    });
  });

  describe("exportDataToSpreadsheet full flow", () => {
    it("should fetch all user transactions, format them, write to export spreadsheet and return URL", () => {
      PropertiesService.getScriptProperties().setProperty(`EXPORT_SS_ID_${userId}`, "export_ss_id");
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "db_ss_id");

      fetchMock
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ spreadsheetId: "export_ss_id" })
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
              [String(userId), "1", "2026-06-10", "15000", "Snack", "debit", "85000"]
            ]
          })
        })
        // 4. Get current worksheets in the export spreadsheet (contains nothing)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ sheets: [] })
        })
        // 5. batchUpdate request response
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => "{}"
        })
        // 6-9. Clear and write mock responses
        .mockReturnValue({
          getResponseCode: () => 200,
          getContentText: () => "{}"
        });

      const url = Database.exportDataToSpreadsheet(userId, accessToken);

      expect(url).toBe("https://docs.google.com/spreadsheets/d/export_ss_id");

      // Verify batchUpdate
      const batchCall = fetchMock.mock.calls.find(call => call[0].endsWith("export_ss_id:batchUpdate"));
      expect(batchCall).toBeDefined();
      const batchPayload = JSON.parse(batchCall[1].payload);
      const addedSheetTitles = batchPayload.requests.map(req => req.addSheet.properties.title);
      expect(addedSheetTitles).toContain("2026-06 Transactions");
      expect(addedSheetTitles).toContain("2026-06 Summaries");

      // Verify clear operations
      const clearCalls = fetchMock.mock.calls.filter(call => call[0].includes("/values/") && call[0].endsWith(":clear"));
      expect(clearCalls.length).toBe(2);
      expect(clearCalls[0][0]).toContain("'2026-06 Transactions'!A:G:clear");
      expect(clearCalls[1][0]).toContain("'2026-06 Summaries'!A:C:clear");

      // Verify write payloads
      const writeCalls = fetchMock.mock.calls.filter(call => call[0].includes("/values/") && call[1] && call[1].method === "put");
      expect(writeCalls.length).toBe(2);

      const txWritePayload = JSON.parse(writeCalls[0][1].payload);
      expect(txWritePayload.values[0]).toEqual(["ID", "Date", "Amount", "Description", "Type", "Balance After"]);
      expect(txWritePayload.values[1]).toEqual([1, "2026-06-10", 15000, "Snack", "debit", 85000]);

      const sumWritePayload = JSON.parse(writeCalls[1][1].payload);
      expect(sumWritePayload.values[0][0]).toContain("Monthly Summary (2026-06)");
      expect(sumWritePayload.values[2]).toEqual(["Snack", "debit", 15000]);
    });

    it("should dynamically group transactions by month, verify worksheets, create missing ones, clear and write to them", () => {
      PropertiesService.getScriptProperties().setProperty(`EXPORT_SS_ID_${userId}`, "export_ss_id");
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "db_ss_id");

      fetchMock
        // 1. Database spreadsheet ID retrieval or mock check
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ spreadsheetId: "export_ss_id" })
        })
        // 2. Database sheets list (we have two month sheets in database)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            sheets: [
              { properties: { title: "2026-05 Transactions" } },
              { properties: { title: "2026-06 Transactions" } }
            ]
          })
        })
        // 3. Values from 2026-05 Transactions
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "1", "2026-05-25", "50000", "Salary", "credit", "50000"]
            ]
          })
        })
        // 4. Values from 2026-06 Transactions
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            values: [
              ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
              [String(userId), "2", "2026-06-10", "15000", "Snack", "debit", "35000"]
            ]
          })
        })
        // 5. Get current worksheets in the export spreadsheet (contains only '2026-06 Transactions')
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            sheets: [
              { properties: { title: "2026-06 Transactions" } }
            ]
          })
        })
        // 6. batchUpdate worksheets response (create missing: 2026-05 Transactions, 2026-05 Summaries, 2026-06 Summaries)
        .mockReturnValueOnce({
          getResponseCode: () => 200,
          getContentText: () => "{}"
        })
        // Clear and Write mock returns (8 calls: 4 sheets * (clear + write))
        .mockReturnValue({
          getResponseCode: () => 200,
          getContentText: () => "{}"
        });

      const url = Database.exportDataToSpreadsheet(userId, accessToken);
      expect(url).toBe("https://docs.google.com/spreadsheets/d/export_ss_id");

      // Let's verify batchUpdate was called with the missing worksheets
      const batchUpdateCall = fetchMock.mock.calls.find(call => call[0].endsWith("export_ss_id:batchUpdate"));
      expect(batchUpdateCall).toBeDefined();
      const batchPayload = JSON.parse(batchUpdateCall[1].payload);
      const addedSheetTitles = batchPayload.requests.map(req => req.addSheet.properties.title);
      expect(addedSheetTitles).toContain("2026-05 Transactions");
      expect(addedSheetTitles).toContain("2026-05 Summaries");
      expect(addedSheetTitles).toContain("2026-06 Summaries");
      expect(addedSheetTitles).not.toContain("2026-06 Transactions"); // Already exists

      // Let's verify clear and update operations for 2026-05 and 2026-06
      const clearedRanges = fetchMock.mock.calls
        .filter(call => call[0].includes("/values/") && call[0].endsWith(":clear"))
        .map(call => {
          const match = call[0].match(/\/values\/(.+?)\!/);
          return match ? decodeURIComponent(match[1]).replace(/'/g, "") : "";
        });
      expect(clearedRanges).toContain("2026-05 Transactions");
      expect(clearedRanges).toContain("2026-05 Summaries");
      expect(clearedRanges).toContain("2026-06 Transactions");
      expect(clearedRanges).toContain("2026-06 Summaries");
    });
  });
});
