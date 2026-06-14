export {};

// Define a stub for Database since it is globally referenced
const MockDatabase = {
  getUserBalance: jest.fn(),
  getSpreadsheetId: jest.fn(),
  getSheetsList: jest.fn(),
  apiCall: jest.fn(),
  addTransaction: jest.fn(),
  editTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  getMonthSheetName: jest.fn(),
  exportDataToSpreadsheet: jest.fn(),
  clearTransactionsRange: jest.fn(),
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
    MockDatabase.clearTransactionsRange.mockReset();

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
      expect(formatCurrency(1250.5)).toBe("Rp 1.250,50");
    });

    it("should format negative amount correctly", () => {
      expect(formatCurrency(-25000)).toBe("Rp -25.000,00");
      expect(formatCurrency(-500.25)).toBe("Rp -500,25");
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

    it("should handle /cancel command successfully even if unauthenticated", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(false);
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "STATE_ADD_AMOUNT");
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
          text: "/cancel"
        }
      };

      routeUpdate(update, token);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCallArgs = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(fetchCallArgs.text).toContain("Operation cancelled");
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
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

    it("should handle state ADD_DESC message by prompting for date", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_DESC");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000 }));

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleStatefulMessage(userId, chatId, "Bonus", "ADD_DESC", token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_DATE");
      const tempTx = JSON.parse(PropertiesService.getScriptProperties().getProperty(`TEMP_TX_${userId}`) || "{}");
      expect(tempTx.description).toBe("Bonus");
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle callback query add_date_today and save transaction", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_DATE");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000, description: "Bonus" }));

      MockDatabase.addTransaction.mockReturnValue({
        userId: userId,
        id: 5,
        date: "2026-06-14",
        amount: 100000,
        description: "Bonus",
        type: "credit",
        balanceAfter: 170000
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const callbackQuery = {
        id: "cb_id",
        from: { id: userId },
        message: { message_id: 200, chat: { id: chatId }, text: "Prompt" },
        data: "add_date_today"
      };

      handleCallbackQuery(callbackQuery, token);

      expect(MockDatabase.addTransaction).toHaveBeenCalled();
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
    });


    it("should handle callback query add_date_custom and prompt for manual entry", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_DATE");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000, description: "Bonus" }));

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      const callbackQuery = {
        id: "cb_id",
        from: { id: userId },
        message: { message_id: 200, chat: { id: chatId }, text: "Prompt" },
        data: "add_date_custom"
      };

      handleCallbackQuery(callbackQuery, token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_AWAITING_DATE");
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle state ADD_AWAITING_DATE with invalid date", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_AWAITING_DATE");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000, description: "Bonus" }));

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleStatefulMessage(userId, chatId, "invalid-date", "ADD_AWAITING_DATE", token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("ADD_AWAITING_DATE");
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle state ADD_AWAITING_DATE with valid date and save transaction", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "ADD_AWAITING_DATE");
      PropertiesService.getScriptProperties().setProperty(`TEMP_TX_${userId}`, JSON.stringify({ type: "credit", amount: 100000, description: "Bonus" }));

      MockDatabase.addTransaction.mockReturnValue({
        userId: userId,
        id: 5,
        date: "2026-06-12",
        amount: 100000,
        description: "Bonus",
        type: "credit",
        balanceAfter: 170000
      });

      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleStatefulMessage(userId, chatId, "2026-06-12", "ADD_AWAITING_DATE", token);

      expect(MockDatabase.addTransaction).toHaveBeenCalledWith(userId, expect.objectContaining({ date: "2026-06-12" }), expect.any(String));
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
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

    it("should handle successful parse in handleQuickCommand", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(true);
      (global as any).parseTransactionSentence.mockReturnValue({
        date: "2026-06-11",
        amount: 50000,
        description: "lunch",
        type: "debit"
      });
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleQuickCommand(userId, chatId, "spent 50k", token);
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_QUICK_${userId}`)).not.toBeNull();
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle quick_confirm_yes callback", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_QUICK_${userId}`, JSON.stringify({
        date: "2026-06-11",
        amount: 50000,
        description: "lunch",
        type: "debit"
      }));
      MockDatabase.addTransaction.mockReturnValue({
        date: "2026-06-11",
        amount: 50000,
        description: "lunch",
        type: "debit",
        balanceAfter: 100000
      });
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      handleCallbackQuery({
        id: "cb_quick_yes",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "quick_confirm_yes"
      }, token);

      expect(MockDatabase.addTransaction).toHaveBeenCalled();
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_QUICK_${userId}`)).toBeNull();
      expect(fetchMock).toHaveBeenCalled();
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      const payload = JSON.parse(lastCall[1].payload);
      expect(payload.text).toContain("Quick Transaction Saved!");
      expect(payload.text).toContain("Current Balance:");
    });

    it("should handle quick_confirm_yes when temp data is missing", () => {
      PropertiesService.getScriptProperties().deleteProperty(`TEMP_QUICK_${userId}`);
      handleCallbackQuery({
        id: "cb_quick_yes_missing",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "quick_confirm_yes"
      }, token);
      expect((global as any).answerCallbackQuery).toHaveBeenCalledWith("cb_quick_yes_missing", "❌ Error: Details not found.", token);
    });

    it("should handle quick_confirm_no callback", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_QUICK_${userId}`, JSON.stringify({}));
      handleCallbackQuery({
        id: "cb_quick_no",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "quick_confirm_no"
      }, token);
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_QUICK_${userId}`)).toBeNull();
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

    it("should clear user state upon /google_logout", () => {
      (global as any).OAuth.isUserAuthenticated.mockReturnValue(true);
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "STATE_ADD_AMOUNT");
      routeUpdate({
        update_id: 11,
        message: {
          message_id: 202,
          from: { id: userId, is_bot: false, first_name: "K" },
          chat: { id: chatId, type: "private" },
          text: "/google_logout"
        }
      }, token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
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

    it("should enforce strict multi-user separation of state and authentication", () => {
      const userA = 11111;
      const userB = 22222;

      // Mock isUserAuthenticated to check specific user IDs
      (global as any).OAuth.isUserAuthenticated.mockImplementation((id: number) => {
        if (id === userA) return true;
        if (id === userB) return false;
        return false;
      });

      // Set user properties for User A and User B
      PropertiesService.getUserProperties().setProperty(`STATE_${userA}`, "STATE_ADD_AMOUNT");
      PropertiesService.getUserProperties().setProperty(`STATE_${userB}`, "STATE_ADD_DESC");

      // Verify User B is blocked (unauthenticated gate)
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });

      routeUpdate({
        update_id: 101,
        message: {
          message_id: 1001,
          from: { id: userB, is_bot: false, first_name: "UserB" },
          chat: { id: chatId, type: "private" },
          text: "/balance"
        }
      }, token);

      // Verify User B gets "Google Login Required"
      let fetchCallArgs = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].payload);
      expect(fetchCallArgs.text).toContain("Google Login Required");

      // Verify User A can execute /balance successfully
      routeUpdate({
        update_id: 102,
        message: {
          message_id: 1002,
          from: { id: userA, is_bot: false, first_name: "UserA" },
          chat: { id: chatId, type: "private" },
          text: "/balance"
        }
      }, token);

      fetchCallArgs = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].payload);
      expect(fetchCallArgs.text).not.toContain("Google Login Required");

      // Verify /google_logout for User A does not delete User B's state
      routeUpdate({
        update_id: 103,
        message: {
          message_id: 1003,
          from: { id: userA, is_bot: false, first_name: "UserA" },
          chat: { id: chatId, type: "private" },
          text: "/google_logout"
        }
      }, token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userA}`)).toBeNull();
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userB}`)).toBe("STATE_ADD_DESC");
    });
  });

  describe("Interactive Edit Flow", () => {
    beforeEach(() => {
      MockDatabase.getSpreadsheetId.mockReturnValue("ss_id");
      MockDatabase.getSheetsList.mockReturnValue(["2026-06 Transactions"]);
      MockDatabase.apiCall.mockReturnValue({
        values: [
          ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
          [String(userId), "1", "2026-06-01", "100000", "Salary", "credit", "100000"]
        ]
      });
      fetchMock.mockReset();
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });
      (PropertiesService.getUserProperties() as any).clear();
      (PropertiesService.getScriptProperties() as any).clear();
    });

    it("should handle /edit command when args is empty and prompt for ID", () => {
      startEditFlow(userId, chatId, "", token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("EDIT_AWAITING_ID");
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Please send the transaction ID you want to edit:");
    });

    it("should handle state EDIT_AWAITING_ID with invalid numeric ID", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "EDIT_AWAITING_ID");
      handleStatefulMessage(userId, chatId, "invalid_id", "EDIT_AWAITING_ID", token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("EDIT_AWAITING_ID");
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Invalid ID");
    });

    it("should handle state EDIT_AWAITING_ID with valid numeric ID, clear state and start edit flow", () => {
      PropertiesService.getUserProperties().setProperty(`STATE_${userId}`, "EDIT_AWAITING_ID");
      MockDatabase.apiCall.mockReturnValue({
        values: [
          ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
          [String(userId), "5", "2026-06-10", "100000", "Bonus", "credit", "170000"]
        ]
      });

      handleStatefulMessage(userId, chatId, "5", "EDIT_AWAITING_ID", token);

      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Edit Transaction ID 5:");
    });

    it("should handle /edit command with non-numeric ID", () => {
      startEditFlow(userId, chatId, "abc", token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Usage:");
    });

    it("should handle /edit command when ID is not found", () => {
      MockDatabase.apiCall.mockReturnValue({ values: [] });
      startEditFlow(userId, chatId, "1", token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("not found");
    });

    it("should start edit flow when ID is found and prompt fields", () => {
      startEditFlow(userId, chatId, "1", token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Edit Transaction ID 1:");
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeDefined();
    });

    it("should handle date edit callback and message", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: 1, sheetName: "2026-06 Transactions" }));
      
      handleCallbackQuery({
        id: "cb_edit_date",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_field_date"
      }, token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("EDIT_AWAITING_DATE");

      const updatedTx = {
        userId: userId,
        id: 1,
        date: "2026-06-02",
        amount: 100000,
        description: "Salary",
        type: "credit",
        balanceAfter: 100000
      };
      MockDatabase.editTransaction = jest.fn().mockReturnValue(updatedTx);
      handleStatefulMessage(userId, chatId, "2026-06-02", "EDIT_AWAITING_DATE", token);
      
      expect(MockDatabase.editTransaction).toHaveBeenCalledWith(userId, 1, { date: "2026-06-02" }, "mock_access_token");
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeNull();
    });

    it("should handle amount edit callback and message", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: 1, sheetName: "2026-06 Transactions" }));
      
      handleCallbackQuery({
        id: "cb_edit_amount",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_field_amount"
      }, token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("EDIT_AWAITING_AMOUNT");

      const updatedTx = {
        userId: userId,
        id: 1,
        date: "2026-06-01",
        amount: 120000,
        description: "Salary",
        type: "credit",
        balanceAfter: 120000
      };
      MockDatabase.editTransaction = jest.fn().mockReturnValue(updatedTx);
      handleStatefulMessage(userId, chatId, "120.000", "EDIT_AWAITING_AMOUNT", token);
      
      expect(MockDatabase.editTransaction).toHaveBeenCalledWith(userId, 1, { amount: 120000 }, "mock_access_token");
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeNull();
    });

    it("should handle description edit callback and message", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: 1, sheetName: "2026-06 Transactions" }));
      
      handleCallbackQuery({
        id: "cb_edit_desc",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_field_desc"
      }, token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("EDIT_AWAITING_DESC");

      const updatedTx = {
        userId: userId,
        id: 1,
        date: "2026-06-01",
        amount: 100000,
        description: "Salary Bonus",
        type: "credit",
        balanceAfter: 100000
      };
      MockDatabase.editTransaction = jest.fn().mockReturnValue(updatedTx);
      handleStatefulMessage(userId, chatId, "Salary Bonus", "EDIT_AWAITING_DESC", token);
      
      expect(MockDatabase.editTransaction).toHaveBeenCalledWith(userId, 1, { description: "Salary Bonus" }, "mock_access_token");
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBeNull();
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeNull();
    });

    it("should handle type edit callback and type confirm callback", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: 1, sheetName: "2026-06 Transactions" }));
      
      handleCallbackQuery({
        id: "cb_edit_type",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_field_type"
      }, token);

      const updatedTx = {
        userId: userId,
        id: 1,
        date: "2026-06-01",
        amount: 100000,
        description: "Salary",
        type: "debit",
        balanceAfter: -100000
      };
      MockDatabase.editTransaction = jest.fn().mockReturnValue(updatedTx);

      handleCallbackQuery({
        id: "cb_edit_confirm_type",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_confirm_type_debit"
      }, token);

      expect(MockDatabase.editTransaction).toHaveBeenCalledWith(userId, 1, { type: "debit" }, "mock_access_token");
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeNull();
    });

    it("should support cancel callback query during edit flow", () => {
      PropertiesService.getScriptProperties().setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({ targetId: 1, sheetName: "2026-06 Transactions" }));
      
      handleCallbackQuery({
        id: "cb_edit_cancel",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1001, chat: { id: chatId }, text: "Prompt" },
        data: "edit_field_cancel"
      }, token);
      expect(PropertiesService.getScriptProperties().getProperty(`TEMP_EDIT_${userId}`)).toBeNull();
    });
  });

  describe("Interactive Clear Flow", () => {
    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      });
      (PropertiesService.getUserProperties() as any).clear();
      MockDatabase.getUserBalance.mockReturnValue(75000);
    });

    it("should start clear flow and show choice menu", () => {
      startClearFlow(userId, chatId, token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Clear Transactions Option Menu");
    });

    it("should support cancel option callback", () => {
      handleCallbackQuery({
        id: "cb_clear_cancel",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_opt_cancel"
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should prompt confirm for recent delete option callback", () => {
      handleCallbackQuery({
        id: "cb_clear_recent",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_opt_recent"
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should prompt confirm for week clear option callback", () => {
      handleCallbackQuery({
        id: "cb_clear_week",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_opt_week"
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should prompt confirm for month clear option callback", () => {
      handleCallbackQuery({
        id: "cb_clear_month",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_opt_month"
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should handle clear_opt_id and transition state", () => {
      handleCallbackQuery({
        id: "cb_clear_id",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_opt_id"
      }, token);
      expect(PropertiesService.getUserProperties().getProperty(`STATE_${userId}`)).toBe("CLEAR_AWAITING_ID");
    });

    it("should prompt confirmation on sending numeric ID", () => {
      handleStatefulMessage(userId, chatId, "15", "CLEAR_AWAITING_ID", token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Are you sure you want to permanently delete transaction ID 15?");
    });

    it("should execute recent clear confirm callback", () => {
      MockDatabase.clearTransactionsRange.mockReturnValue("Recalculation complete. 1 transaction deleted.");
      handleCallbackQuery({
        id: "cb_confirm_recent",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_confirm_recent"
      }, token);
      expect(MockDatabase.clearTransactionsRange).toHaveBeenCalledWith(userId, "recent", "mock_access_token");
    });

    it("should execute week clear confirm callback", () => {
      MockDatabase.clearTransactionsRange.mockReturnValue("Recalculation complete. 3 transactions deleted.");
      handleCallbackQuery({
        id: "cb_confirm_week",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_confirm_week"
      }, token);
      expect(MockDatabase.clearTransactionsRange).toHaveBeenCalledWith(userId, "week", "mock_access_token");
    });

    it("should execute month clear confirm callback", () => {
      MockDatabase.clearTransactionsRange.mockReturnValue("Recalculation complete. 5 transactions deleted.");
      handleCallbackQuery({
        id: "cb_confirm_month",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_confirm_month"
      }, token);
      expect(MockDatabase.clearTransactionsRange).toHaveBeenCalledWith(userId, "month", "mock_access_token");
    });

    it("should execute id clear confirm callback", () => {
      MockDatabase.deleteTransaction.mockReturnValue(true);
      handleCallbackQuery({
        id: "cb_confirm_id",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_confirm_id_15"
      }, token);
      expect(MockDatabase.deleteTransaction).toHaveBeenCalledWith(userId, 15, "mock_access_token");
    });

    it("should support cancel confirmation callback", () => {
      handleCallbackQuery({
        id: "cb_confirm_cancel",
        from: { id: userId, first_name: "K" },
        message: { message_id: 1002, chat: { id: chatId } },
        data: "clear_confirm_no"
      }, token);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("should reject non-numeric ID for CLEAR_AWAITING_ID state", () => {
      handleStatefulMessage(userId, chatId, "abc", "CLEAR_AWAITING_ID", token);
      expect(fetchMock).toHaveBeenCalled();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
      expect(payload.text).toContain("Invalid ID.");
    });
  });
});
