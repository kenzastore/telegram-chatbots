class MockProperties {
  private store: Record<string, string> = {};
  
  getProperty(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  
  setProperty(key: string, value: string): void {
    this.store[key] = String(value);
  }
  
  deleteProperty(key: string): void {
    delete this.store[key];
  }
  
  getProperties(): Record<string, string> {
    return this.store;
  }
  
  setProperties(properties: Record<string, string>): void {
    this.store = { ...properties };
  }
  
  clear(): void {
    this.store = {};
  }
}

const scriptProperties = new MockProperties();
const userProperties = new MockProperties();

const MockPropertiesService = {
  getScriptProperties: () => scriptProperties,
  getUserProperties: () => userProperties,
};

const MockLock = {
  waitLock: jest.fn(),
  releaseLock: jest.fn(),
  hasLock: jest.fn().mockReturnValue(true),
};

const MockLockService = {
  getScriptLock: () => MockLock,
  getUserLock: () => MockLock,
};

const MockUrlFetchApp = {
  fetch: jest.fn(),
};

const MockHtmlService = {
  createHtmlOutput: jest.fn().mockImplementation((content: string) => ({
    getContent: () => content,
  })),
};

const MockSpreadsheet = {
  getSheetByName: jest.fn().mockImplementation(() => ({
    appendRow: jest.fn(),
  })),
  insertSheet: jest.fn().mockImplementation(() => ({
    appendRow: jest.fn(),
  })),
};

const MockSpreadsheetApp = {
  openById: jest.fn().mockReturnValue(MockSpreadsheet),
  getActiveSpreadsheet: jest.fn().mockReturnValue(MockSpreadsheet),
};

(global as any).PropertiesService = MockPropertiesService;
(global as any).LockService = MockLockService;
(global as any).UrlFetchApp = MockUrlFetchApp;
(global as any).HtmlService = MockHtmlService;
(global as any).SpreadsheetApp = MockSpreadsheetApp;
(global as any).Logger = {
  log: jest.fn((...args: any[]) => console.log(args.join(' '))),
};
