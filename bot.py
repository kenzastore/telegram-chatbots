from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)
import config
import db

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

# Conversation states
TYPE, AMOUNT, DESCRIPTION, DATE = range(4)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(START_TEXT)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(HELP_TEXT)

# Add Transaction Conversation Flow
async def add_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("➕ Credit (Income)", callback_data="credit"),
            InlineKeyboardButton("➖ Debit (Expense)", callback_data="debit"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(
        "Please select the <b>Transaction Type</b>:", reply_markup=reply_markup
    )
    return TYPE

async def add_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    tx_type = query.data
    context.user_data["type"] = tx_type
    
    await query.edit_message_text(
        text=f"Selected Type: <b>{tx_type.upper()}</b>\n\nPlease enter the transaction <b>Amount</b> (e.g. 50.00):",
        parse_mode="HTML"
    )
    return AMOUNT

async def add_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    try:
        amount = float(text)
        if amount <= 0:
            raise ValueError()
    except ValueError:
        await update.message.reply_text(
            "⚠️ Invalid amount. Please enter a positive number (e.g. 12.50):"
        )
        return AMOUNT
    
    context.user_data["amount"] = amount
    await update.message.reply_text(
        "Please enter a <b>Description/Category</b> (e.g. Groceries, Salary):",
        parse_mode="HTML"
    )
    return DESCRIPTION

async def add_description(update: Update, context: ContextTypes.DEFAULT_TYPE):
    description = update.message.text.strip()
    context.user_data["description"] = description
    
    keyboard = [
        [
            InlineKeyboardButton("📅 Today", callback_data="today"),
            InlineKeyboardButton("📆 Yesterday", callback_data="yesterday"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(
        "Please select the <b>Date</b> or type a manual date in YYYY-MM-DD format:",
        reply_markup=reply_markup
    )
    return DATE

async def add_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    date_str = ""
    query = update.callback_query
    
    if query:
        await query.answer()
        selection = query.data
        if selection == "today":
            date_str = datetime.now().strftime("%Y-%m-%d")
        elif selection == "yesterday":
            date_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        text = update.message.text.strip()
        try:
            datetime.strptime(text, "%Y-%m-%d")
            date_str = text
        except ValueError:
            await update.message.reply_text(
                "⚠️ Invalid date format. Please select a button or type the date in YYYY-MM-DD format:"
            )
            return DATE
            
    tx_type = context.user_data["type"]
    amount = context.user_data["amount"]
    description = context.user_data["description"]
    
    db.add_transaction(config.DATABASE_PATH, date_str, amount, description, tx_type)
    new_balance = db.get_balance(config.DATABASE_PATH)
    
    emoji = "💰" if tx_type == "credit" else "💸"
    sign = "+" if tx_type == "credit" else "-"
    msg = (
        f"✅ <b>Transaction Saved!</b>\n\n"
        f"📅 Date: {date_str}\n"
        f"🏷️ Description: {description}\n"
        f"💵 Amount: {sign} {emoji} ${amount:.2f}\n\n"
        f"📈 Current Balance: <b>${new_balance:.2f}</b>"
    )
    
    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML")
    else:
        await update.message.reply_html(msg)
        
    return ConversationHandler.END

async def add_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("❌ Transaction logging cancelled.")
    return ConversationHandler.END

async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    balance = db.get_balance(config.DATABASE_PATH)
    await update.message.reply_html(f"📈 Current Net Balance: <b>${balance:.2f}</b>")

async def view_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    history = db.get_history(config.DATABASE_PATH, limit=10)
    if not history:
        await update.message.reply_html("No transactions found.")
        return
        
    lines = ["<b>Recent Transaction History:</b>\n"]
    for tx in history:
        emoji = "💰" if tx["type"] == "credit" else "💸"
        sign = "+" if tx["type"] == "credit" else "-"
        lines.append(
            f"📅 {tx['date']} | {sign} {emoji} ${tx['amount']:.2f} | <i>{tx['description']}</i> (Bal: ${tx['balance_after']:.2f})"
        )
    await update.message.reply_html("\n".join(lines))

async def show_summary(update: Update, period: str):
    query = update.callback_query
    db_path = config.DATABASE_PATH
    sums = db.get_summaries(db_path, period)
    
    title = f"<b>{period.capitalize()} Summary</b>:\n"
    if not sums:
        msg = f"{title}\nNo transactions found for this period."
    else:
        lines = [title]
        for s in sums:
            emoji = "💰" if s["type"] == "credit" else "💸"
            sign = "+" if s["type"] == "credit" else "-"
            lines.append(f" - {s['description']} ({s['type']}): {sign} {emoji} ${s['total']:.2f}")
        msg = "\n".join(lines)
        
    keyboard = [
        [
            InlineKeyboardButton("Export to Google Sheets 📊", callback_data="export_sheets")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

async def summary_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args
    if args and args[0].lower() in ["weekly", "monthly"]:
        period = args[0].lower()
        await show_summary(update, period)
        return
        
    keyboard = [
        [
            InlineKeyboardButton("📊 Weekly Summary", callback_data="summary_weekly"),
            InlineKeyboardButton("📆 Monthly Summary", callback_data="summary_monthly"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(
        "Please select the <b>Summary Period</b>:", reply_markup=reply_markup
    )

async def summary_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    period = "weekly" if "weekly" in query.data else "monthly"
    await show_summary(update, period)

async def export_sheets_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Callback handler for exporting transaction logs and summaries to a Google Spreadsheet.
    Fetches the transactions and weekly/monthly summaries, invokes the sheets helper,
    and returns a public Google Spreadsheet link to the user.
    """
    query = update.callback_query
    await query.answer()
    
    if not config.GOOGLE_SERVICE_ACCOUNT_FILE:
        await query.edit_message_text(
            "❌ Google Sheets export is not configured (missing credentials file path)."
        )
        return
        
    await query.edit_message_text("⏳ Generating Google Sheet export, please wait...")
    
    try:
        import sheets
        transactions = db.get_all_transactions(config.DATABASE_PATH)
        weekly = db.get_summaries(config.DATABASE_PATH, "weekly")
        monthly = db.get_summaries(config.DATABASE_PATH, "monthly")
        
        sheet_url = sheets.export_data_to_sheets(
            config.GOOGLE_SERVICE_ACCOUNT_FILE,
            transactions,
            weekly,
            monthly
        )
        
        await query.edit_message_text(
            f"✅ Google Sheet generated successfully!\n\n"
            f"📊 <a href=\"{sheet_url}\">Open Exported Google Sheet</a>",
            parse_mode="HTML"
        )
    except Exception as e:
        import html
        await query.edit_message_text(
            f"❌ Failed to export data to Google Sheets.\n\n"
            f"Error details: <code>{html.escape(str(e))}</code>",
            parse_mode="HTML"
        )

def main():
    db.init_db(config.DATABASE_PATH)
    
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()
    
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("add", add_start)],
        states={
            TYPE: [CallbackQueryHandler(add_type)],
            AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_amount)],
            DESCRIPTION: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_description)],
            DATE: [
                CallbackQueryHandler(add_date),
                MessageHandler(filters.TEXT & ~filters.COMMAND, add_date),
            ],
        },
        fallbacks=[CommandHandler("cancel", add_cancel)],
        per_message=False,
    )
    
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("view", view_command))
    app.add_handler(CommandHandler("summary", summary_command))
    app.add_handler(CallbackQueryHandler(summary_callback, pattern="^summary_"))
    app.add_handler(CallbackQueryHandler(export_sheets_callback, pattern="^export_sheets$"))
    app.add_handler(conv_handler)
    app.run_polling()

if __name__ == "__main__":
    main()
