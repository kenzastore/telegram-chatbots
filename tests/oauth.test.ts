export {};

// Mock CacheService locally
class MockCache {
  private store: Record<string, string> = {};
  get(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  put(key: string, value: string, expirationInSeconds?: number): void {
    this.store[key] = String(value);
  }
  remove(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}
const scriptCache = new MockCache();
const MockCacheService = {
  getScriptCache: () => scriptCache,
};
(global as any).CacheService = MockCacheService;

// Ensure Config mock has getGoogleClientSecret
if (!(global as any).Config) {
  (global as any).Config = {};
}
(global as any).Config.getGoogleClientSecret = jest.fn().mockReturnValue("mock_client_secret");

// Save original global OAuth mock from setup.ts
const originalGlobalOAuth = (global as any).OAuth;

// Load real OAuth logic (after mocking CacheService)
const { OAuth } = require('../oauth.ts');


describe("OAuth Module Tests", () => {
  let fetchMock: jest.Mock;
  const userId = 12345;
  const state = "12345";
  const code = "mock_auth_code";

  afterAll(() => {
    (global as any).OAuth = originalGlobalOAuth;
  });

  beforeEach(() => {
    fetchMock = (global as any).UrlFetchApp.fetch;
    fetchMock.mockClear();
    (PropertiesService.getScriptProperties() as any).clear();
    scriptCache.clear();
  });

  describe("getAuthUrl", () => {
    it("should generate a correct Google OAuth2 authorization URL", () => {
      const url = OAuth.getAuthUrl(userId);
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("client_id=mock_client_id");
      expect(url).toContain("redirect_uri=" + encodeURIComponent("https://mock.redirect.uri"));
      expect(url).toContain("scope=" + encodeURIComponent("https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file"));
      expect(url).toContain("state=" + userId);
    });
  });

  describe("handleAuthRedirect", () => {
    it("should successfully exchange authorization code and store tokens", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          refresh_token: "mock_refresh_token",
          access_token: "mock_access_token",
          expires_in: 3600
        })
      });

      OAuth.handleAuthRedirect(code, state);

      // Verify fetch was called with correct parameters
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect(options.method).toBe("post");
      expect(options.payload).toContain("code=" + code);
      expect(options.payload).toContain("client_id=mock_client_id");
      expect(options.payload).toContain("client_secret=mock_client_secret");
      expect(options.payload).toContain("redirect_uri=" + encodeURIComponent("https://mock.redirect.uri"));
      expect(options.payload).toContain("grant_type=authorization_code");

      // Verify tokens are stored
      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBe("mock_refresh_token");
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBe("mock_access_token");
    });

