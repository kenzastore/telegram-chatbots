import os
import pytest
import sqlite3
from datetime import datetime, timedelta

import db

@pytest.fixture
def temp_db(tmp_path):
    db_file = tmp_path / "test_finance.db"
    db_path = str(db_file)
    db.init_db(db_path)
    return db_path

def test_init_db(temp_db):
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    table = cursor.fetchone()
    assert table is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_configs'")
    table_configs = cursor.fetchone()
    assert table_configs is not None
    conn.close()

def test_add_transaction(temp_db):
    tx_id = db.add_transaction(temp_db, "2026-06-03", 100.0, "Salary", "credit")
    assert tx_id == 1
    
    tx_id2 = db.add_transaction(temp_db, "2026-06-03", 40.0, "Lunch", "debit")
    assert tx_id2 == 2
    
    assert db.get_balance(temp_db) == 60.0

def test_get_history(temp_db):
    db.add_transaction(temp_db, "2026-06-01", 50.0, "Gift", "credit")
    db.add_transaction(temp_db, "2026-06-02", 20.0, "Snack", "debit")
    db.add_transaction(temp_db, "2026-06-03", 10.0, "Bus", "debit")
    
    history = db.get_history(temp_db, limit=2)
    assert len(history) == 2
    assert history[0]["description"] == "Bus"
    assert history[0]["balance_after"] == 20.0
    assert history[1]["description"] == "Snack"
    assert history[1]["balance_after"] == 30.0

def test_get_summaries_weekly(temp_db):
    today = datetime.now()
    db.add_transaction(temp_db, today.strftime("%Y-%m-%d"), 100.0, "Food", "debit")
    db.add_transaction(temp_db, today.strftime("%Y-%m-%d"), 50.0, "Food", "debit")
    db.add_transaction(temp_db, today.strftime("%Y-%m-%d"), 200.0, "Salary", "credit")
    
    old_date = today - timedelta(days=10)
    db.add_transaction(temp_db, old_date.strftime("%Y-%m-%d"), 30.0, "Old Food", "debit")
    
    sums = db.get_summaries(temp_db, "weekly")
    
    food_summary = [s for s in sums if s["description"] == "Food"]
    assert len(food_summary) == 1
    assert food_summary[0]["total"] == 150.0
    
    salary_summary = [s for s in sums if s["description"] == "Salary"]
    assert len(salary_summary) == 1
    assert salary_summary[0]["total"] == 200.0
    
    old_summary = [s for s in sums if s["description"] == "Old Food"]
    assert len(old_summary) == 0

def test_get_summaries_monthly(temp_db):
    today = datetime.now()
    db.add_transaction(temp_db, today.strftime("%Y-%m-%d"), 80.0, "Transport", "debit")
    
    old_date = today - timedelta(days=45)
    db.add_transaction(temp_db, old_date.strftime("%Y-%m-%d"), 30.0, "Old Transport", "debit")
    
    sums = db.get_summaries(temp_db, "monthly")
    transport_summary = [s for s in sums if s["description"] == "Transport"]
    assert len(transport_summary) == 1
    assert transport_summary[0]["total"] == 80.0
    
    old_summary = [s for s in sums if s["description"] == "Old Transport"]
    assert len(old_summary) == 0

def test_add_transaction_invalid_type(temp_db):
    with pytest.raises(ValueError, match="Transaction type must be 'credit' or 'debit'"):
        db.add_transaction(temp_db, "2026-06-03", 50.0, "Invalid", "unknown")

def test_get_summaries_invalid_period(temp_db):
    with pytest.raises(ValueError, match="Period must be 'weekly' or 'monthly'"):
        db.get_summaries(temp_db, "yearly")

