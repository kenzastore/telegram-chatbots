import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getCategoryBreakdown,
  getDailySeries,
  getSummary,
  getTransactions,
} from "@/lib/db"
import { Header } from "@/components/header"
import { SummaryCards } from "@/components/summary-cards"
import { BalanceChart, CategoryChart, FlowChart } from "@/components/dashboard-charts"
import { TransactionsTable } from "@/components/transactions-table"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) {
    redirect("/login")
  }

  const summary = getSummary(email)
  const transactions = getTransactions(email)
  const daily = getDailySeries(email)
  const categories = getCategoryBreakdown(email)

  return (
    <div className="min-h-screen">
      <Header email={email} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-balance">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your finance bot activity, all in one place.
          </p>
        </div>

        <SummaryCards summary={summary} />

        {transactions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Add transactions through your Telegram finance bot and they will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BalanceChart data={daily} />
              <FlowChart data={daily} />
            </div>
            <CategoryChart data={categories} />
            <TransactionsTable transactions={transactions} />
          </>
        )}
      </main>
    </div>
  )
}
