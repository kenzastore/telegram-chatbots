import sqlite3
from datetime import datetime, timedelta

def init_db(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            balance_after REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def get_balance(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT balance_after FROM transactions ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0.0

def add_transaction(db_path, date, amount, description, tx_type):
    current_balance = get_balance(db_path)
    if tx_type == "credit":
        new_balance = current_balance + amount
    elif tx_type == "debit":
        new_balance = current_balance - amount
    else:
        raise ValueError("Transaction type must be 'credit' or 'debit'")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO transactions (date, amount, description, type, balance_after)
        VALUES (?, ?, ?, ?, ?)
    """, (date, amount, description, tx_type, new_balance))
    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return tx_id

def get_history(db_path, limit=10):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, date, amount, description, type, balance_after
        FROM transactions
        ORDER BY date DESC, id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_summaries(db_path, period="weekly"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    today = datetime.now()
    if period == "weekly":
        start_date = today - timedelta(days=7)
    elif period == "monthly":
        start_date = today - timedelta(days=30)
    else:
        raise ValueError("Period must be 'weekly' or 'monthly'")
        
    start_str = start_date.strftime("%Y-%m-%d")
    
    cursor.execute("""
        SELECT description, type, SUM(amount) as total
        FROM transactions
        WHERE date >= ?
        GROUP BY description, type
    """, (start_str,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_transactions(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, date, amount, description, type, balance_after
        FROM transactions
        ORDER BY date ASC, id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
