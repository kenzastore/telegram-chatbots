"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Pencil, Search, Trash2, X } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { deleteTransactionAction, updateTransactionAction } from "@/app/actions"
import type { Transaction } from "@/lib/db"

type Filter = "all" | "credit" | "debit"

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false
      if (query && !t.description.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [transactions, query, filter])

  function handleDelete(id: number) {
    if (!confirm("Delete this transaction? Balances will be recalculated.")) return
    setError(null)
    const fd = new FormData()
    fd.set("id", String(id))
    startTransition(async () => {
      const res = await deleteTransactionAction(fd)
      if (!res.ok) setError(res.error || "Failed to delete.")
      else router.refresh()
    })
  }

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await updateTransactionAction(formData)
      if (!res.ok) {
        setError(res.error || "Failed to update.")
      } else {
        setEditing(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Transactions</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} shown</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description..."
              className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:w-56"
            />
          </div>
          <div className="flex rounded-lg border border-border bg-secondary p-0.5">
            {(["all", "credit", "debit"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium">{t.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.type === "credit"
                          ? "bg-positive/10 text-positive"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {t.type === "credit" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3" />
                      )}
                      {t.type}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                      t.type === "credit" ? "text-positive" : "text-destructive"
                    }`}
                  >
                    {t.type === "credit" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(t.balance_after)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setError(null)
                          setEditing(t)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={pending}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDialog
          tx={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  )
}

function EditDialog({
  tx,
  pending,
  onClose,
  onSubmit,
}: {
  tx: Transaction
  pending: boolean
  onClose: () => void
  onSubmit: (fd: FormData) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Edit Transaction</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={tx.id} />
          <div>
            <label htmlFor="date" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={tx.date.slice(0, 10)}
              required
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              defaultValue={tx.description}
              required
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Amount
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="any"
                defaultValue={tx.amount}
                required
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={tx.type}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
