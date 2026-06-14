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

const routerObj = require('../router.ts');
(global as any).sendTelegramMessage = routerObj.sendTelegramMessage;
(global as any).answerCallbackQuery = jest.fn();
(global as any).routeUpdate = routerObj.routeUpdate;
(global as any).updateTelegramMessage = jest.fn();

const { routeUpdate } = routerObj;

describe("Inline Keyboard Command Menu Tests", () => {
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

  it("should send command menu keyboard when /start command is run", () => {
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

    // Should call fetch twice: once for /start message, once for command menu
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const menuPayload = JSON.parse(fetchMock.mock.calls[1][0] ? fetchMock.mock.calls[1][1].payload : fetchMock.mock.calls[1][1].payload);
    expect(menuPayload.text).toContain("Command Menu");
    expect(menuPayload.reply_markup).toBeDefined();

    const keyboard = JSON.parse(menuPayload.reply_markup);
    expect(keyboard.inline_keyboard).toBeDefined();
    
    // Row 1: /quick
    expect(keyboard.inline_keyboard[0]).toHaveLength(1);
    expect(keyboard.inline_keyboard[0][0].text).toContain("/quick");
    expect(keyboard.inline_keyboard[0][0].callback_data).toBe("menu_/quick");

    // Row 2: /add, /balance, /view
    expect(keyboard.inline_keyboard[1]).toHaveLength(3);
    expect(keyboard.inline_keyboard[1][0].text).toContain("/add");
    expect(keyboard.inline_keyboard[1][1].text).toContain("/balance");
    expect(keyboard.inline_keyboard[1][2].text).toContain("/view");

    // Row 3: /clear, /edit, /summary
    expect(keyboard.inline_keyboard[2]).toHaveLength(3);
    expect(keyboard.inline_keyboard[2][0].text).toContain("/clear");
    expect(keyboard.inline_keyboard[2][1].text).toContain("/edit");
    expect(keyboard.inline_keyboard[2][2].text).toContain("/summary");

    // Row 4: /help
    expect(keyboard.inline_keyboard[3]).toHaveLength(1);
    expect(keyboard.inline_keyboard[3][0].text).toContain("/help");
  });

  it("should handle menu_ callbacks correctly", () => {
    const callbackUpdate = {
      update_id: 2,
      callback_query: {
        id: "cb_id",
        from: { id: userId, is_bot: false, first_name: "Karel" },
        message: {
          message_id: 101,
          chat: { id: chatId, type: "private" },
          text: "Menu"
        },
        data: "menu_/add"
      }
    };

    routeUpdate(callbackUpdate, token);

    // Should answer callback query and trigger add flow
    expect(global.answerCallbackQuery).toHaveBeenCalledWith("cb_id", "Command selected", token);
    
    // Verify that fetch is called (startAddFlow starts, which sends type selector message)
    expect(fetchMock).toHaveBeenCalled();
    const addPayload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(addPayload.text).toContain("Log Transaction");
  });

  it("should prompt user with instructions when menu_/quick is clicked", () => {
    const callbackUpdate = {
      update_id: 3,
      callback_query: {
        id: "cb_id",
        from: { id: userId, is_bot: false, first_name: "Karel" },
        message: {
          message_id: 101,
          chat: { id: chatId, type: "private" },
          text: "Menu"
        },
        data: "menu_/quick"
      }
    };

    routeUpdate(callbackUpdate, token);

    expect(global.answerCallbackQuery).toHaveBeenCalledWith("cb_id", "Command selected", token);
    expect(fetchMock).toHaveBeenCalled();
    const quickPromptPayload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(quickPromptPayload.text).toContain("/quick");
    expect(quickPromptPayload.text).toContain("sentence");
  });
});
