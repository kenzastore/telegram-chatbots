export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(value: string): string {
  // Stored as YYYY-MM-DD (or ISO). Render a friendly, locale-aware date.
  const d = new Date(value.length > 10 ? value : `${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}
