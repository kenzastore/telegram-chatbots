import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { Summary } from "@/lib/db"

export function SummaryCards({ summary }: { summary: Summary }) {
  const net = summary.monthCredit - summary.monthDebit
  const cards = [
    {
      label: "Current Balance",
      value: formatCurrency(summary.balance),
      icon: Wallet,
      tone: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Credit",
      value: formatCurrency(summary.totalCredit),
      icon: ArrowUpRight,
      tone: "text-positive",
      bg: "bg-positive/10",
    },
    {
      label: "Total Debit",
      value: formatCurrency(summary.totalDebit),
      icon: ArrowDownLeft,
      tone: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "This Month (net)",
      value: formatCurrency(net),
      icon: Receipt,
      tone: net >= 0 ? "text-positive" : "text-destructive",
      bg: net >= 0 ? "bg-positive/10" : "bg-destructive/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.tone}`}>
              <c.icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</p>
        </div>
      ))}
      <div className="sr-only" aria-hidden="false">
        {summary.count} total transactions
      </div>
    </div>
  )
}
