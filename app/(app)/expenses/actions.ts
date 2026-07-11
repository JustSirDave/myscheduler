"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { parseDateInput } from "@/lib/dates";
import { nairaToKobo } from "@/lib/money";
import {
  ExpenseType,
  ExpenseCategory,
  PaymentMethod,
} from "@/lib/generated/prisma/enums";

function str(v: FormDataEntryValue | null): string {
  return v == null ? "" : String(v).trim();
}

function nullableStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

function oneOf<T extends string>(
  enumObj: Record<string, T>,
  v: FormDataEntryValue | null,
): T | null {
  const s = str(v);
  return (Object.values(enumObj) as string[]).includes(s) ? (s as T) : null;
}

function parseExpenseData(formData: FormData) {
  const name = str(formData.get("name"));
  const type = oneOf(ExpenseType, formData.get("type"));
  const category = oneOf(ExpenseCategory, formData.get("category"));
  const paymentMethod = oneOf(PaymentMethod, formData.get("paymentMethod"));
  if (!name || !type || !category || !paymentMethod) return null;

  let amountKobo: number;
  try {
    amountKobo = nairaToKobo(str(formData.get("amount")));
  } catch {
    return null;
  }

  return {
    name,
    type,
    amountKobo,
    category,
    project: nullableStr(formData.get("project")),
    paymentMethod,
    date: parseDateInput(formData.get("date")) ?? new Date(),
    notes: nullableStr(formData.get("notes")),
  };
}

export async function createExpense(formData: FormData) {
  await requireSession();
  const data = parseExpenseData(formData);
  if (!data) redirect("/expenses?error=invalid");

  await prisma.expense.create({ data });
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}

export async function updateExpense(formData: FormData) {
  await requireSession();
  const id = str(formData.get("id"));
  const data = parseExpenseData(formData);
  if (!id || !data) redirect(`/expenses/${id}?error=invalid`);

  await prisma.expense.update({ where: { id }, data });
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/");
  redirect("/expenses");
}

export async function deleteExpense(formData: FormData) {
  await requireSession();
  const id = str(formData.get("id"));
  if (id) {
    await prisma.expense.delete({ where: { id } });
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}
