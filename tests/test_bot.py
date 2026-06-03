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
    
    bot.main()
    
    mock_app.add_handler.assert_called()
    assert mock_app.add_handler.call_count == 2
    mock_app.run_polling.assert_called_once()
