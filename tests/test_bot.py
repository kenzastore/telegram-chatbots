import pytest
from unittest.mock import AsyncMock, MagicMock
from telegram import Update
from telegram.ext import CallbackContext, Application

import bot

@pytest.mark.asyncio
async def test_start_command():
    update = MagicMock(spec=Update)
    update.message = AsyncMock()
    context = MagicMock(spec=CallbackContext)
    
    await bot.start_command(update, context)
    
    update.message.reply_html.assert_called_once()
    args, kwargs = update.message.reply_html.call_args
    assert "Welcome" in args[0] or "welcome" in args[0].lower()

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

def test_main(monkeypatch):
    mock_app = MagicMock()
    mock_builder = MagicMock()
    mock_builder.token.return_value = mock_builder
    mock_builder.build.return_value = mock_app
    
    monkeypatch.setattr(Application, "builder", lambda: mock_builder)
    
    import db
    monkeypatch.setattr(db, "init_db", MagicMock())
    
    bot.main()
    
    mock_app.add_handler.assert_called()
    assert mock_app.add_handler.call_count == 10
    mock_app.run_polling.assert_called_once()

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



