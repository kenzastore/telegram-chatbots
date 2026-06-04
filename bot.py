from datetime import datetime, timedelta
import re
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand, MenuButtonCommands, ReplyKeyboardRemove, ReplyKeyboardMarkup
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
    "<b>/quick &lt;sentence&gt;</b> - Quickly add a transaction via a single sentence\n"
    "<b>/balance</b> - Retrieve current net balance\n"
    "<b>/view</b> - View the last 10 transaction history records\n"
    "<b>/summary</b> - View weekly/monthly financial summaries\n"
    "<b>/edit</b> - Edit an existing transaction step-by-step\n"
    "<b>/clear</b> - Remove or clear transaction history"
)

# Conversation states
TYPE, AMOUNT, DESCRIPTION, DATE = range(4)
EDIT_ID, EDIT_DATE, EDIT_TYPE, EDIT_AMOUNT, EDIT_DESCRIPTION, EDIT_CONFIRM = range(4, 10)
CLEAR_CHOICE, CLEAR_ID_INPUT, CLEAR_MONTH_INPUT, CLEAR_CONFIRM = range(10, 14)

def format_rupiah(amount: float) -> str:
    """Formats a float as Indonesian Rupiah with decimal places.

    Args:
        amount: Float value to format.

    Returns:
        Formatted string (e.g. Rp 150.000,00).
    """
    formatted = f"{amount:,.2f}"
    placeholder = "___TEMP___"
    formatted = formatted.replace(",", placeholder)
    formatted = formatted.replace(".", ",")
    formatted = formatted.replace(placeholder, ".")
    return f"Rp {formatted}"
