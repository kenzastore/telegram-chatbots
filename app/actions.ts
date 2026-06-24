"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { deleteTransaction, updateTransaction, type TxType } from "@/lib/db"

async function requireEmail(): Promise<string> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("Not authenticated")
  return email
}

export async function updateTransactionAction(formData: FormData) {
  const email = await requireEmail()
  const id = Number(formData.get("id"))
  const date = String(formData.get("date") || "")
  const amount = Number(formData.get("amount"))
  const description = String(formData.get("description") || "").trim()
  const type = String(formData.get("type") || "") as TxType

  if (!id || !date || !description || Number.isNaN(amount) || amount <= 0) {
    return { ok: false, error: "Please provide a valid date, description, and positive amount." }
  }
  if (type !== "credit" && type !== "debit") {
    return { ok: false, error: "Type must be credit or debit." }
  }

  const ok = updateTransaction(email, id, { date, amount, description, type })
  if (!ok) return { ok: false, error: "Transaction not found." }
  revalidatePath("/")
  return { ok: true }
}

export async function deleteTransactionAction(formData: FormData) {
  const email = await requireEmail()
  const id = Number(formData.get("id"))
  if (!id) return { ok: false, error: "Invalid transaction." }
  const ok = deleteTransaction(email, id)
  if (!ok) return { ok: false, error: "Transaction not found." }
  revalidatePath("/")
  return { ok: true }
}
