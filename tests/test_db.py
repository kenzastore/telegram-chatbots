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
