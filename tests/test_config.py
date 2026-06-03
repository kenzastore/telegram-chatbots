import os
import pytest
import importlib

def test_config_loading(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "mock_token_123")
    monkeypatch.setenv("DATABASE_PATH", "mock_finance.db")
    
    import config
    importlib.reload(config)
    
    assert config.TELEGRAM_BOT_TOKEN == "mock_token_123"
    assert config.DATABASE_PATH == "mock_finance.db"

def test_config_missing_token(monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    
    import config
    with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN environment variable is not set"):
        importlib.reload(config)
