import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update, MenuButtonCommands, ReplyKeyboardRemove, ReplyKeyboardMarkup
from telegram.ext import CallbackContext, Application

import bot
import config

@pytest.mark.asyncio
async def test_start_command():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    await bot.start_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Welcome" in args[0] or "welcome" in args[0].lower()
    assert isinstance(kwargs.get("reply_markup"), ReplyKeyboardMarkup)
    assert kwargs.get("reply_markup").keyboard[0][0].text == "/quick"
    assert kwargs.get("reply_markup").keyboard[1][0].text == "/add"
    assert kwargs.get("reply_markup").keyboard[1][1].text == "/balance"

@pytest.mark.asyncio
async def test_help_command():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    await bot.help_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "/add" in args[0]
    assert "/balance" in args[0]
    assert "/edit" in args[0]
    assert "/clear" in args[0]
    assert isinstance(kwargs.get("reply_markup"), ReplyKeyboardMarkup)
    assert kwargs.get("reply_markup").keyboard[0][0].text == "/quick"
    assert kwargs.get("reply_markup").keyboard[1][0].text == "/add"
    assert kwargs.get("reply_markup").keyboard[1][1].text == "/balance"

def test_main(monkeypatch):
    mock_app = MagicMock()
    mock_builder = MagicMock()
    mock_builder.token.return_value = mock_builder
    mock_builder.post_init.return_value = mock_builder
    mock_builder.build.return_value = mock_app
    
    monkeypatch.setattr(Application, "builder", lambda: mock_builder)
    
    import db
    monkeypatch.setattr(db, "init_db", MagicMock())
    
    bot.main()
    
    mock_app.add_handler.assert_called()
    assert mock_app.add_handler.call_count == 15
    mock_app.run_polling.assert_called_once()

@pytest.mark.asyncio
async def test_post_init():
    mock_app = MagicMock(spec=Application)
    mock_app.bot = AsyncMock()
    
    await bot.post_init(mock_app)
    
    mock_app.bot.set_my_commands.assert_called_once()
    args, kwargs = mock_app.bot.set_my_commands.call_args
    commands = args[0]
    assert len(commands) == 12
    assert commands[0].command == "start"
    assert commands[1].command == "help"
    assert commands[2].command == "add"
    assert commands[3].command == "balance"
    assert commands[4].command == "view"
    assert commands[5].command == "summary"
    assert commands[6].command == "edit"
    assert commands[7].command == "clear"
    assert commands[8].command == "cancel"
    assert commands[9].command == "quick"
    assert commands[10].command == "google_login"
    assert commands[11].command == "google_logout"
    
    mock_app.bot.set_chat_menu_button.assert_called_once()
    menu_kwargs = mock_app.bot.set_chat_menu_button.call_args[1]
    assert isinstance(menu_kwargs.get("menu_button"), MenuButtonCommands)

@pytest.mark.asyncio
async def test_add_start():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    state = await bot.add_start(update, context)
    assert state == bot.TYPE
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Transaction Type" in args[0]

@pytest.mark.asyncio
async def test_add_type_callback():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "debit"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.add_type(update, context)
    assert state == bot.AMOUNT
    assert context.user_data["type"] == "debit"
    update.callback_query.edit_message_text.assert_called_once()
    kwargs = update.callback_query.edit_message_text.call_args.kwargs
    assert "amount" in kwargs["text"].lower()

