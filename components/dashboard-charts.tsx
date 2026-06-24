"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCompact, formatCurrency, formatDate } from "@/lib/format"

interface DailyPoint {
  date: string
  credit: number
  debit: number
  balance: number
}

interface Category {
  name: string
  value: number
}

const CATEGORY_COLORS = [
  "oklch(0.72 0.13 180)",
  "oklch(0.72 0.15 162)",
  "oklch(0.7 0.13 220)",
  "oklch(0.75 0.14 90)",
  "oklch(0.7 0.12 300)",
  "oklch(0.68 0.13 30)",
]

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-64">{children}</div>
    </div>
  )
}

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-popover-foreground">{formatDate(String(label))}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-medium text-popover-foreground tabular-nums">
            {formatCurrency(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  )
}

export function BalanceChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Balance Over Time" subtitle="Running balance after each day">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.13 180)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="oklch(0.72 0.13 180)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.006 240)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v).slice(0, 6)}
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(Number(v))}
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<TooltipBox />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="oklch(0.72 0.13 180)"
            strokeWidth={2}
            fill="url(#balanceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function FlowChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Credit vs Debit" subtitle="Daily money in and out">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.006 240)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v).slice(0, 6)}
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(Number(v))}
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.27 0.006 240)", opacity: 0.4 }} />
          <Bar dataKey="credit" fill="oklch(0.72 0.15 162)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="debit" fill="oklch(0.62 0.2 18)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CategoryChart({ data }: { data: Category[] }) {
  return (
    <ChartCard title="Top Spending" subtitle="Largest debit categories">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.006 240)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCompact(Number(v))}
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "oklch(0.68 0.01 240)" }}
            tickLine={false}
            axisLine={false}
            width={96}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.27 0.006 240)", opacity: 0.4 }} />
          <Bar dataKey="value" name="spent" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
