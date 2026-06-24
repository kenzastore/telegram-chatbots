// Seeds finance.db with sample transactions for a demo Google account.
// Run with: npm run seed
import Database from "better-sqlite3"
import path from "node:path"

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "finance.db")
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@example.com"
const DEMO_USER_ID = 1001

const db = new Database(dbPath)
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

db.prepare(`DELETE FROM transactions WHERE google_email = ?`).run(DEMO_EMAIL)
db.prepare(
  `INSERT OR REPLACE INTO user_configs (user_id, google_email) VALUES (?, ?)`,
).run(DEMO_USER_ID, DEMO_EMAIL)

const sample = [
  ["Gaji bulanan", 8500000, "credit"],
  ["Belanja bulanan", 1250000, "debit"],
  ["Makan siang", 85000, "debit"],
  ["Transportasi", 45000, "debit"],
  ["Freelance project", 3200000, "credit"],
  ["Tagihan listrik", 420000, "debit"],
  ["Internet & pulsa", 350000, "debit"],
  ["Kopi", 38000, "debit"],
  ["Dividen investasi", 620000, "credit"],
  ["Nonton bioskop", 100000, "debit"],
  ["Belanja groceries", 540000, "debit"],
  ["Bonus proyek", 1500000, "credit"],
  ["Bensin", 150000, "debit"],
  ["Langganan streaming", 65000, "debit"],
  ["Makan malam", 220000, "debit"],
  ["Penjualan barang bekas", 480000, "credit"],
  ["Obat & kesehatan", 175000, "debit"],
  ["Donasi", 200000, "debit"],
]

const insert = db.prepare(
  `INSERT INTO transactions (user_id, google_email, date, amount, description, type, balance_after)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
)

let balance = 0
const today = new Date()
const tx = db.transaction(() => {
  sample.forEach((row, i) => {
    const [description, amount, type] = row
    // Spread across the last ~40 days
    const d = new Date(today)
    d.setDate(today.getDate() - (sample.length - i) * 2)
    const dateStr = d.toISOString().slice(0, 10)
    balance += type === "credit" ? amount : -amount
    insert.run(DEMO_USER_ID, DEMO_EMAIL, dateStr, amount, description, type, balance)
  })
})
tx()

console.log(`Seeded ${sample.length} transactions for ${DEMO_EMAIL} into ${dbPath}`)
db.close()