def test_get_all_transactions(temp_db):
    db.add_transaction(temp_db, "2026-06-01", 50.0, "Gift", "credit")
    db.add_transaction(temp_db, "2026-06-02", 20.0, "Snack", "debit")
    db.add_transaction(temp_db, "2026-06-03", 10.0, "Bus", "debit")
    
    txs = db.get_all_transactions(temp_db)
    assert len(txs) == 3
    # Check chronological order (ascending date/id)
    assert txs[0]["description"] == "Gift"
    assert txs[1]["description"] == "Snack"
    assert txs[2]["description"] == "Bus"


def test_get_monthly_summary_calendar_month(temp_db):
    # Add transactions in May 2026
    db.add_transaction(temp_db, "2026-05-15", 100.0, "Salary", "credit")
    db.add_transaction(temp_db, "2026-05-20", 50.0, "Groceries", "debit")

    # Add transactions in June 2026
    db.add_transaction(temp_db, "2026-06-01", 200.0, "Salary", "credit")
    db.add_transaction(temp_db, "2026-06-02", 30.0, "Snack", "debit")

    # Call get_summaries for June 2026 (monthly period)
    sums = db.get_summaries(temp_db, period="monthly", year=2026, month=6)

    # Check that only June transactions are returned
    salary_sum = [s for s in sums if s["description"] == "Salary"]
    groceries_sum = [s for s in sums if s["description"] == "Groceries"]
    snack_sum = [s for s in sums if s["description"] == "Snack"]

    assert len(salary_sum) == 1
    assert salary_sum[0]["total"] == 200.0
    assert len(groceries_sum) == 0
    assert len(snack_sum) == 1
    assert snack_sum[0]["total"] == 30.0


def test_get_transactions_by_month(temp_db):
    db.add_transaction(temp_db, "2026-05-15", 100.0, "May Tx", "credit")
    db.add_transaction(temp_db, "2026-06-01", 200.0, "June Tx", "credit")

    txs = db.get_transactions_by_month(temp_db, year=2026, month=6)
    assert len(txs) == 1
    assert txs[0]["description"] == "June Tx"

def test_get_transaction(temp_db):
    tx_id = db.add_transaction(temp_db, "2026-06-01", 100.0, "Test Tx", "credit")
    tx = db.get_transaction(temp_db, tx_id)
    assert tx is not None
    assert tx["description"] == "Test Tx"
    assert tx["amount"] == 100.0
    
    assert db.get_transaction(temp_db, 999) is None

def test_update_transaction_recalculates_balance(temp_db):
    # Insert sequential transactions
    id1 = db.add_transaction(temp_db, "2026-06-01", 100.0, "Salary", "credit") # Bal: 100
    id2 = db.add_transaction(temp_db, "2026-06-02", 30.0, "Snack", "debit")    # Bal: 70
    id3 = db.add_transaction(temp_db, "2026-06-03", 20.0, "Bus", "debit")      # Bal: 50
    
    # Update id2: change amount to 50.0 and description to "Groceries"
    db.update_transaction(temp_db, id2, "2026-06-02", 50.0, "Groceries", "debit")
    
    # Check id2 values
    tx2 = db.get_transaction(temp_db, id2)
    assert tx2["amount"] == 50.0
    assert tx2["description"] == "Groceries"
    
    # Check balances are updated chronologically:
    # id1: Bal 100
    # id2: Bal 50 (100 - 50)
    # id3: Bal 30 (50 - 20)
    tx1 = db.get_transaction(temp_db, id1)
    tx2 = db.get_transaction(temp_db, id2)
    tx3 = db.get_transaction(temp_db, id3)
    assert tx1["balance_after"] == 100.0
    assert tx2["balance_after"] == 50.0
    assert tx3["balance_after"] == 30.0
    assert db.get_balance(temp_db) == 30.0

