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
(global as any).getCommandMenuReplyMarkup = handlers.getCommandMenuReplyMarkup;

const routerObj = require('../router.ts');
(global as any).sendTelegramMessage = routerObj.sendTelegramMessage;
(global as any).answerCallbackQuery = jest.fn();
(global as any).routeUpdate = routerObj.routeUpdate;
(global as any).updateTelegramMessage = jest.fn();

const { routeUpdate } = routerObj;

describe("Custom Reply Keyboard Command Menu Tests", () => {
  let fetchMock: jest.Mock;
  const userId = 12345;
  const chatId = 67890;
  const token = "mock_telegram_token";

  beforeEach(() => {
    fetchMock = (global as any).UrlFetchApp.fetch;
    fetchMock.mockClear();
    (global as any).answerCallbackQuery.mockClear();
    (global as any).updateTelegramMessage.mockClear();
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

    fetchMock.mockReturnValue({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ ok: true })
    });
  });

  it("should send custom reply keyboard when /start command is run", () => {
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

    // Should call fetch once for /start message, with the reply keyboard markup
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Welcome to Savings Tracker Bot");
    expect(payload.reply_markup).toBeDefined();

    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
    expect(keyboard.resize_keyboard).toBe(true);
    expect(keyboard.one_time_keyboard).toBe(false);
    
    // Row 1: /quick
    expect(keyboard.keyboard[0]).toHaveLength(1);
    expect(keyboard.keyboard[0][0].text).toBe("/quick");

    // Row 2: /add, /balance, /view
    expect(keyboard.keyboard[1]).toHaveLength(3);
    expect(keyboard.keyboard[1][0].text).toBe("/add");
    expect(keyboard.keyboard[1][1].text).toBe("/balance");
    expect(keyboard.keyboard[1][2].text).toBe("/view");

    // Row 3: /clear, /edit, /summary
    expect(keyboard.keyboard[2]).toHaveLength(3);
    expect(keyboard.keyboard[2][0].text).toBe("/clear");
    expect(keyboard.keyboard[2][1].text).toBe("/edit");
    expect(keyboard.keyboard[2][2].text).toBe("/summary");

    // Row 4: /help
    expect(keyboard.keyboard[3]).toHaveLength(1);
    expect(keyboard.keyboard[3][0].text).toBe("/help");
  });

  it("should include reply keyboard in /balance response", () => {
    MockDatabase.getUserBalance.mockReturnValue(75000);
    const update = {
      update_id: 2,
      message: {
        message_id: 101,
        from: { id: userId, is_bot: false, first_name: "Karel" },
        chat: { id: chatId, type: "private" },
        text: "/balance"
      }
    };

    routeUpdate(update, token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Your Net Balance");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });

  it("should include reply keyboard in /help response", () => {
    const update = {
      update_id: 3,
      message: {
        message_id: 102,
        from: { id: userId, is_bot: false },
        chat: { id: chatId },
        text: "/help"
      }
    };

    routeUpdate(update, token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Savings Tracker Bot Help Guide");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });

  it("should include reply keyboard in /view response", () => {
    MockDatabase.apiCall.mockReturnValue({
      values: [
        ["user_id", "id", "date", "amount", "description", "type", "balance_after"],
        [userId.toString(), "1", "2026-06-14", "50000", "Lunch", "debit", "150000"]
      ]
    });
    const update = {
      update_id: 4,
      message: {
        message_id: 103,
        from: { id: userId, is_bot: false },
        chat: { id: chatId },
        text: "/view"
      }
    };

    routeUpdate(update, token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Recent History");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });

  it("should include reply keyboard in /quick empty args usage warning", () => {
    const update = {
      update_id: 5,
      message: {
        message_id: 104,
        from: { id: userId, is_bot: false },
        chat: { id: chatId },
        text: "/quick"
      }
    };

    routeUpdate(update, token);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Usage:");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });

  it("should include reply keyboard in /add final confirmation message when date is entered manually", () => {
    // Set state to ADD_DATE
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(`STATE_${userId}`, "ADD_DATE");
    
    // Set mock temp transaction
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(`TEMP_TX_${userId}`, JSON.stringify({
      type: "debit",
      amount: 12000,
      description: "Coffee"
    }));

    MockDatabase.addTransaction.mockReturnValue({
      date: "2026-06-14",
      amount: 12000,
      description: "Coffee",
      type: "debit",
      balanceAfter: 88000
    });

    const update = {
      update_id: 6,
      message: {
        message_id: 105,
        from: { id: userId, is_bot: false },
        chat: { id: chatId },
        text: "2026-06-14"
      }
    };

    routeUpdate(update, token);

    expect(MockDatabase.addTransaction).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Transaction Saved Successfully!");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });

  it("should include reply keyboard in /edit completion message when date is entered manually", () => {
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(`STATE_${userId}`, "EDIT_AWAITING_DATE");
    
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(`TEMP_EDIT_${userId}`, JSON.stringify({
      targetId: 45,
      sheetName: "2026-06 Transactions"
    }));

    MockDatabase.editTransaction.mockReturnValue({
      id: 45,
      date: "2026-06-12",
      amount: 25000,
      description: "Lunch",
      type: "debit",
      balanceAfter: 63000
    });

    const update = {
      update_id: 7,
      message: {
        message_id: 106,
        from: { id: userId, is_bot: false },
        chat: { id: chatId },
        text: "2026-06-12"
      }
    };

    routeUpdate(update, token);

    expect(MockDatabase.editTransaction).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toContain("Transaction Updated Successfully!");
    expect(payload.reply_markup).toBeDefined();
    const keyboard = JSON.parse(payload.reply_markup);
    expect(keyboard.keyboard).toBeDefined();
  });
});

