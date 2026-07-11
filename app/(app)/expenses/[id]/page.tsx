import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { koboToNairaInput } from "@/lib/money";
import { toDateInputValue } from "@/lib/dates";
import {
  ExpenseType,
  ExpenseCategory,
  PaymentMethod,
} from "@/lib/generated/prisma/enums";
import {
  Field,
  EnumOptions,
  SubmitButton,
  controlClass,
} from "@/app/(app)/_components/form-controls";
import { updateExpense, deleteExpense } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.expense.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/expenses"
          className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
        >
          ← Back to expenses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit record</h1>
      </div>

      <form action={updateExpense} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={item.id} />

        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" required defaultValue={item.name} className={controlClass} />
          </Field>
        </div>

        <Field label="Amount (₦)" htmlFor="amount">
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={koboToNairaInput(item.amountKobo)}
            className={controlClass}
          />
        </Field>
        <Field label="Type" htmlFor="type">
          <select id="type" name="type" defaultValue={item.type} className={controlClass}>
            <EnumOptions values={Object.values(ExpenseType)} />
          </select>
        </Field>

        <Field label="Category" htmlFor="category">
          <select id="category" name="category" defaultValue={item.category} className={controlClass}>
            <EnumOptions values={Object.values(ExpenseCategory)} />
          </select>
        </Field>
        <Field label="Payment method" htmlFor="paymentMethod">
          <select id="paymentMethod" name="paymentMethod" defaultValue={item.paymentMethod} className={controlClass}>
            <EnumOptions values={Object.values(PaymentMethod)} />
          </select>
        </Field>

        <Field label="Date" htmlFor="date">
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={toDateInputValue(item.date)}
            className={controlClass}
          />
        </Field>
        <Field label="Project" htmlFor="project">
          <input id="project" name="project" defaultValue={item.project ?? ""} className={controlClass} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={item.notes ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <SubmitButton>Save changes</SubmitButton>
          <Link
            href="/expenses"
            className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form action={deleteExpense} className="border-t border-black/10 pt-4 dark:border-white/10">
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
        >
          Delete this record
        </button>
      </form>
    </main>
  );
}