def get_commands_keyboard() -> ReplyKeyboardMarkup:
    """Returns a ReplyKeyboardMarkup featuring shortcuts for all main bot commands."""
    keyboard = [
        ["/quick"],
        ["/add", "/balance"],
        ["/view", "/summary"],
        ["/edit", "/clear"],
        ["/help"]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

def get_cancel_keyboard() -> ReplyKeyboardMarkup:
    """Returns a ReplyKeyboardMarkup containing a single /cancel shortcut button."""
    return ReplyKeyboardMarkup([["/cancel"]], resize_keyboard=True)

def parse_transaction_sentence(sentence: str, reference_date: datetime = None) -> dict:
    """Parses a natural language sentence into a structured transaction dictionary.

    Args:
        sentence: The text sentence to parse.
        reference_date: Optional reference datetime for relative dates (defaults to now).

    Returns:
        A dict with keys 'amount', 'type', 'date', 'description' or None if parsing fails.
    """
    if not sentence:
        return None

    if reference_date is None:
        reference_date = datetime.now()

    # Clean sentence
    s_clean = sentence.strip()
    if s_clean.startswith("/quick"):
        s_clean = s_clean[len("/quick"):].strip()

    # 1. Extract Amount
    # Supports formats like: 50000, 50.000, 1.5jt, 50k, 1m, Rp 50.000
    amount_pattern = re.compile(
        r'\b(?:rp\.?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(k|rb|jt|juta|m|miliar)?\b',
        re.IGNORECASE
    )
    match_amount = amount_pattern.search(s_clean)
    if not match_amount:
        return None

    amount_raw = match_amount.group(1)
    suffix = match_amount.group(2)
    
    try:
        # Helper to parse amount
        s = amount_raw.replace(" ", "")
        if suffix:
            s = s.replace(",", ".")
            val = float(s)
            suf = suffix.lower()
            if suf in ["k", "rb"]:
                amount_val = val * 1000
            elif suf in ["jt", "juta"]:
                amount_val = val * 1000000
            elif suf in ["m", "miliar"]:
                amount_val = val * 1000000000
            else:
                amount_val = val
        else:
            if len(s) >= 4 and s[-4] in [".", ","] and s[-3:].isdigit():
                s = s[:-4] + s[-3:]
                amount_val = float(s)
            else:
                s = s.replace(",", ".")
                amount_val = float(s)
    except ValueError:
        return None

    # 2. Extract Type
    debit_pattern = re.compile(r'\b(spent|pay|bayar|beli|debit|keluar|makan|shopping)\b', re.IGNORECASE)
    credit_pattern = re.compile(r'\b(receive|income|terima|dapat|gaji|credit|masuk)\b', re.IGNORECASE)

    has_debit = bool(debit_pattern.search(s_clean))
    has_credit = bool(credit_pattern.search(s_clean))

    if has_debit and has_credit:
        return None  # Ambiguous
    elif has_debit:
        tx_type = "debit"
    elif has_credit:
        tx_type = "credit"
    else:
        return None  # Missing type

    # 3. Extract Date
    yesterday_pattern = re.compile(r'\b(yesterday|kemarin)\b', re.IGNORECASE)
    today_pattern = re.compile(r'\b(today|hari\s+ini)\b', re.IGNORECASE)

    if yesterday_pattern.search(s_clean):
        tx_date = (reference_date - timedelta(days=1)).strftime("%Y-%m-%d")
    elif today_pattern.search(s_clean):
        tx_date = reference_date.strftime("%Y-%m-%d")
    else:
        tx_date = reference_date.strftime("%Y-%m-%d")

    # 4. Extract Description
    desc_clean = s_clean
    
    # Remove amount match
    desc_clean = desc_clean.replace(match_amount.group(0), "")
    
    # Remove type keyword match
    type_match = debit_pattern.search(desc_clean) or credit_pattern.search(desc_clean)
    if type_match:
        desc_clean = desc_clean.replace(type_match.group(0), "")
        
    # Remove date keyword match
    date_match = yesterday_pattern.search(desc_clean) or today_pattern.search(desc_clean)
    if date_match:
        desc_clean = desc_clean.replace(date_match.group(0), "")

    # Strip prepositions and clean extra whitespaces
    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
    
    # Strip leading/trailing prepositions repeatedly
    while True:
        prev = desc_clean
        desc_clean = re.sub(r'^(?:for|on|untuk|di|dari|at|bagi|pada|ke|about|buat|the|a|an|in|dari)\s+', '', desc_clean, flags=re.IGNORECASE)
        desc_clean = re.sub(r'\s+(?:for|on|untuk|di|dari|at|bagi|pada|ke|about|buat|the|a|an|in|dari)$', '', desc_clean, flags=re.IGNORECASE)
        desc_clean = desc_clean.strip()
        if desc_clean == prev:
            break

    if not desc_clean:
        return None

    return {
        "amount": amount_val,
        "type": tx_type,
        "date": tx_date,
        "description": desc_clean
    }

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(START_TEXT, reply_markup=get_commands_keyboard())

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(HELP_TEXT, reply_markup=get_commands_keyboard())

# Add Transaction Conversation Flow
async def add_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Starting transaction logger...", reply_markup=get_cancel_keyboard())
    
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
        f"💵 Amount: {sign} {emoji} {format_rupiah(amount)}\n\n"
        f"📈 Current Balance: <b>{format_rupiah(new_balance)}</b>"
    )
    
    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text="Menu restored:",
            reply_markup=get_commands_keyboard()
        )
    else:
        await update.message.reply_html(msg, reply_markup=get_commands_keyboard())
        
    return ConversationHandler.END

async def add_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("❌ Transaction logging cancelled.", reply_markup=get_commands_keyboard())
    return ConversationHandler.END

async def edit_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "📝 <b>Edit Transaction</b>\n\n"
        "Please enter the Transaction ID you wish to edit:",
        reply_markup=get_cancel_keyboard()
    )
    return EDIT_ID

