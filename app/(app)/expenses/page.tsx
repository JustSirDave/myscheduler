import Link from "next/link";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatKobo } from "@/lib/money";
import { currentMonthString, monthRange, toDateInputValue } from "@/lib/dates";
import { APP_TZ } from "@/lib/tz";
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
import { createExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

const categoryValues = Object.values(ExpenseCategory);
const typeValues = Object.values(ExpenseType);
const paymentValues = Object.values(PaymentMethod);

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    category?: string;
    project?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonthString();
  const { start, end } = monthRange(month);

  const where: Prisma.ExpenseWhereInput = { date: { gte: start, lt: end } };
  if (sp.category && (categoryValues as string[]).includes(sp.category)) {
    where.category = sp.category as (typeof categoryValues)[number];
  }
  if (sp.project) {
    where.project = sp.project;
  }

  const items = await prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const incomeKobo = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + i.amountKobo, 0);
  const expenseKobo = items
    .filter((i) => i.type === "Expense")
    .reduce((sum, i) => sum + i.amountKobo, 0);
  const netKobo = incomeKobo - expenseKobo;

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Log naira expenses and income. Amounts are stored to the kobo.
        </p>
      </header>

      {/* Totals */}
      <section className="grid grid-cols-3 gap-4">
        <Total label="Income" value={formatKobo(incomeKobo)} tone="green" />
        <Total label="Expense" value={formatKobo(expenseKobo)} tone="red" />
        <Total label="Net" value={formatKobo(netKobo)} tone={netKobo < 0 ? "red" : "green"} />
      </section>

      {/* Quick add */}
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="mb-3 text-sm font-medium">Quick add</h2>
        {sp.error ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            Check the fields — name, a valid amount, and the selects are required.
          </p>
        ) : null}
        <form action={createExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" required className={controlClass} />
          </Field>
          <Field label="Amount (₦)" htmlFor="amount">
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className={controlClass}
            />
          </Field>
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="Expense" className={controlClass}>
              <EnumOptions values={typeValues} />
            </select>
          </Field>
          <Field label="Category" htmlFor="category">
            <select id="category" name="category" defaultValue="Other" className={controlClass}>
              <EnumOptions values={categoryValues} />
            </select>
          </Field>
          <Field label="Payment method" htmlFor="paymentMethod">
            <select id="paymentMethod" name="paymentMethod" defaultValue="Cash" className={controlClass}>
              <EnumOptions values={paymentValues} />
            </select>
          </Field>
          <Field label="Date" htmlFor="date">
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              className={controlClass}
            />
          </Field>
          <Field label="Project" htmlFor="project">
            <input id="project" name="project" className={controlClass} />
          </Field>
          <div className="flex items-end lg:col-span-2">
            <SubmitButton>Add expense</SubmitButton>
          </div>
        </form>
      </section>

      {/* Filters */}
      <section>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Field label="Month" htmlFor="filter-month">
            <input id="filter-month" name="month" type="month" defaultValue={month} className={controlClass} />
          </Field>
          <Field label="Category" htmlFor="filter-category">
            <select id="filter-category" name="category" defaultValue={sp.category ?? ""} className={controlClass}>
              <EnumOptions values={categoryValues} blankLabel="All categories" />
            </select>
          </Field>
          <Field label="Project" htmlFor="filter-project">
            <input id="filter-project" name="project" defaultValue={sp.project ?? ""} placeholder="Any" className={controlClass} />
          </Field>
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Apply
          </button>
          <Link
            href="/expenses"
            className="px-2 py-2 text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
          >
            Reset
          </Link>
        </form>
      </section>

      {/* List */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
          {items.length} record{items.length === 1 ? "" : "s"} · {month}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            No records for this filter. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="truncate text-xs text-black/50 dark:text-white/50">
                    {[
                      item.category,
                      item.paymentMethod,
                      item.project,
                      item.date.toLocaleDateString("en-GB", {
                        timeZone: APP_TZ,
                        day: "2-digit",
                        month: "short",
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span
                  className={`font-medium tabular-nums ${
                    item.type === "Income"
                      ? "text-green-600 dark:text-green-400"
                      : "text-black/80 dark:text-white/80"
                  }`}
                >
                  {item.type === "Income" ? "+" : "−"}
                  {formatKobo(item.amountKobo)}
                </span>
                <Link
                  href={`/expenses/${item.id}`}
                  className="rounded-md border border-black/15 px-2.5 py-1 text-xs transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  Edit
                </Link>
                <form action={deleteExpense}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "green"
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