def test_delete_transaction_recalculates_balance(temp_db):
    id1 = db.add_transaction(temp_db, "2026-06-01", 100.0, "Salary", "credit") # Bal: 100
    id2 = db.add_transaction(temp_db, "2026-06-02", 30.0, "Snack", "debit")    # Bal: 70
    id3 = db.add_transaction(temp_db, "2026-06-03", 20.0, "Bus", "debit")      # Bal: 50
    
    # Delete id2
    db.delete_transaction(temp_db, id2)
    
    # Assert id2 is gone
    assert db.get_transaction(temp_db, id2) is None
    
    # Balances should be:
    # id1: Bal 100
    # id3: Bal 80 (100 - 20)
    tx1 = db.get_transaction(temp_db, id1)
    tx3 = db.get_transaction(temp_db, id3)
    assert tx1["balance_after"] == 100.0
    assert tx3["balance_after"] == 80.0
    assert db.get_balance(temp_db) == 80.0

def test_clear_transactions_recent(temp_db):
    id1 = db.add_transaction(temp_db, "2026-06-01", 100.0, "Salary", "credit")
    id2 = db.add_transaction(temp_db, "2026-06-02", 30.0, "Snack", "debit")
    
    # Clear recent
    db.clear_transactions(temp_db, "recent")
    
    # id2 should be gone, id1 remains
    assert db.get_transaction(temp_db, id2) is None
    assert db.get_transaction(temp_db, id1) is not None
    assert db.get_balance(temp_db) == 100.0

def test_clear_transactions_week(temp_db):
    today = datetime.now()
    old_date = today - timedelta(days=10)
    
    id1 = db.add_transaction(temp_db, old_date.strftime("%Y-%m-%d"), 100.0, "Old Tx", "credit")
    id2 = db.add_transaction(temp_db, today.strftime("%Y-%m-%d"), 30.0, "New Tx", "debit")
    
    # Clear week
    db.clear_transactions(temp_db, "week")
    
    assert db.get_transaction(temp_db, id2) is None
    assert db.get_transaction(temp_db, id1) is not None
    assert db.get_balance(temp_db) == 100.0

def test_clear_transactions_month(temp_db):
    id1 = db.add_transaction(temp_db, "2026-05-15", 100.0, "May Tx", "credit")
    id2 = db.add_transaction(temp_db, "2026-06-01", 30.0, "June Tx", "debit")
    
    # Clear month June
    db.clear_transactions(temp_db, "month", "2026-06")
    
    assert db.get_transaction(temp_db, id2) is None
    assert db.get_transaction(temp_db, id1) is not None
    assert db.get_balance(temp_db) == 100.0


def test_user_config_helpers(temp_db):
    user_id = 123456
    
    # Init state: config should be empty
    config_empty = db.get_user_config(temp_db, user_id)
    assert config_empty is None
    
    # Store credentials
    creds_json = '{"token": "xyz", "refresh_token": "abc"}'
    db.set_user_credentials(temp_db, user_id, creds_json)
    
    config_after_creds = db.get_user_config(temp_db, user_id)
    assert config_after_creds is not None
    assert config_after_creds["google_credentials"] == creds_json
    assert config_after_creds["spreadsheet_id"] is None
    assert config_after_creds["google_code_verifier"] is None
    
    # Store code verifier
    verifier = "verifier_test_123"
    db.set_user_code_verifier(temp_db, user_id, verifier)
    
    config_after_verifier = db.get_user_config(temp_db, user_id)
    assert config_after_verifier is not None
    assert config_after_verifier["google_code_verifier"] == verifier
    
    # Store spreadsheet
    sheet_id = "sheet_123_abc"
    db.set_user_spreadsheet(temp_db, user_id, sheet_id)
    
    config_after_sheet = db.get_user_config(temp_db, user_id)
    assert config_after_sheet is not None
    assert config_after_sheet["google_credentials"] == creds_json
    assert config_after_sheet["spreadsheet_id"] == sheet_id
    assert config_after_sheet["google_code_verifier"] == verifier
    
    # Clear code verifier
    db.set_user_code_verifier(temp_db, user_id, None)
    config_cleared_verifier = db.get_user_config(temp_db, user_id)
    assert config_cleared_verifier["google_code_verifier"] is None
    
    # Clear config
    db.clear_user_config(temp_db, user_id)
    assert db.get_user_config(temp_db, user_id) is None

