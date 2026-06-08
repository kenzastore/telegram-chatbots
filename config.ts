const Config = {
  getTelegramBotToken(): string {
    const token = PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN Script Property.");
    }
    return token;
  },

  getGoogleClientId(): string {
    const clientId = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new Error("Missing GOOGLE_CLIENT_ID Script Property.");
    }
    return clientId;
  },

  getGoogleClientSecret(): string {
    const clientSecret = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_SECRET");
    if (!clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_SECRET Script Property.");
    }
    return clientSecret;
  },

  getRedirectUri(): string {
    const redirectUri = PropertiesService.getScriptProperties().getProperty("REDIRECT_URI");
    if (!redirectUri) {
      throw new Error("Missing REDIRECT_URI Script Property.");
    }
    return redirectUri;
  }
};
