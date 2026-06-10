export {};

// Define a stub for Database since it is globally referenced
const MockDatabase = {
  getUserBalance: jest.fn(),
  getSpreadsheetId: jest.fn(),
  getSheetsList: jest.fn(),
  apiCall: jest.fn(),
  addTransaction: jest.fn(),
  getMonthSheetName: jest.fn(),
  exportDataToSpreadsheet: jest.fn(),
};
(global as any).Database = MockDatabase;

// Mock parseTransactionSentence
(global as any).parseTransactionSentence = jest.fn();

// Require modules and bind them to global scope
const handlers = require('../handlers.ts');
(global as any).handleBalanceCommand = handlers.handleBalanceCommand;
(global as any).handleViewCommand = handlers.handleViewCommand;
(global as any).formatCurrency = handlers.formatCurrency;
(global as any).handleQuickCommand = handlers.handleQuickCommand;
(global as any).startAddFlow = handlers.startAddFlow;
(global as any).handleStatefulMessage = handlers.handleStatefulMessage;
(global as any).handleCallbackQuery = handlers.handleCallbackQuery;
(global as any).startClearFlow = handlers.startClearFlow;
(global as any).startEditFlow = handlers.startEditFlow;
(global as any).handleSummaryCommand = handlers.handleSummaryCommand;

const routerObj = require('../router.ts');
(global as any).sendTelegramMessage = routerObj.sendTelegramMessage;
(global as any).answerCallbackQuery = jest.fn((callbackQueryId, text, token) => {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
    text: text
  };
  return (global as any).UrlFetchApp.fetch(url, {
    method: 'post',
    payload: JSON.stringify(payload),
    contentType: 'application/json',
    muteHttpExceptions: true
  });
});
(global as any).routeUpdate = routerObj.routeUpdate;
(global as any).updateTelegramMessage = jest.fn();

const { routeUpdate } = routerObj;
const { 
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
} = handlers;