@pytest.mark.asyncio
async def test_add_amount_invalid():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "invalid_amount"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.add_amount(update, context)
    assert state == bot.AMOUNT
    update.message.reply_text.assert_called_once()
    assert "invalid" in update.message.reply_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_add_amount_valid():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "150.50"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.add_amount(update, context)
    assert state == bot.DESCRIPTION
    assert context.user_data["amount"] == 150.50
    update.message.reply_text.assert_called_once()
    assert "description" in update.message.reply_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_add_description():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "Grocery shopping"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.add_description(update, context)
    assert state == bot.DATE
    assert context.user_data["description"] == "Grocery shopping"
    update.message.reply_html.assert_called_once()
    assert "date" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_add_date_today(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "today"
    context = MagicMock(spec=CallbackContext)
    context.bot = AsyncMock()
    context.user_data = {
        "type": "credit",
        "amount": 200.0,
        "description": "Salary"
    }
    
    mock_add = MagicMock(return_value=1)
    mock_balance = MagicMock(return_value=200.0)
    import db
    monkeypatch.setattr(db, "add_transaction", mock_add)
    monkeypatch.setattr(db, "get_balance", mock_balance)
    
    from telegram.ext import ConversationHandler
    state = await bot.add_date(update, context)
    assert state == ConversationHandler.END
    mock_add.assert_called_once()
    args, kwargs = mock_add.call_args
    from datetime import datetime
    assert args[1] == datetime.now().strftime("%Y-%m-%d")
    
    update.callback_query.edit_message_text.assert_called_once()
    kwargs = update.callback_query.edit_message_text.call_args.kwargs
    assert "+ 💰 Rp 200,00" in kwargs["text"]
    context.bot.send_message.assert_called_once()

@pytest.mark.asyncio
async def test_add_date_manual(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = None
    update.message = AsyncMock()
    update.message.text = "2026-05-15"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {
        "type": "debit",
        "amount": 50.0,
        "description": "Groceries"
    }
    
    mock_add = MagicMock(return_value=1)
    mock_balance = MagicMock(return_value=-50.0)
    import db
    monkeypatch.setattr(db, "add_transaction", mock_add)
    monkeypatch.setattr(db, "get_balance", mock_balance)
    
    from telegram.ext import ConversationHandler
    state = await bot.add_date(update, context)
    assert state == ConversationHandler.END
    mock_add.assert_called_once()
    args, kwargs = mock_add.call_args
    assert args[1] == "2026-05-15"
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "- 💸 Rp 50,00" in args[0]

@pytest.mark.asyncio
async def test_add_date_manual_invalid():
    update = MagicMock(spec=Update)
    update.callback_query = None
    update.message = AsyncMock()
    update.message.text = "invalid-date"
    context = MagicMock(spec=CallbackContext)
    
    state = await bot.add_date(update, context)
    assert state == bot.DATE
    update.message.reply_text.assert_called_once()
    assert "invalid" in update.message.reply_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_add_cancel():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    from telegram.ext import ConversationHandler
    state = await bot.add_cancel(update, context)
    assert state == ConversationHandler.END
    update.message.reply_html.assert_called_once()
    assert "cancelled" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_balance_command(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    mock_get_balance = MagicMock(return_value=125.50)
    import db
    monkeypatch.setattr(db, "get_balance", mock_get_balance)
    
    await bot.balance_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Balance" in args[0]
    assert "Rp 125,50" in args[0]

@pytest.mark.asyncio
async def test_view_command(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    mock_history = [
        {"date": "2026-06-03", "type": "credit", "amount": 100.0, "description": "Salary", "balance_after": 100.0},
        {"date": "2026-06-03", "type": "debit", "amount": 20.0, "description": "Coffee", "balance_after": 80.0}
    ]
    import db
    monkeypatch.setattr(db, "get_history", MagicMock(return_value=mock_history))
    
    await bot.view_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Salary" in args[0]
    assert "Coffee" in args[0]
    assert "+ 💰 Rp 100,00" in args[0]
    assert "- 💸 Rp 20,00" in args[0]

@pytest.mark.asyncio
async def test_view_command_empty(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    import db
    monkeypatch.setattr(db, "get_history", MagicMock(return_value=[]))
    
    await bot.view_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "No transactions found" in args[0]

@pytest.mark.asyncio
async def test_summary_command_prompt():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    await bot.summary_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Summary Period" in args[0]

@pytest.mark.asyncio
async def test_summary_callback_weekly(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "summary_weekly"
    context = MagicMock(spec=CallbackContext)
    
    mock_sums = [
        {"description": "Food", "type": "debit", "total": 150.0},
        {"description": "Salary", "type": "credit", "total": 500.0}
    ]
    import db
    monkeypatch.setattr(db, "get_summaries", MagicMock(return_value=mock_sums))
    
    await bot.summary_callback(update, context)
    
    update.callback_query.edit_message_text.assert_called_once()
    kwargs = update.callback_query.edit_message_text.call_args.kwargs
    assert "Weekly Summary" in kwargs["text"]
    assert "Food (debit): - 💸 Rp 150,00" in kwargs["text"]
    assert "Salary (credit): + 💰 Rp 500,00" in kwargs["text"]
    assert "reply_markup" in kwargs
    assert kwargs["reply_markup"].inline_keyboard[0][0].text == "Export to Google Sheets 📊"
    assert kwargs["reply_markup"].inline_keyboard[0][0].callback_data == "export_sheets"

@pytest.mark.asyncio
async def test_summary_callback_monthly(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "summary_monthly"
    context = MagicMock(spec=CallbackContext)
    
    mock_sums = []
    import db
    monkeypatch.setattr(db, "get_summaries", MagicMock(return_value=mock_sums))
    
    await bot.summary_callback(update, context)
    
    update.callback_query.edit_message_text.assert_called_once()
    kwargs = update.callback_query.edit_message_text.call_args.kwargs
    assert "Monthly Summary" in kwargs["text"]
    assert "No transactions found" in kwargs["text"]
    assert "reply_markup" in kwargs
    assert kwargs["reply_markup"].inline_keyboard[0][0].text == "Export to Google Sheets 📊"
    assert kwargs["reply_markup"].inline_keyboard[0][0].callback_data == "export_sheets"

@pytest.mark.asyncio
async def test_summary_command_with_arg(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = None
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    context.args = ["weekly"]
    
    mock_sums = [{"description": "Food", "type": "debit", "total": 12.5}]
    import db
    monkeypatch.setattr(db, "get_summaries", MagicMock(return_value=mock_sums))
    
    await bot.summary_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Weekly Summary" in args[0]
    assert "Food (debit): - 💸 Rp 12,50" in args[0]
    assert kwargs["reply_markup"].inline_keyboard[0][0].text == "Export to Google Sheets 📊"
    assert kwargs["reply_markup"].inline_keyboard[0][0].callback_data == "export_sheets"

@pytest.mark.asyncio
async def test_export_sheets_callback_not_configured(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "export_sheets"
    context = MagicMock(spec=CallbackContext)
    
    import config
    monkeypatch.setattr(config, "GOOGLE_SERVICE_ACCOUNT_FILE", None)
    
    await bot.export_sheets_callback(update, context)
    
    update.callback_query.answer.assert_called_once()
    update.callback_query.edit_message_text.assert_called_once()
    args, kwargs = update.callback_query.edit_message_text.call_args
    assert "Google Sheets export is not configured" in args[0]

@pytest.mark.asyncio
async def test_export_sheets_callback_success(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "export_sheets"
    context = MagicMock(spec=CallbackContext)
    
    import config
    monkeypatch.setattr(config, "GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
    monkeypatch.setattr(config, "SPREADSHEET_ID", "test_spreadsheet_id")
    
    import db
    monkeypatch.setattr(db, "get_all_transactions", MagicMock(return_value=[
        {"id": 1, "date": "2026-06-04", "amount": 10.0, "description": "Test", "type": "credit", "balance_after": 10.0}
    ]))
    monkeypatch.setattr(db, "get_summaries", MagicMock(side_effect=lambda db_path, period: [
        {"description": "Test", "type": "credit", "total": 10.0}
    ]))
    
    import sheets
    mock_export = MagicMock(return_value="https://docs.google.com/spreadsheets/d/test_id")
    monkeypatch.setattr(sheets, "export_data_to_sheets", mock_export)
    
    await bot.export_sheets_callback(update, context)
    
    update.callback_query.answer.assert_called_once()
    mock_export.assert_called_once_with(
        "credentials.json",
        [{"id": 1, "date": "2026-06-04", "amount": 10.0, "description": "Test", "type": "credit", "balance_after": 10.0}],
        [{"description": "Test", "type": "credit", "total": 10.0}],
        [{"description": "Test", "type": "credit", "total": 10.0}],
        "test_spreadsheet_id"
    )
    
    assert update.callback_query.edit_message_text.call_count == 2
    args, kwargs = update.callback_query.edit_message_text.call_args
    assert "Google Sheet generated successfully" in args[0]
    assert "https://docs.google.com/spreadsheets/d/test_id" in args[0]

@pytest.mark.asyncio
async def test_export_sheets_callback_error(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "export_sheets"
    context = MagicMock(spec=CallbackContext)
    
    import config
    monkeypatch.setattr(config, "GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
    
    import db
    monkeypatch.setattr(db, "get_all_transactions", MagicMock(return_value=[]))
    monkeypatch.setattr(db, "get_summaries", MagicMock(return_value=[]))
    
    import sheets
    monkeypatch.setattr(sheets, "export_data_to_sheets", MagicMock(side_effect=Exception("<API Error>")))
    
    await bot.export_sheets_callback(update, context)
    
    update.callback_query.answer.assert_called_once()
    assert update.callback_query.edit_message_text.call_count == 2
    args, kwargs = update.callback_query.edit_message_text.call_args
    assert "Failed to export data" in args[0]
    assert "&lt;API Error&gt;" in args[0]

def test_format_rupiah():
    assert bot.format_rupiah(150000.0) == "Rp 150.000,00"
    assert bot.format_rupiah(1250.5) == "Rp 1.250,50"
    assert bot.format_rupiah(0.0) == "Rp 0,00"
    assert bot.format_rupiah(-500.25) == "Rp -500,25"

@pytest.mark.asyncio
async def test_edit_start():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    state = await bot.edit_start(update, context)
    assert state == bot.EDIT_ID
    update.message.reply_html.assert_called_once()
    assert "Transaction ID" in update.message.reply_html.call_args[0][0]

@pytest.mark.asyncio
async def test_edit_id_not_found(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "999"
    context = MagicMock(spec=CallbackContext)
    
    import db
    monkeypatch.setattr(db, "get_transaction", MagicMock(return_value=None))
    
    state = await bot.edit_id(update, context)
    assert state == bot.EDIT_ID
    update.message.reply_text.assert_called_once()
    assert "not found" in update.message.reply_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_edit_id_found(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "1"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    tx = {"id": 1, "date": "2026-06-01", "amount": 100.0, "description": "Salary", "type": "credit"}
    import db
    monkeypatch.setattr(db, "get_transaction", MagicMock(return_value=tx))
    
    state = await bot.edit_id(update, context)
    assert state == bot.EDIT_DATE
    assert context.user_data["edit_id"] == 1
    assert context.user_data["edit_tx"] == tx
    update.message.reply_html.assert_called_once()
    assert "Enter new date" in update.message.reply_html.call_args[0][0]

@pytest.mark.asyncio
async def test_edit_date_keep():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "keep_current"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {
        "edit_tx": {"date": "2026-06-01", "type": "credit"}
    }
    
    state = await bot.edit_date(update, context)
    assert state == bot.EDIT_TYPE
    assert context.user_data["edit_date"] == "2026-06-01"
    update.callback_query.edit_message_text.assert_called_once()

@pytest.mark.asyncio
async def test_edit_type_keep():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "keep_current"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {
        "edit_tx": {"type": "credit", "amount": 100.0}
    }
    
    state = await bot.edit_type(update, context)
    assert state == bot.EDIT_AMOUNT
    assert context.user_data["edit_type"] == "credit"
    update.callback_query.edit_message_text.assert_called_once()

@pytest.mark.asyncio
async def test_edit_amount_valid():
    update = MagicMock(spec=Update)
    update.callback_query = None
    update.message = AsyncMock()
    update.message.text = "150.0"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {
        "edit_tx": {"amount": 100.0, "description": "Salary"}
    }
    
    state = await bot.edit_amount(update, context)
    assert state == bot.EDIT_DESCRIPTION
    assert context.user_data["edit_amount"] == 150.0
    update.message.reply_html.assert_called_once()

@pytest.mark.asyncio
async def test_edit_description_keep():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "keep_current"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {
        "edit_id": 1,
        "edit_tx": {"id": 1, "date": "2026-06-01", "amount": 100.0, "description": "Salary", "type": "credit"},
        "edit_date": "2026-06-02",
        "edit_type": "debit",
        "edit_amount": 50.0
    }
    
    state = await bot.edit_description(update, context)
    assert state == bot.EDIT_CONFIRM
    assert context.user_data["edit_description"] == "Salary"
    update.callback_query.edit_message_text.assert_called_once()

@pytest.mark.asyncio
async def test_edit_confirm(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "confirm"
    context = MagicMock(spec=CallbackContext)
    context.bot = AsyncMock()
    context.user_data = {
        "edit_id": 1,
        "edit_date": "2026-06-02",
        "edit_type": "debit",
        "edit_amount": 50.0,
        "edit_description": "Salary"
    }
    
    mock_update = MagicMock()
    import db
    monkeypatch.setattr(db, "update_transaction", mock_update)
    
    import config
    from telegram.ext import ConversationHandler
    state = await bot.edit_confirm(update, context)
    assert state == ConversationHandler.END
    mock_update.assert_called_once_with(config.DATABASE_PATH, 1, "2026-06-02", 50.0, "Salary", "debit")
    update.callback_query.edit_message_text.assert_called_once()
    assert "successfully updated" in update.callback_query.edit_message_text.call_args[0][0].lower()
    context.bot.send_message.assert_called_once()

@pytest.mark.asyncio
async def test_clear_start():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    state = await bot.clear_start(update, context)
    assert state == bot.CLEAR_CHOICE
    update.message.reply_html.assert_called_once()
    assert "clear transactions" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_clear_choice_recent():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "clear_recent"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.clear_choice(update, context)
    assert state == bot.CLEAR_CONFIRM
    assert context.user_data["clear_choice"] == "recent"
    update.callback_query.edit_message_text.assert_called_once()
    assert "confirm deletion" in update.callback_query.edit_message_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_clear_choice_id():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "clear_id"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    state = await bot.clear_choice(update, context)
    assert state == bot.CLEAR_ID_INPUT
    update.callback_query.edit_message_text.assert_called_once()
    assert "enter transaction id" in update.callback_query.edit_message_text.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_clear_id_input_found(monkeypatch):
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "1"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}
    
    tx = {"id": 1, "date": "2026-06-01", "amount": 100.0, "description": "Salary", "type": "credit"}
    import db
    monkeypatch.setattr(db, "get_transaction", MagicMock(return_value=tx))
    
    state = await bot.clear_id_input(update, context)
    assert state == bot.CLEAR_CONFIRM
    assert context.user_data["clear_choice"] == "id"
    assert context.user_data["clear_param"] == 1
    update.message.reply_html.assert_called_once()
    assert "confirm deletion" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_clear_confirm_yes(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "clear_confirm"
    context = MagicMock(spec=CallbackContext)
    context.bot = AsyncMock()
    context.user_data = {
        "clear_choice": "week",
        "clear_param": None
    }
    
    mock_clear = MagicMock(return_value=3)
    import db
    monkeypatch.setattr(db, "clear_transactions", mock_clear)
    
    import config
    from telegram.ext import ConversationHandler
    state = await bot.clear_confirm_callback(update, context)
    assert state == ConversationHandler.END
    mock_clear.assert_called_once_with(config.DATABASE_PATH, "week", None)
    update.callback_query.edit_message_text.assert_called_once()
    assert "deleted 3 transaction" in update.callback_query.edit_message_text.call_args[0][0].lower()
    context.bot.send_message.assert_called_once()

def test_parse_transaction_sentence():
    from datetime import datetime
    ref_date = datetime(2026, 6, 4, 12, 0, 0)
    
    test_cases = [
        # Basic debit, English, today
        ("spent 50k on lunch today", {
            "amount": 50000.0,
            "type": "debit",
            "date": "2026-06-04",
            "description": "lunch"
        }),
        # Basic credit, Indonesian, yesterday
        ("terima 1.5jt untuk gaji kemarin", {
            "amount": 1500000.0,
            "type": "credit",
            "date": "2026-06-03",
            "description": "gaji"
        }),
        # No date, defaults to today
        ("bayar 25000 untuk parkir", {
            "amount": 25000.0,
            "type": "debit",
            "date": "2026-06-04",
            "description": "parkir"
        }),
        # Suffix and dot separators
        ("masuk 2.5jt dari bonus", {
            "amount": 2500000.0,
            "type": "credit",
            "date": "2026-06-04",
            "description": "bonus"
        }),
        # Suffix k and billion (m)
        ("beli saham 1m hari ini", {
            "amount": 1000000000.0,
            "type": "debit",
            "date": "2026-06-04",
            "description": "saham"
        }),
        # Clean preposition removal
        ("spent 100000 for dinner at restaurant", {
            "amount": 100000.0,
            "type": "debit",
            "date": "2026-06-04",
            "description": "dinner at restaurant"
        }),
        # Parsing fails if amount or type is missing
        ("buying coffee", None),
        ("spent money on coffee", None),
    ]
    
    for sentence, expected in test_cases:
        result = bot.parse_transaction_sentence(sentence, ref_date)
        assert result == expected, f"Failed on sentence: {sentence}. Got: {result}, Expected: {expected}"

@pytest.mark.asyncio
async def test_quick_command_no_args():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "/quick"
    context = MagicMock(spec=CallbackContext)
    context.args = []
    
    await bot.quick_start(update, context)
    
    update.message.reply_html.assert_called_once()
    assert "please provide a sentence" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_quick_command_invalid_sentence():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "/quick buying coffee"
    context = MagicMock(spec=CallbackContext)
    context.args = ["buying", "coffee"]
    
    await bot.quick_start(update, context)
    
    update.message.reply_html.assert_called_once()
    assert "could not parse" in update.message.reply_html.call_args[0][0].lower()

@pytest.mark.asyncio
async def test_quick_command_valid_sentence():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "/quick spent 50k on lunch today"
    context = MagicMock(spec=CallbackContext)
    context.args = ["spent", "50k", "on", "lunch", "today"]
    context.user_data = {}
    
    await bot.quick_start(update, context)
    
    update.message.reply_html.assert_called_once()
    assert "confirm quick add" in update.message.reply_html.call_args[0][0].lower()
    assert context.user_data["quick_tx"]["amount"] == 50000.0
    assert context.user_data["quick_tx"]["type"] == "debit"
    assert context.user_data["quick_tx"]["description"] == "lunch"

@pytest.mark.asyncio
async def test_quick_confirm_callback(monkeypatch):
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "quick_confirm"
    context = MagicMock(spec=CallbackContext)
    context.bot = AsyncMock()
    context.user_data = {
        "quick_tx": {
            "amount": 50000.0,
            "type": "debit",
            "date": "2026-06-04",
            "description": "lunch"
        }
    }
    
    mock_add = MagicMock(return_value=1)
    mock_balance = MagicMock(return_value=150000.0)
    import db
    monkeypatch.setattr(db, "add_transaction", mock_add)
    monkeypatch.setattr(db, "get_balance", mock_balance)
    
    await bot.quick_confirm_callback(update, context)
    
    mock_add.assert_called_once_with(config.DATABASE_PATH, "2026-06-04", 50000.0, "lunch", "debit")
    update.callback_query.edit_message_text.assert_called_once()
    assert "saved successfully" in update.callback_query.edit_message_text.call_args[0][0].lower()
    context.bot.send_message.assert_called_once()

@pytest.mark.asyncio
async def test_quick_cancel_callback():
    update = MagicMock(spec=Update)
    update.callback_query = AsyncMock()
    update.callback_query.data = "quick_cancel"
    context = MagicMock(spec=CallbackContext)
    context.bot = AsyncMock()
    context.user_data = {
        "quick_tx": {"amount": 50000.0}
    }
    
    await bot.quick_cancel_callback(update, context)
    
    assert "quick_tx" not in context.user_data
    update.callback_query.edit_message_text.assert_called_once()
    assert "cancelled" in update.callback_query.edit_message_text.call_args[0][0].lower()
    context.bot.send_message.assert_called_once()


@pytest.mark.asyncio
async def test_quick_sentence_input_valid():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "spent 50k on lunch today"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    res = await bot.quick_sentence_input(update, context)

    assert res == bot.ConversationHandler.END
    update.message.reply_html.assert_called_once()
    assert "confirm quick add" in update.message.reply_html.call_args[0][0].lower()
    assert context.user_data["quick_tx"]["amount"] == 50000.0


@pytest.mark.asyncio
async def test_quick_sentence_input_invalid():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "invalid sentence pattern"
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    res = await bot.quick_sentence_input(update, context)

    assert res == bot.QUICK_SENTENCE
    update.message.reply_html.assert_called_once()
    assert "could not parse" in update.message.reply_html.call_args[0][0].lower()


@pytest.mark.asyncio
@patch("bot.sheets.get_authorization_url")
@patch("bot.db.get_user_config")
async def test_google_login_start(mock_get_config, mock_get_url):
    mock_get_config.return_value = None
    mock_get_url.return_value = ("https://mock-auth-url", "state123")
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.effective_user = MagicMock()
    update.effective_user.id = 12345
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    state = await bot.google_login_start(update, context)
    assert state == bot.GOOGLE_AUTH_CODE
    update.message.reply_html.assert_called_once()
    assert "https://mock-auth-url" in update.message.reply_html.call_args[0][0]


@pytest.mark.asyncio
@patch("bot.db.get_user_config")
@patch("bot.sheets.get_authorization_url")
async def test_google_login_start_already_authenticated(mock_get_url, mock_get_config):
    mock_get_config.return_value = {"google_credentials": '{"token": "xyz"}'}
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.effective_user = MagicMock()
    update.effective_user.id = 12345
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    state = await bot.google_login_start(update, context)
    assert state == bot.ConversationHandler.END
    update.message.reply_html.assert_called_once()
    assert "already authorized" in update.message.reply_html.call_args[0][0].lower()


@pytest.mark.asyncio
@patch("bot.sheets.exchange_code_for_credentials")
@patch("bot.db.set_user_credentials")
@patch("bot.db.get_user_config")
@patch("bot.db.set_user_spreadsheet")
@patch("bot.sheets.export_data_to_sheets")
@patch("bot.db.get_all_transactions")
@patch("bot.db.get_summaries")
async def test_google_login_code_success(
    mock_summaries, mock_tx, mock_export, mock_set_sheet, mock_get_config, mock_set_creds, mock_exchange
):
    mock_exchange.return_value = '{"token": "mock_token"}'
    # First get_user_config returns None spreadsheet_id, second returns new_sheet_123
    mock_get_config.side_effect = [
        {"google_credentials": '{"token": "mock_token"}', "spreadsheet_id": None},
        {"google_credentials": '{"token": "mock_token"}', "spreadsheet_id": "new_sheet_123"}
    ]
    mock_export.return_value = "https://docs.google.com/spreadsheets/d/new_sheet_123"
    
    mock_tx.return_value = []
    mock_summaries.return_value = []

    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "valid_auth_code_123"
    update.effective_user = MagicMock()
    update.effective_user.id = 12345
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    state = await bot.google_login_code(update, context)
    assert state == bot.ConversationHandler.END
    mock_exchange.assert_called_once_with("valid_auth_code_123")
    mock_set_creds.assert_called_once_with(config.DATABASE_PATH, 12345, '{"token": "mock_token"}')
    update.message.reply_html.assert_called()
    assert "authenticated successfully" in update.message.reply_html.call_args_list[0][0][0].lower()


@pytest.mark.asyncio
@patch("bot.sheets.exchange_code_for_credentials")
async def test_google_login_code_invalid(mock_exchange):
    mock_exchange.side_effect = Exception("Invalid code")
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    update.message.text = "invalid_code"
    update.effective_user = MagicMock()
    update.effective_user.id = 12345
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    state = await bot.google_login_code(update, context)
    assert state == bot.GOOGLE_AUTH_CODE
    update.message.reply_html.assert_called_once()
    assert "failed" in update.message.reply_html.call_args[0][0].lower()


@pytest.mark.asyncio
async def test_google_login_cancel():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    context.user_data = {}

    state = await bot.google_login_cancel(update, context)
    assert state == bot.ConversationHandler.END
    update.message.reply_html.assert_called_once()
    assert "cancelled" in update.message.reply_html.call_args[0][0].lower()



