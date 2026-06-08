// Code.gs - Google Apps Script Telegram Bot webhook handler

// 1. Get the bot token from Script Properties (safest practice)
const TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
const TELEGRAM_API = 'https://api.telegram.org/bot' + TOKEN;

function doGet(e) {
  return ContentService.createTextOutput("Telegram Bot Webhook is active and running!");
}

/**
 * Handles incoming POST requests (webhook calls) from Telegram.
 */
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    
    // Check if the update contains a message
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // Simple echo response:
      sendMessage(chatId, "Received: " + text);
    }
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
  }
}

/**
 * Sends a message back to the Telegram chat.
 */
function sendMessage(chatId, text) {
  const url = TELEGRAM_API + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

/**
 * Helper to get the current webhook status directly from Apps Script.
 */
function getWebhookInfo() {
  const url = TELEGRAM_API + '/getWebhookInfo';
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}
