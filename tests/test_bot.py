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
    assert mock_app.add_handler.call_count == 3
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
    assert "+ 💰 $200.00" in kwargs["text"]

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
    assert "- 💸 $50.00" in args[0]

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
