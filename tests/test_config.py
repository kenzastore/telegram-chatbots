import os
import pytest
import importlib
import dotenv

def test_config_loading(monkeypatch):
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *args, **kwargs: None)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "mock_token_123")
    monkeypatch.setenv("DATABASE_PATH", "mock_finance.db")
    monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_FILE", "mock_credentials.json")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "mock_client_id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "mock_client_secret")
    
    import config
    importlib.reload(config)
    
    assert config.TELEGRAM_BOT_TOKEN == "mock_token_123"
    assert config.DATABASE_PATH == "mock_finance.db"
    assert config.GOOGLE_SERVICE_ACCOUNT_FILE == "mock_credentials.json"
    assert config.GOOGLE_CLIENT_ID == "mock_client_id"
    assert config.GOOGLE_CLIENT_SECRET == "mock_client_secret"

def test_config_missing_token(monkeypatch):
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *args, **kwargs: None)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    
    import config
    with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN environment variable is not set"):
        importlib.reload(config)
