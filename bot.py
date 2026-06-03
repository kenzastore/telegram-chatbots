from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)
import config

START_TEXT = (
    "Welcome to the <b>Savings &amp; Financial Transaction Tracker</b> bot!\n\n"
    "I am here to help you record your daily credits and debits frictionlessly.\n\n"
    "Use /help to see all available commands."
)

HELP_TEXT = (
    "Here is the list of available commands:\n\n"
    "<b>/start</b> - Initialize the bot, display greeting\n"
    "<b>/help</b> - Show this guide\n"
    "<b>/add</b> - Record a new transaction (credit or debit)\n"
    "<b>/balance</b> - Retrieve current net balance\n"
    "<b>/view</b> - View the last 10 transaction history records\n"
    "<b>/summary</b> - View weekly/monthly financial summaries"
)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(START_TEXT)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(HELP_TEXT)

def main():
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.run_polling()

if __name__ == "__main__":
    main()
