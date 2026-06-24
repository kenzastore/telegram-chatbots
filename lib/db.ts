import "server-only"
import path from "node:path"
import Database from "better-sqlite3"

export type TxType = "credit" | "debit"

export interface Transaction {
  id: number
  user_id: number
  date: string
  amount: number
  description: string
  type: TxType
  balance_after: number
}

let _db: Database.Database | null = null

/**
 * Opens (and memoizes) the same SQLite database that the Telegram bot writes to.
 * Path is controlled by DATABASE_PATH and defaults to ./finance.db, matching config.py.
 */
function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "finance.db")
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  // Ensure the schema exists so the dashboard works even before the bot has run.
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      google_email TEXT DEFAULT '',
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      balance_after REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_configs (
      user_id INTEGER PRIMARY KEY,
      spreadsheet_id TEXT,
      google_credentials TEXT,
      google_code_verifier TEXT,
      google_email TEXT
    );
  `)
  _db = db
  return db
}

export function getTransactions(email: string): Transaction[] {
  if (!email) return []
  const db = getDb()
  return db
    .prepare(
      `SELECT id, user_id, date, amount, description, type, balance_after
       FROM transactions
       WHERE google_email = ?
       ORDER BY date DESC, id DESC`,
    )
    .all(email) as Transaction[]
}

export function getBalance(email: string): number {
  if (!email) return 0
  const db = getDb()
  const row = db
    .prepare(
      `SELECT balance_after FROM transactions
       WHERE google_email = ?
       ORDER BY date DESC, id DESC LIMIT 1`,
    )
    .get(email) as { balance_after: number } | undefined
  return row?.balance_after ?? 0
}

export interface Summary {
  balance: number
  totalCredit: number
  totalDebit: number
  count: number
  monthCredit: number
  monthDebit: number
}

export function getSummary(email: string): Summary {
  const txs = getTransactions(email)
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  let totalCredit = 0
  let totalDebit = 0
  let monthCredit = 0
  let monthDebit = 0
  for (const t of txs) {
    if (t.type === "credit") totalCredit += t.amount
    else if (t.type === "debit") totalDebit += t.amount
    if (typeof t.date === "string" && t.date.startsWith(monthPrefix)) {
      if (t.type === "credit") monthCredit += t.amount
      else if (t.type === "debit") monthDebit += t.amount
    }
  }

  return {
    balance: getBalance(email),
    totalCredit,
    totalDebit,
    count: txs.length,
    monthCredit,
    monthDebit,
  }
}

/** Daily net flow + cumulative balance, oldest -> newest, for charting. */
export function getDailySeries(email: string) {
  const txs = [...getTransactions(email)].reverse() // chronological
  const byDay = new Map<string, { date: string; credit: number; debit: number; balance: number }>()
  for (const t of txs) {
    const day = (t.date || "").slice(0, 10)
    if (!day) continue
    const entry = byDay.get(day) || { date: day, credit: 0, debit: 0, balance: t.balance_after }
    if (t.type === "credit") entry.credit += t.amount
    else if (t.type === "debit") entry.debit += t.amount
    entry.balance = t.balance_after
    byDay.set(day, entry)
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** Top spending categories (debit) grouped by description. */
export function getCategoryBreakdown(email: string) {
  const txs = getTransactions(email).filter((t) => t.type === "debit")
  const byDesc = new Map<string, number>()
  for (const t of txs) {
    byDesc.set(t.description, (byDesc.get(t.description) || 0) + t.amount)
  }
  return Array.from(byDesc.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

export function getTransaction(email: string, id: number): Transaction | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, user_id, date, amount, description, type, balance_after
       FROM transactions WHERE id = ? AND google_email = ?`,
    )
    .get(id, email) as Transaction | undefined
  return row ?? null
}

/**
 * Recalculates running balances for every (user_id) bucket under this email,
 * mirroring the bot's recalculate_balances logic in db.py.
 */
function recalculateBalances(db: Database.Database, email: string) {
  const userIds = db
    .prepare(`SELECT DISTINCT user_id FROM transactions WHERE google_email = ?`)
    .all(email) as { user_id: number }[]

  const select = db.prepare(
    `SELECT id, amount, type FROM transactions
     WHERE google_email = ? AND user_id IS ?
     ORDER BY date ASC, id ASC`,
  )
  const update = db.prepare(`UPDATE transactions SET balance_after = ? WHERE id = ?`)

  for (const { user_id } of userIds) {
    const rows = select.all(email, user_id) as { id: number; amount: number; type: TxType }[]
    let balance = 0
    for (const r of rows) {
      if (r.type === "credit") balance += r.amount
      else if (r.type === "debit") balance -= r.amount
      update.run(balance, r.id)
    }
  }
}

export function updateTransaction(
  email: string,
  id: number,
  data: { date: string; amount: number; description: string; type: TxType },
): boolean {
  if (data.type !== "credit" && data.type !== "debit") {
    throw new Error("Transaction type must be 'credit' or 'debit'")
  }
  const db = getDb()
  const result = db
    .prepare(
      `UPDATE transactions SET date = ?, amount = ?, description = ?, type = ?
       WHERE id = ? AND google_email = ?`,
    )
    .run(data.date, data.amount, data.description, data.type, id, email)
  if (result.changes > 0) {
    recalculateBalances(db, email)
    return true
  }
  return false
}

export function deleteTransaction(email: string, id: number): boolean {
  const db = getDb()
  const result = db
    .prepare(`DELETE FROM transactions WHERE id = ? AND google_email = ?`)
    .run(id, email)
  if (result.changes > 0) {
    recalculateBalances(db, email)
    return true
  }
  return false
}
