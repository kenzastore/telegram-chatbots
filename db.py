import sqlite3
from datetime import datetime, timedelta

def init_db(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            balance_after REAL NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_configs (
            user_id INTEGER PRIMARY KEY,
            spreadsheet_id TEXT,
            google_credentials TEXT,
            google_code_verifier TEXT
        )
    """)
    try:
        cursor.execute("ALTER TABLE user_configs ADD COLUMN google_code_verifier TEXT")
    except sqlite3.OperationalError:
        # Column already exists
        pass
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN user_id INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        # Column already exists
        pass
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


def recalculate_balances(db_path: str) -> None:
    """Recalculates the running balances of all transactions in chronological order.

    Sorted by date ASC, id ASC to maintain ledger consistency.

    Args:
        db_path: Path to the SQLite database file.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, amount, type
        FROM transactions
        ORDER BY date ASC, id ASC
    """)
    rows = cursor.fetchall()

    current_balance = 0.0
    updates = []
    for tx_id, amount, tx_type in rows:
        if tx_type == "credit":
            current_balance += amount
        elif tx_type == "debit":
            current_balance -= amount
        updates.append((current_balance, tx_id))

    cursor.executemany("""
        UPDATE transactions
        SET balance_after = ?
        WHERE id = ?
    """, updates)
    conn.commit()
    conn.close()


def get_transaction(db_path: str, tx_id: int) -> dict:
    """Retrieves a single transaction by its ID.

    Args:
        db_path: Path to the SQLite database file.
        tx_id: The transaction ID.

    Returns:
        A dictionary containing transaction details, or None if not found.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, date, amount, description, type, balance_after
        FROM transactions
        WHERE id = ?
    """, (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_transaction(
    db_path: str,
    tx_id: int,
    date: str,
    amount: float,
    description: str,
    tx_type: str
) -> None:
    """Updates a transaction's fields and recalculates subsequent balances.

    Args:
        db_path: Path to the SQLite database file.
        tx_id: The ID of the transaction to update.
        date: The updated date (YYYY-MM-DD).
        amount: The updated numeric amount.
        description: The updated description.
        tx_type: The updated transaction type ('credit' or 'debit').

    Raises:
        ValueError: If transaction type is invalid.
    """
    if tx_type not in ("credit", "debit"):
        raise ValueError("Transaction type must be 'credit' or 'debit'")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE transactions
        SET date = ?, amount = ?, description = ?, type = ?
        WHERE id = ?
    """, (date, amount, description, tx_type, tx_id))
    conn.commit()
    conn.close()
    recalculate_balances(db_path)


def delete_transaction(db_path: str, tx_id: int) -> None:
    """Deletes a transaction and recalculates subsequent balances.

    Args:
        db_path: Path to the SQLite database file.
        tx_id: The ID of the transaction to delete.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    recalculate_balances(db_path)


def clear_transactions(db_path: str, choice: str, param: str = None) -> int:
    """Clears transactions based on the choice: recent, id, week, or month.

    Args:
        db_path: Path to the SQLite database file.
        choice: The clearing choice ('recent', 'id', 'week', 'month').
        param: Optional parameter (e.g. YYYY-MM for 'month', transaction ID for 'id').

    Returns:
        The number of transactions deleted.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    deleted_count = 0

    if choice == "recent":
        # Find the most recently added transaction (highest ID)
        cursor.execute("SELECT id FROM transactions ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        if row:
            cursor.execute("DELETE FROM transactions WHERE id = ?", (row[0],))
            deleted_count = 1
    elif choice == "id":
        if param:
            cursor.execute("DELETE FROM transactions WHERE id = ?", (int(param),))
            deleted_count = cursor.rowcount
    elif choice == "week":
        # Deletes transactions from the last 7 days
        start_date = datetime.now() - timedelta(days=7)
        start_str = start_date.strftime("%Y-%m-%d")
        cursor.execute("DELETE FROM transactions WHERE date >= ?", (start_str,))
        deleted_count = cursor.rowcount
    elif choice == "month":
        if param:
            # param is YYYY-MM
            month_pattern = f"{param}-%"
            cursor.execute("DELETE FROM transactions WHERE date LIKE ?", (month_pattern,))
            deleted_count = cursor.rowcount

    conn.commit()
    conn.close()

    if deleted_count > 0:
        recalculate_balances(db_path)

    return deleted_count


def get_user_config(db_path, user_id):
    """Retrieves the configuration for a specific user ID, or None."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, spreadsheet_id, google_credentials, google_code_verifier
        FROM user_configs
        WHERE user_id = ?
    """, (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def set_user_code_verifier(db_path, user_id, verifier):
    """Saves or updates temporary Google OAuth2 code verifier for a user ID."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM user_configs WHERE user_id = ?", (user_id,))
    if cursor.fetchone():
        cursor.execute("""
            UPDATE user_configs
            SET google_code_verifier = ?
            WHERE user_id = ?
        """, (verifier, user_id))
    else:
        cursor.execute("""
            INSERT INTO user_configs (user_id, google_code_verifier)
            VALUES (?, ?)
        """, (user_id, verifier))
    conn.commit()
    conn.close()


def set_user_credentials(db_path, user_id, credentials_str):
    """Saves or updates Google credentials for a user ID."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM user_configs WHERE user_id = ?", (user_id,))
    if cursor.fetchone():
        cursor.execute("""
            UPDATE user_configs
            SET google_credentials = ?
            WHERE user_id = ?
        """, (credentials_str, user_id))
    else:
        cursor.execute("""
            INSERT INTO user_configs (user_id, google_credentials)
            VALUES (?, ?)
        """, (user_id, credentials_str))
    conn.commit()
    conn.close()


def set_user_spreadsheet(db_path, user_id, spreadsheet_id):
    """Saves or updates Google spreadsheet ID for a user ID."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM user_configs WHERE user_id = ?", (user_id,))
    if cursor.fetchone():
        cursor.execute("""
            UPDATE user_configs
            SET spreadsheet_id = ?
            WHERE user_id = ?
        """, (spreadsheet_id, user_id))
    else:
        cursor.execute("""
            INSERT INTO user_configs (user_id, spreadsheet_id)
            VALUES (?, ?)
        """, (user_id, spreadsheet_id))
    conn.commit()
    conn.close()


def clear_user_config(db_path, user_id):
    """Clears the configuration for a user ID."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_configs WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