describe("Chatbot Command Handlers & Router Tests", () => {
  let fetchMock: jest.Mock;
  const userId = 12345;
  const chatId = 67890;
  const token = "mock_telegram_token";

  beforeEach(() => {
    fetchMock = (global as any).UrlFetchApp.fetch;
    fetchMock.mockClear();
    (global as any).answerCallbackQuery.mockClear();
    MockDatabase.getUserBalance.mockReset();
    MockDatabase.getSpreadsheetId.mockReset();
    MockDatabase.getSheetsList.mockReset();
    MockDatabase.apiCall.mockReset();
    MockDatabase.addTransaction.mockReset();
    MockDatabase.getMonthSheetName.mockReset();
    MockDatabase.exportDataToSpreadsheet.mockReset();

    MockDatabase.getSheetsList.mockReturnValue(["2026-06 Transactions"]);
    MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
    MockDatabase.getMonthSheetName.mockReturnValue("2026-06 Transactions");
    MockDatabase.apiCall.mockReturnValue({ values: [["user_id", "id", "date", "amount", "description", "type", "balance_after"]] });

    (global as any).OAuth.isUserAuthenticated.mockReturnValue(true);
    (global as any).OAuth.getAccessTokenForUser.mockReturnValue("mock_access_token");
    
    (PropertiesService.getUserProperties() as any).clear();
  });

  describe("formatCurrency Helper", () => {
    it("should format positive amount to Indonesian Rupiah", () => {
      expect(formatCurrency(50000)).toBe("Rp 50.000,00");
      expect(formatCurrency(1500000)).toBe("Rp 1.500.000,00");
    });

    it("should format negative amount correctly", () => {
      expect(formatCurrency(-25000)).toBe("-Rp 25.000,00");
    });

    it("should format zero correctly", () => {
      expect(formatCurrency(0)).toBe("Rp 0,00");
    });
  });

  describe("Basic Commands (Public)", () => {
    it("should handle /start command successfully", () => {
      // Mock fetch response for telegram sendMessage
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const update = {
        update_id: 1,
        message: {
          message_id: 100,
          from: { id: userId, is_bot: false, first_name: "Karel" },
          chat: { id: chatId, type: "private" },
          text: "/start"
        }
      };

      routeUpdate(update, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.chat_id).toBe(chatId);
      expect(fetchCallArgs.text).toContain("Welcome to Savings Tracker Bot");
    });

    it("should handle /help command successfully", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const update = {
        update_id: 1,
        message: {
          message_id: 101,
          from: { id: userId, is_bot: false, first_name: "Karel" },
          chat: { id: chatId, type: "private" },
          text: "/help"
        }
      };

      routeUpdate(update, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.chat_id).toBe(chatId);
      expect(fetchCallArgs.text).toContain("Savings Tracker Bot Help Guide");
    });
  });

  describe("Authentication Gate", () => {
    it("should block non-public commands and prompt for login if unauthenticated", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(false);
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const update = {
        update_id: 2,
        message: {
          message_id: 102,
          from: { id: userId, is_bot: false, first_name: "Karel" },
          chat: { id: chatId, type: "private" },
          text: "/balance"
        }
      };

      routeUpdate(update, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("Google Login Required");
    });
  });

  describe("Command /balance", () => {
    it("should retrieve and format balance correctly", () => {
      MockDatabase.getUserBalance.mockReturnValue(75000);
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const update = {
        update_id: 3,
        message: {
          message_id: 103,
          from: { id: userId, is_bot: false, first_name: "Karel" },
          chat: { id: chatId, type: "private" },
          text: "/balance"
        }
      };

      routeUpdate(update, token);

      expect(MockDatabase.getUserBalance).toHaveBeenCalledWith(userId, "mock_access_token");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("Rp 75.000,00");
    });

    it("should report error if database fails to retrieve balance", () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      MockDatabase.getUserBalance.mockImplementation(() => {
        throw new Error("Sheets offline");
      });
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleBalanceCommand(userId, chatId, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("Error retrieving balance: Sheets offline");
      consoleSpy.mockRestore();
    });
  });

  describe("Command /view (History)", () => {
    it("should display transactions history successfully", () => {
      MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
      MockDatabase.getSheetsList.mockReturnValue(["2026-06 Transactions"]);
      MockDatabase.apiCall.mockReturnValue({
        values: [
          ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
          [String(userId), "1", "2026-06-01", "100000", "Salary", "credit", "100000"],
          [String(userId), "2", "2026-06-02", "30000", "Lunch", "debit", "70000"]
        ]
      });
      MockDatabase.getUserBalance.mockReturnValue(70000);

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const update = {
        update_id: 4,
        message: {
          message_id: 104,
          from: { id: userId, is_bot: false, first_name: "Karel" },
          chat: { id: chatId, type: "private" },
          text: "/view"
        }
      };

      routeUpdate(update, token);

      expect(MockDatabase.getSpreadsheetId).toHaveBeenCalled();
      expect(MockDatabase.getSheetsList).toHaveBeenCalled();
      expect(MockDatabase.apiCall).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("Recent History");
      expect(fetchCallArgs.text).toContain("Salary");
      expect(fetchCallArgs.text).toContain("Lunch");
      expect(fetchCallArgs.text).toContain("Rp 70.000,00");
    });

    it("should inform user if history is empty", () => {
      MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
      MockDatabase.getSheetsList.mockReturnValue([]);

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleViewCommand(userId, chatId, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("You don't have any logged transactions yet");
    });
  });

  describe("Command /summary and export_sheets callback", () => {
    it("should display weekly and monthly summary with an export inline button", () => {
      MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
      MockDatabase.getSheetsList.mockReturnValue(["2026-06 Transactions"]);
      MockDatabase.getMonthSheetName.mockReturnValue("2026-06 Transactions");
      
      MockDatabase.apiCall.mockReturnValue({
        values: [
          ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
          [String(userId), "1", "2026-06-05", "50000", "Food", "debit", "50000"],
          [String(userId), "2", "2026-06-06", "120000", "Salary", "credit", "70000"]
        ]
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleSummaryCommand(userId, chatId, token);

      expect(MockDatabase.getSpreadsheetId).toHaveBeenCalled();
      expect(MockDatabase.getSheetsList).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();

      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      const payload = JSON.parse(lastCall[1].payload);
      expect(payload.text).toContain("Financial Summary Report");
      expect(payload.reply_markup).toBeDefined();
      
      const keyboardObj = JSON.parse(payload.reply_markup);
      expect(keyboardObj.inline_keyboard[0][0].text).toBe("Export to Google Sheets 📊");
      expect(keyboardObj.inline_keyboard[0][0].callback_data).toBe("export_sheets");
    });

    it("should only include transactions from the 1st of the current month up to today in the monthly summary", () => {
      const now = new Date();
      const currentMonthPrefix = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
      const currentMonthSheet = `${currentMonthPrefix} Transactions`;
      
      const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
      const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = Utilities.formatDate(tomorrowDate, "Asia/Jakarta", "yyyy-MM-dd");
      
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthDate = new Date(firstOfMonth.getTime() - 24 * 60 * 60 * 1000);
      const prevMonthStr = Utilities.formatDate(prevMonthDate, "Asia/Jakarta", "yyyy-MM-dd");

      MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
      MockDatabase.getSheetsList.mockReturnValue([currentMonthSheet]);
      MockDatabase.getMonthSheetName.mockReturnValue(currentMonthSheet);
      
      MockDatabase.apiCall.mockReturnValue({
        values: [
          ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
          [String(userId), "1", todayStr, "50000", "Food", "debit", "50000"],
          [String(userId), "2", tomorrowStr, "100000", "Future", "debit", "150000"],
          [String(userId), "3", prevMonthStr, "200000", "Past", "debit", "350000"]
        ]
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleSummaryCommand(userId, chatId, token);

      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      const payload = JSON.parse(lastCall[1].payload);
      expect(payload.text).toContain("Expenses: <code>Rp 50.000,00</code>");
    });

    it("should handle export_sheets callback query successfully", () => {
      const callbackQuery = {
        id: "cb_id_export",
        from: { id: userId },
        message: { message_id: 300, chat: { id: chatId }, text: "Prompt" },
        data: "export_sheets"
      };

      MockDatabase.exportDataToSpreadsheet.mockReturnValue("https://docs.google.com/spreadsheets/d/export_ss_id");

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const answerCallbackSpy = (global as any).answerCallbackQuery;

      handleCallbackQuery(callbackQuery, token);

      expect(answerCallbackSpy).toHaveBeenCalledWith("cb_id_export", "Exporting data to Google Sheets...", token);
      expect(MockDatabase.exportDataToSpreadsheet).toHaveBeenCalledWith(userId, "mock_access_token");

      expect(fetchMock).toHaveBeenCalled();
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall[0]).toContain("editMessageText");
      const payloadObj = JSON.parse(lastCall[1].payload);
      expect(payloadObj.chat_id).toBe(chatId);
      expect(payloadObj.message_id).toBe(300);
      expect(payloadObj.text).toContain("Export Complete!");
      expect(payloadObj.text).toContain("https://docs.google.com/spreadsheets/d/export_ss_id");
    });

    it("should handle export_sheets callback query error gracefully", () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const callbackQuery = {
        id: "cb_id_export_fail",
        from: { id: userId },
        message: { message_id: 300, chat: { id: chatId }, text: "Prompt" },
        data: "export_sheets"
      };

      MockDatabase.exportDataToSpreadsheet.mockImplementation(() => {
        throw new Error("Google API quota exceeded");
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleCallbackQuery(callbackQuery, token);

      expect(fetchMock).toHaveBeenCalled();
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall[0]).toContain("editMessageText");
      const payloadObj = JSON.parse(lastCall[1].payload);
      expect(payloadObj.text).toContain("Export Failed");
      expect(payloadObj.text).toContain("Google API quota exceeded");
      consoleSpy.mockRestore();
    });
  });

  describe("Interactive Add Flow", () => {
    it("should start add flow correctly", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      startAddFlow(userId, chatId, token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_TYPE");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should handle add_type_ callback query correctly", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const callbackQuery = {
        id: "cb_id",
        from: { id: userId },
        message: { message_id: 200, chat: { id: chatId }, text: "Prompt" },
        data: "add_type_credit"
      };

      handleCallbackQuery(callbackQuery, token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_AMOUNT");
      const tempTx = JSON.parse(PropertiesService.getScriptProperties().getProperty(`TEMP_TX_${userId}`) || "{}");
      expect(tempTx.type).toBe("credit");
    });

    it("should handle state ADD_AMOUNT message correctly", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_AMOUNT");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit" }));

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleStatefulMessage(userId, chatId, "100000", "ADD_AMOUNT", token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_DESC");
      const tempTx = JSON.parse(PropertiesService.getScriptProperties().getProperty(`TEMP_TX_${userId}`) || "{}");
      expect(tempTx.amount).toBe(100000);
    });

    it("should handle state ADD_DESC message and save transaction", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_DESC");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000 }));

      MockDatabase.addTransaction.mockReturnValue({
        userId: userId,
        id: 5,
        date: "2026-06-10",
        amount: 100000,
        description: "Bonus",
        type: "credit",
        balanceAfter: 170000
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleStatefulMessage(userId, chatId, "Bonus", "ADD_DESC", token);

      expect(MockDatabase.addTransaction).toHaveBeenCalled();
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Quick Add Flow", () => {
    it("should prompt user to connect if unauthenticated for quick command", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(false);
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleQuickCommand(userId, chatId, "spent 50k", token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should display usage for empty arguments", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleQuickCommand(userId, chatId, "", token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const args = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(args.text).toContain("Usage:");
    });
  });

  describe("Additional Router Routing Tests", () => {
    beforeEach(() => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });
    });

    it("should route /google_login command", () => {
      routeUpdate({
        update_id: 10,
        message: {
          message_id: 201,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "/google_login"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should route /google_logout command", () => {
      routeUpdate({
        update_id: 11,
        message: {
          message_id: 202,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "/google_logout"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should route /debug command", () => {
      routeUpdate({
        update_id: 12,
        message: {
          message_id: 203,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "/debug"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should route switch commands like /add, /clear, /edit, /summary, /quick", () => {
      const commands = ["/add", "/clear", "/edit 1", "/summary", "/quick spent 100"];
      commands.forEach((cmd, idx) => {
        routeUpdate({
          update_id: 20 + idx,
          message: {
            message_id: 300 + idx,
            from: { id: userId, is_bot: false, first_name: "K" },
            chat: { id: chatId, type: "private" },
            text: cmd
          }
        }, token);
      });
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle unknown command", () => {
      routeUpdate({
        update_id: 50,
        message: {
          message_id: 400,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "/unknown_command"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle non-command messages when state is empty", () => {
      routeUpdate({
        update_id: 51,
        message: {
          message_id: 401,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "hello bot"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle non-command messages when user is not authenticated", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(false);
      routeUpdate({
        update_id: 52,
        message: {
          message_id: 402,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "hello bot"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should route callback queries", () => {
      routeUpdate({
        update_id: 53,
        callback_query: {
          id: "cb_id_1",
          from: { id: userId, first_name: "K" },
          message: { message_id: 500, chat: { id: chatId }, text: "Prompt" },
          data: "some_callback_data"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should block callback queries if user is unauthenticated", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(false);
      routeUpdate({
        update_id: 54,
        callback_query: {
          id: "cb_id_2",
          from: { id: userId, first_name: "K" },
          message: { message_id: 501, chat: { id: chatId }, text: "Prompt" },
          data: "some_callback_data"
        }
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