    it("should handle scenario where no refresh token is returned by Google", () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          access_token: "mock_access_token",
          expires_in: 3600
        })
      });

      OAuth.handleAuthRedirect(code, state);

      expect(warnSpy).toHaveBeenCalledWith("No refresh token returned by Google.");
      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBeNull();
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBe("mock_access_token");
      warnSpy.mockRestore();
    });

    it("should throw an error when token exchange endpoint fails", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({
          error: "invalid_grant",
          error_description: "Bad authorization code"
        })
      });

      expect(() => {
        OAuth.handleAuthRedirect(code, state);
      }).toThrow("Token exchange failed: Bad authorization code");

      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBeNull();
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBeNull();
    });

    it("should throw an error when API response is successful but contains error field", () => {
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          error: "oauth_error",
          error_description: "Failed custom validation"
        })
      });

      expect(() => {
        OAuth.handleAuthRedirect(code, state);
      }).toThrow("Token exchange failed: Failed custom validation");
    });
  });

  describe("getAccessTokenForUser", () => {
    it("should return the cached access token if available", () => {
      CacheService.getScriptCache().put(`ACCESS_TOKEN_${userId}`, "cached_token");

      const token = OAuth.getAccessTokenForUser(userId);
      expect(token).toBe("cached_token");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should fetch a new access token using refresh token if not cached", () => {
      PropertiesService.getScriptProperties().setProperty(`REFRESH_TOKEN_${userId}`, "my_refresh_token");
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          access_token: "newly_refreshed_token",
          expires_in: 3600
        })
      });

      const token = OAuth.getAccessTokenForUser(userId);
      expect(token).toBe("newly_refreshed_token");
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBe("newly_refreshed_token");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect(options.payload).toContain("refresh_token=my_refresh_token");
      expect(options.payload).toContain("grant_type=refresh_token");
    });

    it("should throw an error if no refresh token exists for user", () => {
      expect(() => {
        OAuth.getAccessTokenForUser(userId);
      }).toThrow("User is not authenticated with Google.");
    });

    it("should delete stored tokens and throw a friendly error if token refresh API fails", () => {
      PropertiesService.getScriptProperties().setProperty(`REFRESH_TOKEN_${userId}`, "my_refresh_token");
      CacheService.getScriptCache().remove(`ACCESS_TOKEN_${userId}`);

      fetchMock.mockReturnValue({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked."
        })
      });

      expect(() => {
        OAuth.getAccessTokenForUser(userId);
      }).toThrow("Google OAuth session has expired or was revoked. Please log in again using /google_login.");

      // Check automatic token cleanup
      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBeNull();
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBeNull();
    });
  });

  describe("isUserAuthenticated", () => {
    it("should return true if refresh token exists", () => {
      PropertiesService.getScriptProperties().setProperty(`REFRESH_TOKEN_${userId}`, "some_token");
      expect(OAuth.isUserAuthenticated(userId)).toBe(true);
    });

    it("should return false if refresh token does not exist", () => {
      expect(OAuth.isUserAuthenticated(userId)).toBe(false);
    });
  });

  describe("logoutUser", () => {
    it("should delete tokens and spreadsheet ID from properties and cache", () => {
      PropertiesService.getScriptProperties().setProperty(`REFRESH_TOKEN_${userId}`, "token");
      PropertiesService.getScriptProperties().setProperty(`SPREADSHEET_ID_${userId}`, "ss_id");
      CacheService.getScriptCache().put(`ACCESS_TOKEN_${userId}`, "acc_token");

      OAuth.logoutUser(userId);

      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBeNull();
      expect(PropertiesService.getScriptProperties().getProperty(`SPREADSHEET_ID_${userId}`)).toBeNull();
      expect(CacheService.getScriptCache().get(`ACCESS_TOKEN_${userId}`)).toBeNull();
    });
  });

  describe("doGet Redirect Handler Tests", () => {
    let sendTelegramMessageMock: jest.Mock;

    beforeEach(() => {
      sendTelegramMessageMock = jest.fn();
      (global as any).sendTelegramMessage = sendTelegramMessageMock;
      (global as any).OAuth = OAuth; // ensure the real OAuth is used
    });

    afterEach(() => {
      (global as any).OAuth = originalGlobalOAuth;
    });

    it("should successfully handle Google redirect and send success message to Telegram", () => {
      // Mock bot token in properties
      PropertiesService.getScriptProperties().setProperty("TELEGRAM_BOT_TOKEN", "my_bot_token");

      // Mock token exchange call
      fetchMock.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          refresh_token: "ref_tok",
          access_token: "acc_tok",
          expires_in: 3600
        })
      });

      const e = {
        parameter: {
          code: "test_auth_code",
          state: String(userId)
        }
      } as any;

      const { doGet } = require('../main.ts');
      const output = doGet(e);

      // Verify OAuth redirect handler was called and tokens saved
      expect(PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`)).toBe("ref_tok");

      // Verify Telegram message was sent
      expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
      expect(sendTelegramMessageMock).toHaveBeenCalledWith(
        userId,
        expect.stringContaining("connected successfully"),
        "my_bot_token"
      );

      // Verify HTML output returned
      expect(output.getContent()).toContain("Authentication Successful!");
    });

    it("should return failure HTML if code or state parameter is missing", () => {
      const e = {
        parameter: {}
      } as any;

      const { doGet } = require('../main.ts');
      const output = doGet(e);

      expect(output.getContent()).toContain("Authentication Failed");
      expect(output.getContent()).toContain("Missing code or state parameters");
      expect(sendTelegramMessageMock).not.toHaveBeenCalled();
    });

    it("should return failure HTML if handleAuthRedirect throws an error", () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      PropertiesService.getScriptProperties().setProperty("TELEGRAM_BOT_TOKEN", "my_bot_token");

      // Mock token exchange failure
      fetchMock.mockReturnValue({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({
          error: "invalid_grant",
          error_description: "Expired code"
        })
      });

      const e = {
        parameter: {
          code: "expired_code",
          state: String(userId)
        }
      } as any;

      const { doGet } = require('../main.ts');
      const output = doGet(e);

      expect(output.getContent()).toContain("Authentication Failed");
      expect(output.getContent()).toContain("Expired code");
      expect(sendTelegramMessageMock).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