async def edit_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        tx_id = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("⚠️ Invalid ID format. Please enter a numeric ID:")
        return EDIT_ID

    tx = db.get_transaction(config.DATABASE_PATH, tx_id)
    if not tx:
        await update.message.reply_text(f"❌ Transaction with ID {tx_id} not found. Please enter a valid ID:")
        return EDIT_ID

    context.user_data["edit_id"] = tx_id
    context.user_data["edit_tx"] = tx

    # Show inline options for date: "Keep current: <value>", "Today"
    keyboard = [
        [InlineKeyboardButton(f"Keep Current ({tx['date']})", callback_data="keep_current")],
        [InlineKeyboardButton("Today", callback_data="today")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(
        f"📅 <b>Step 1: Date</b>\n\n"
        f"Current: {tx['date']}\n\n"
        f"Enter new date (YYYY-MM-DD) or select an option:",
        reply_markup=reply_markup
    )
    return EDIT_DATE

async def edit_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tx = context.user_data["edit_tx"]
    date_str = None

    if query:
        await query.answer()
        if query.data == "keep_current":
            date_str = tx["date"]
        elif query.data == "today":
            date_str = datetime.now().strftime("%Y-%m-%d")
    else:
        text = update.message.text.strip()
        try:
            datetime.strptime(text, "%Y-%m-%d")
            date_str = text
        except ValueError:
            await update.message.reply_text(
                "⚠️ Invalid date format. Please use YYYY-MM-DD or select an option:"
            )
            return EDIT_DATE

    context.user_data["edit_date"] = date_str

    # Type buttons
    keyboard = [
        [InlineKeyboardButton(f"Keep Current ({tx['type'].capitalize()})", callback_data="keep_current")],
        [InlineKeyboardButton("Credit 💰", callback_data="credit"),
         InlineKeyboardButton("Debit 💸", callback_data="debit")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg = (
        f"🏷️ <b>Step 2: Transaction Type</b>\n\n"
        f"Current: {tx['type'].capitalize()}\n\n"
        f"Select the new type:"
    )

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

    return EDIT_TYPE

async def edit_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tx = context.user_data["edit_tx"]
    tx_type = None

    if query:
        await query.answer()
        if query.data == "keep_current":
            tx_type = tx["type"]
        else:
            tx_type = query.data
    else:
        await update.message.reply_text("Please use the buttons to select a transaction type.")
        return EDIT_TYPE

    context.user_data["edit_type"] = tx_type

    # Amount keyboard: "Keep current"
    keyboard = [
        [InlineKeyboardButton(f"Keep Current ({format_rupiah(tx['amount'])})", callback_data="keep_current")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg = (
        f"💵 <b>Step 3: Amount</b>\n\n"
        f"Current: {format_rupiah(tx['amount'])}\n\n"
        f"Type the new numeric amount or select an option:"
    )

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

    return EDIT_AMOUNT

async def edit_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tx = context.user_data["edit_tx"]
    amount = None

    if query:
        await query.answer()
        if query.data == "keep_current":
            amount = tx["amount"]
    else:
        try:
            amount = float(update.message.text.strip())
            if amount <= 0:
                raise ValueError()
        except ValueError:
            await update.message.reply_text("⚠️ Please enter a valid positive number for amount:")
            return EDIT_AMOUNT

    context.user_data["edit_amount"] = amount

    # Description keyboard
    keyboard = [
        [InlineKeyboardButton(f"Keep Current ({tx['description']})", callback_data="keep_current")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg = (
        f"✍️ <b>Step 4: Description</b>\n\n"
        f"Current: {tx['description']}\n\n"
        f"Type the new description or select an option:"
    )

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

    return EDIT_DESCRIPTION

async def edit_description(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tx = context.user_data["edit_tx"]
    description = None

    if query:
        await query.answer()
        if query.data == "keep_current":
            description = tx["description"]
    else:
        description = update.message.text.strip()

    context.user_data["edit_description"] = description

    # Build confirmation summary
    new_date = context.user_data["edit_date"]
    new_type = context.user_data["edit_type"]
    new_amount = context.user_data["edit_amount"]
    new_desc = context.user_data["edit_description"]

    old_emoji = "💰" if tx["type"] == "credit" else "💸"
    old_sign = "+" if tx["type"] == "credit" else "-"
    new_emoji = "💰" if new_type == "credit" else "💸"
    new_sign = "+" if new_type == "credit" else "-"

    keyboard = [
        [InlineKeyboardButton("Confirm Update ⚠️", callback_data="confirm"),
         InlineKeyboardButton("Cancel ❌", callback_data="cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg = (
        f"⚠️ <b>Confirm Changes</b>\n\n"
        f"<b>Original Transaction:</b>\n"
        f"📅 Date: {tx['date']}\n"
        f"🏷️ Type: {tx['type'].capitalize()} {old_emoji}\n"
        f"💵 Amount: {old_sign} {format_rupiah(tx['amount'])}\n"
        f"📝 Desc: {tx['description']}\n\n"
        f"<b>New Values:</b>\n"
        f"📅 Date: {new_date}\n"
        f"🏷️ Type: {new_type.capitalize()} {new_emoji}\n"
        f"💵 Amount: {new_sign} {format_rupiah(new_amount)}\n"
        f"📝 Desc: {new_desc}\n\n"
        f"Confirm the update?"
    )

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

    return EDIT_CONFIRM

async def edit_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return EDIT_CONFIRM

    await query.answer()
    if query.data == "confirm":
        tx_id = context.user_data["edit_id"]
        date = context.user_data["edit_date"]
        tx_type = context.user_data["edit_type"]
        amount = context.user_data["edit_amount"]
        description = context.user_data["edit_description"]

        db.update_transaction(config.DATABASE_PATH, tx_id, date, amount, description, tx_type)
        new_balance = db.get_balance(config.DATABASE_PATH)

        await query.edit_message_text(
            f"✅ <b>Transaction successfully updated!</b>\n\n"
            f"📈 Current Net Balance: <b>{format_rupiah(new_balance)}</b>",
            parse_mode="HTML"
        )
    else:
        await query.edit_message_text("❌ Update cancelled.")

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Menu restored:",
        reply_markup=get_commands_keyboard()
    )

    return ConversationHandler.END

async def edit_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("❌ Transaction editing cancelled.", reply_markup=get_commands_keyboard())
    return ConversationHandler.END

async def clear_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Starting clear transaction utility...", reply_markup=get_cancel_keyboard())

    keyboard = [
        [InlineKeyboardButton("Recent Transaction 🕒", callback_data="clear_recent")],
        [InlineKeyboardButton("By ID 🔑", callback_data="clear_id")],
        [InlineKeyboardButton("This Week 📅", callback_data="clear_week")],
        [InlineKeyboardButton("By Month 🗓️", callback_data="clear_month")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(
        "⚠️ <b>Clear Transactions</b>\n\n"
        "Please choose which transactions you would like to clear:",
        reply_markup=reply_markup
    )
    return CLEAR_CHOICE

async def clear_choice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return CLEAR_CHOICE

    await query.answer()
    choice = query.data.replace("clear_", "")
    context.user_data["clear_choice"] = choice
    context.user_data["clear_param"] = None

    if choice == "recent":
        # Ask for confirmation
        keyboard = [
            [InlineKeyboardButton("Confirm Delete ⚠️", callback_data="clear_confirm"),
             InlineKeyboardButton("Cancel ❌", callback_data="clear_cancel")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            "⚠️ <b>Confirm Deletion</b>\n\n"
            "Are you sure you want to clear the <b>most recent</b> transaction?",
            parse_mode="HTML",
            reply_markup=reply_markup
        )
        return CLEAR_CONFIRM

    elif choice == "id":
        await query.edit_message_text(
            "🔑 <b>Enter Transaction ID</b>\n\n"
            "Please type the numeric ID of the transaction to delete:"
        )
        return CLEAR_ID_INPUT

    elif choice == "week":
        keyboard = [
            [InlineKeyboardButton("Confirm Delete ⚠️", callback_data="clear_confirm"),
             InlineKeyboardButton("Cancel ❌", callback_data="clear_cancel")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            "⚠️ <b>Confirm Deletion</b>\n\n"
            "Are you sure you want to clear <b>all transactions from the last 7 days</b>?",
            parse_mode="HTML",
            reply_markup=reply_markup
        )
        return CLEAR_CONFIRM

    elif choice == "month":
        # Suggest current calendar month or last month, or custom YYYY-MM
        current_month = datetime.now().strftime("%Y-%m")
        last_month = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
        keyboard = [
            [InlineKeyboardButton(f"Current Month ({current_month})", callback_data=f"clear_m_{current_month}")],
            [InlineKeyboardButton(f"Last Month ({last_month})", callback_data=f"clear_m_{last_month}")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            "🗓️ <b>Choose Calendar Month</b>\n\n"
            "Select a month button below, or type custom month in <b>YYYY-MM</b> format:",
            parse_mode="HTML",
            reply_markup=reply_markup
        )
        return CLEAR_MONTH_INPUT

    return CLEAR_CHOICE

async def clear_id_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        tx_id = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("⚠️ Invalid ID format. Please enter a numeric ID:")
        return CLEAR_ID_INPUT

    tx = db.get_transaction(config.DATABASE_PATH, tx_id)
    if not tx:
        await update.message.reply_text(f"❌ Transaction with ID {tx_id} not found. Please enter a valid ID:")
        return CLEAR_ID_INPUT

    context.user_data["clear_choice"] = "id"
    context.user_data["clear_param"] = tx_id

    emoji = "💰" if tx["type"] == "credit" else "💸"
    sign = "+" if tx["type"] == "credit" else "-"

    keyboard = [
        [InlineKeyboardButton("Confirm Delete ⚠️", callback_data="clear_confirm"),
         InlineKeyboardButton("Cancel ❌", callback_data="clear_cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_html(
        f"⚠️ <b>Confirm Deletion</b>\n\n"
        f"Are you sure you want to clear this transaction?\n\n"
        f"📅 Date: {tx['date']}\n"
        f"🏷️ Type: {tx['type'].capitalize()} {emoji}\n"
        f"💵 Amount: {sign} {format_rupiah(tx['amount'])}\n"
        f"📝 Desc: {tx['description']}\n",
        reply_markup=reply_markup
    )
    return CLEAR_CONFIRM

async def clear_month_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    month_str = None

    if query:
        await query.answer()
        month_str = query.data.replace("clear_m_", "")
    else:
        text = update.message.text.strip()
        try:
            datetime.strptime(text, "%Y-%m")
            month_str = text
        except ValueError:
            await update.message.reply_text(
                "⚠️ Invalid month format. Please type custom month in YYYY-MM format:"
            )
            return CLEAR_MONTH_INPUT

    context.user_data["clear_choice"] = "month"
    context.user_data["clear_param"] = month_str

    keyboard = [
        [InlineKeyboardButton("Confirm Delete ⚠️", callback_data="clear_confirm"),
         InlineKeyboardButton("Cancel ❌", callback_data="clear_cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg = (
        f"⚠️ <b>Confirm Deletion</b>\n\n"
        f"Are you sure you want to clear <b>all transactions for month {month_str}</b>?"
    )

    if query:
        await query.edit_message_text(text=msg, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_html(msg, reply_markup=reply_markup)

    return CLEAR_CONFIRM

async def clear_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return CLEAR_CONFIRM

    await query.answer()
    if query.data == "clear_confirm":
        choice = context.user_data["clear_choice"]
        param = context.user_data["clear_param"]

        deleted_count = db.clear_transactions(config.DATABASE_PATH, choice, param)
        new_balance = db.get_balance(config.DATABASE_PATH)

        await query.edit_message_text(
            f"✅ <b>Successfully deleted {deleted_count} transaction(s)!</b>\n\n"
            f"📈 Current Net Balance: <b>{format_rupiah(new_balance)}</b>",
            parse_mode="HTML"
        )
    else:
        await query.edit_message_text("❌ Clear operation cancelled.")

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Menu restored:",
        reply_markup=get_commands_keyboard()
    )

    return ConversationHandler.END

async def clear_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query:
        await query.answer()
        await query.edit_message_text("❌ Clear operation cancelled.")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text="Menu restored:",
            reply_markup=get_commands_keyboard()
        )
    else:
        await update.message.reply_html("❌ Clear operation cancelled.", reply_markup=get_commands_keyboard())
    return ConversationHandler.END

async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    balance = db.get_balance(config.DATABASE_PATH)
    await update.message.reply_html(f"📈 Current Net Balance: <b>{format_rupiah(balance)}</b>")

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
            f"📅 {tx['date']} | {sign} {emoji} {format_rupiah(tx['amount'])} | <i>{tx['description']}</i> (Bal: {format_rupiah(tx['balance_after'])})"
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
            lines.append(f" - {s['description']} ({s['type']}): {sign} {emoji} {format_rupiah(s['total'])}")
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

async def export_sheets_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Callback for exporting transaction data to a Google Spreadsheet.

    Fetches transactions and weekly/monthly summaries, invokes the sheets
    helper, and returns a public Google Spreadsheet link to the user.

    Args:
        update: The incoming Telegram update.
        context: The callback context.
    """
    query = update.callback_query
    await query.answer()

    if not config.GOOGLE_SERVICE_ACCOUNT_FILE:
        await query.edit_message_text(
            "❌ Google Sheets export is not configured "
            "(missing credentials file path)."
        )
        return

    await query.edit_message_text(
        "⏳ Generating Google Sheet export, please wait..."
    )
    
    try:
        import sheets
        transactions = db.get_all_transactions(config.DATABASE_PATH)
        weekly = db.get_summaries(config.DATABASE_PATH, "weekly")
        monthly = db.get_summaries(config.DATABASE_PATH, "monthly")
        
        sheet_url = sheets.export_data_to_sheets(
            config.GOOGLE_SERVICE_ACCOUNT_FILE,
            transactions,
            weekly,
            monthly,
            config.SPREADSHEET_ID
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


async def quick_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Parses a natural language sentence and prompts for confirmation."""
    message_text = update.message.text
    sentence = ""
    if message_text.lower().startswith("/quick"):
        parts = message_text.split(None, 1)
        if len(parts) > 1:
            sentence = parts[1]

    if not sentence.strip():
        await update.message.reply_html(
            "⚠️ Please provide a sentence to parse.\n"
            "Usage: <code>/quick &lt;sentence&gt;</code>\n"
            "Example: <code>/quick spent 50k on lunch today</code>",
            reply_markup=get_commands_keyboard()
        )
        return

    parsed = parse_transaction_sentence(sentence)
    if not parsed:
        await update.message.reply_html(
            "⚠️ Could not parse the transaction sentence. Please try again with a clearer format.\n"
            "Example: <code>/quick spent 50k on lunch today</code>",
            reply_markup=get_commands_keyboard()
        )
        return

    context.user_data["quick_tx"] = parsed

    amount_str = format_rupiah(parsed["amount"])
    tx_type_str = "Debit (Expense)" if parsed["type"] == "debit" else "Credit (Income)"
    msg = (
        "<b>Confirm Quick Add</b>\n\n"
        f"📅 <b>Date:</b> {parsed['date']}\n"
        f"💰 <b>Amount:</b> {amount_str}\n"
        f"🏷️ <b>Type:</b> {tx_type_str}\n"
        f"📝 <b>Description:</b> {parsed['description']}\n\n"
        "Do you want to save this transaction?"
    )

    keyboard = [
        [
            InlineKeyboardButton("Confirm Save ✅", callback_data="quick_confirm"),
            InlineKeyboardButton("Cancel ❌", callback_data="quick_cancel"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_html(msg, reply_markup=reply_markup)


async def quick_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Saves the parsed transaction to the database after user confirmation."""
    query = update.callback_query
    await query.answer()

    parsed = context.user_data.get("quick_tx")
    if not parsed:
        await query.edit_message_text("⚠️ No active quick transaction found to confirm.")
        return

    db.add_transaction(
        config.DATABASE_PATH,
        parsed["date"],
        parsed["amount"],
        parsed["description"],
        parsed["type"]
    )

    balance = db.get_balance(config.DATABASE_PATH)
    formatted_balance = format_rupiah(balance)

    context.user_data.pop("quick_tx", None)

    amount_str = format_rupiah(parsed["amount"])
    tx_type_str = "Debit (Expense)" if parsed["type"] == "debit" else "Credit (Income)"
    success_text = (
        f"✅ <b>Transaction Saved Successfully!</b>\n\n"
        f"📅 <b>Date:</b> {parsed['date']}\n"
        f"💰 <b>Amount:</b> {amount_str}\n"
        f"🏷️ <b>Type:</b> {tx_type_str}\n"
        f"📝 <b>Description:</b> {parsed['description']}\n\n"
        f"💰 <b>Current Net Balance:</b> {formatted_balance}"
    )

    await query.edit_message_text(success_text, parse_mode="HTML")
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text="Menu restored:",
        reply_markup=get_commands_keyboard()
    )


async def quick_cancel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Cancels the quick add operation and clears the temporary state."""
    query = update.callback_query
    context.user_data.pop("quick_tx", None)

    if query:
        await query.answer()
        await query.edit_message_text("❌ Quick add transaction cancelled.")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text="Menu restored:",
            reply_markup=get_commands_keyboard()
        )
    else:
        await update.message.reply_html(
            "❌ Quick add transaction cancelled.",
            reply_markup=get_commands_keyboard()
        )


async def post_init(application: Application) -> None:
    """Sets up the bot command list for Telegram client input autocomplete."""
    commands = [
        BotCommand("start", "Initialize the bot, display greeting"),
        BotCommand("help", "Show this guide"),
        BotCommand("add", "Record a new transaction (credit or debit)"),
        BotCommand("balance", "Retrieve current net balance"),
        BotCommand("view", "View the last 10 transaction history records"),
        BotCommand("summary", "View weekly/monthly financial summaries"),
        BotCommand("edit", "Edit an existing transaction step-by-step"),
        BotCommand("clear", "Remove or clear transaction history"),
        BotCommand("cancel", "Cancel current interaction/conversation"),
        BotCommand("quick", "Quick add transaction from a single sentence"),
    ]
    await application.bot.set_my_commands(commands)
    await application.bot.set_chat_menu_button(menu_button=MenuButtonCommands())


def main():
    db.init_db(config.DATABASE_PATH)
    
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).post_init(post_init).build()
    
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
    
    edit_conv_handler = ConversationHandler(
        entry_points=[CommandHandler("edit", edit_start)],
        states={
            EDIT_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_id)],
            EDIT_DATE: [
                CallbackQueryHandler(edit_date),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_date),
            ],
            EDIT_TYPE: [CallbackQueryHandler(edit_type)],
            EDIT_AMOUNT: [
                CallbackQueryHandler(edit_amount),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_amount),
            ],
            EDIT_DESCRIPTION: [
                CallbackQueryHandler(edit_description),
                MessageHandler(filters.TEXT & ~filters.COMMAND, edit_description),
            ],
            EDIT_CONFIRM: [CallbackQueryHandler(edit_confirm)],
        },
        fallbacks=[CommandHandler("cancel", edit_cancel)],
        per_message=False,
    )

    clear_conv_handler = ConversationHandler(
        entry_points=[CommandHandler("clear", clear_start)],
        states={
            CLEAR_CHOICE: [CallbackQueryHandler(clear_choice)],
            CLEAR_ID_INPUT: [MessageHandler(filters.TEXT & ~filters.COMMAND, clear_id_input)],
            CLEAR_MONTH_INPUT: [
                CallbackQueryHandler(clear_month_input),
                MessageHandler(filters.TEXT & ~filters.COMMAND, clear_month_input),
            ],
            CLEAR_CONFIRM: [
                CallbackQueryHandler(clear_confirm_callback, pattern="^clear_confirm$"),
                CallbackQueryHandler(clear_cancel, pattern="^clear_cancel$"),
            ],
        },
        fallbacks=[CommandHandler("cancel", clear_cancel)],
        per_message=False,
    )

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("view", view_command))
    app.add_handler(CommandHandler("summary", summary_command))
    app.add_handler(CallbackQueryHandler(summary_callback, pattern="^summary_"))
    app.add_handler(CallbackQueryHandler(
        export_sheets_callback, pattern="^export_sheets$"
    ))
    app.add_handler(CommandHandler("quick", quick_start))
    app.add_handler(CallbackQueryHandler(quick_confirm_callback, pattern="^quick_confirm$"))
    app.add_handler(CallbackQueryHandler(quick_cancel_callback, pattern="^quick_cancel$"))
    app.add_handler(conv_handler)
    app.add_handler(edit_conv_handler)
    app.add_handler(clear_conv_handler)
    app.add_handler(CommandHandler("cancel", quick_cancel_callback))
    app.run_polling()

if __name__ == "__main__":
    main()
