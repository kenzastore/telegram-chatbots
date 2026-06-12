const OAuth = {
  /**
   * Generates the Google OAuth2 Authorization URL.
   */
  getAuthUrl(userId: number): string {
    const clientId = Config.getGoogleClientId();
    const redirectUri = Config.getRedirectUri();
    
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file"
    ].join(" ");

    const params = [
      `client_id=${encodeURIComponent(clientId)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `response_type=code`,
      `scope=${encodeURIComponent(scopes)}`,
      `access_type=offline`,
      `prompt=consent`,
      `state=${userId}`
    ];

    return `${baseUrl}?${params.join("&")}`;
  },

  /**
   * Exchanges authorization code for tokens and saves the refresh token.
   */
  handleAuthRedirect(code: string, userIdStr: string): void {
    const clientId = Config.getGoogleClientId();
    const clientSecret = Config.getGoogleClientSecret();
    const redirectUri = Config.getRedirectUri();

    const url = "https://oauth2.googleapis.com/token";
    const payload = {
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload: Object.keys(payload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
        .join("&"),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200 || result.error) {
      throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
    }

    const refreshToken = result.refresh_token;
    if (!refreshToken) {
      console.warn("No refresh token returned by Google.");
    }

    // Save refresh token securely keyed by Telegram User ID
    const scriptProperties = PropertiesService.getScriptProperties();
    if (refreshToken) {
      scriptProperties.setProperty(`REFRESH_TOKEN_${userIdStr}`, refreshToken);
    }
    
    // Cache access token for 50 minutes (Google tokens last 1 hour)
    if (result.access_token) {
      const cache = CacheService.getScriptCache();
      cache.put(`ACCESS_TOKEN_${userIdStr}`, result.access_token, 3000);
    }
  },

  /**
   * Retrieves a valid access token for the given Telegram User ID,
   * refreshing it if not cached.
   */
  getAccessTokenForUser(userId: number): string {
    const cache = CacheService.getScriptCache();
    const cachedToken = cache.get(`ACCESS_TOKEN_${userId}`);
    if (cachedToken) {
      return cachedToken;
    }

    const scriptProperties = PropertiesService.getScriptProperties();
    const refreshToken = scriptProperties.getProperty(`REFRESH_TOKEN_${userId}`);
    if (!refreshToken) {
      throw new Error("User is not authenticated with Google.");
    }

    const clientId = Config.getGoogleClientId();
    const clientSecret = Config.getGoogleClientSecret();

    const url = "https://oauth2.googleapis.com/token";
    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload: Object.keys(payload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
        .join("&"),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200 || result.error) {
      throw new Error(`Failed to refresh access token: ${result.error_description || result.error}`);
    }

    const accessToken = result.access_token;
    cache.put(`ACCESS_TOKEN_${userId}`, accessToken, 3000);

    return accessToken;
  },

  /**
   * Checks if the user is authenticated.
   */
  isUserAuthenticated(userId: number): boolean {
    const refreshToken = PropertiesService.getScriptProperties().getProperty(`REFRESH_TOKEN_${userId}`);
    return !!refreshToken;
  },

  /**
   * Logs out the user by deleting their stored credentials.
   */
  logoutUser(userId: number): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty(`REFRESH_TOKEN_${userId}`);
    scriptProperties.deleteProperty(`SPREADSHEET_ID_${userId}`);

    const cache = CacheService.getScriptCache();
    cache.remove(`ACCESS_TOKEN_${userId}`);
  }
};

if (typeof module !== 'undefined') {
  module.exports = { OAuth };
}

