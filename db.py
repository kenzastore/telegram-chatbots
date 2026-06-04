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

def get_summaries(
    db_path: str, period: str = "weekly", year: int = None, month: int = None
) -> list:
    """Retrieves financial summaries grouped by description and type.

    If period is 'weekly', retrieves aggregates for the last 7 days.
    If period is 'monthly', retrieves aggregates for the specified calendar month
    (defaults to the current calendar month if year/month are not provided).

    Args:
        db_path: Path to the SQLite database file.
        period: Summary period ('weekly' or 'monthly').
        year: Optional calendar year.
        month: Optional calendar month (1-12).

    Returns:
        A list of dictionaries containing description, type, and total.

    Raises:
        ValueError: If period is not 'weekly' or 'monthly'.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if period == "weekly":
        today = datetime.now()
        start_date = today - timedelta(days=7)
        start_str = start_date.strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT description, type, SUM(amount) as total
            FROM transactions
            WHERE date >= ?
            GROUP BY description, type
        """, (start_str,))
    elif period == "monthly":
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        month_pattern = f"{year}-{month:02d}-%"
        cursor.execute("""
            SELECT description, type, SUM(amount) as total
            FROM transactions
            WHERE date LIKE ?
            GROUP BY description, type
        """, (month_pattern,))
    else:
        conn.close()
        raise ValueError("Period must be 'weekly' or 'monthly'")

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_transactions(db_path: str) -> list:
    """Retrieves all transactions from the database in chronological order.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        A list of dictionaries containing transaction details.
    """
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


def get_transactions_by_month(db_path: str, year: int, month: int) -> list:
    """Retrieves all transactions for a specific calendar month.

    Args:
        db_path: Path to the SQLite database file.
        year: Calendar year.
        month: Calendar month (1-12).

    Returns:
        A list of dictionaries containing transaction details.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    month_pattern = f"{year}-{month:02d}-%"
    cursor.execute("""
        SELECT id, date, amount, description, type, balance_after
        FROM transactions
        WHERE date LIKE ?
        ORDER BY date ASC, id ASC
    """, (month_pattern,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
