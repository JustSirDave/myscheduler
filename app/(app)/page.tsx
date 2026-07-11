import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKobo } from "@/lib/money";
import { currentMonthString, monthRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

type DashboardData =
  | {
      ok: true;
      plannerItems: number;
      expenses: number;
      monthSpendKobo: number;
      monthIncomeKobo: number;
    }
  | { ok: false; error: string };

async function loadDashboard(): Promise<DashboardData> {
  try {
    const { start, end } = monthRange(currentMonthString());
    const [plannerItems, expenses, spend, income] = await Promise.all([
      prisma.plannerItem.count(),
      prisma.expense.count(),
      prisma.expense.aggregate({
        _sum: { amountKobo: true },
        where: { type: "Expense", date: { gte: start, lt: end } },
      }),
      prisma.expense.aggregate({
        _sum: { amountKobo: true },
        where: { type: "Income", date: { gte: start, lt: end } },
      }),
    ]);
    return {
      ok: true,
      plannerItems,
      expenses,
      monthSpendKobo: spend._sum.amountKobo ?? 0,
      monthIncomeKobo: income._sum.amountKobo ?? 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export default async function Home() {
  const data = await loadDashboard();

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Your planner and expenses at a glance.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              data.ok ? "bg-green-500" : "bg-red-500"
            }`}
            aria-hidden
          />
          <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
            {data.ok ? "Connected to Postgres" : "Database unreachable"}
          </h2>
        </div>

        {data.ok ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Planner items" value={String(data.plannerItems)} />
            <Stat label="Expense records" value={String(data.expenses)} />
            <Stat label="Spent this month" value={formatKobo(data.monthSpendKobo)} />
            <Stat label="Income this month" value={formatKobo(data.monthIncomeKobo)} />
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">Could not read from the database.</p>
            <p className="mt-1 break-words font-mono text-xs opacity-80">{data.error}</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          href="/planner"
          title="Planner →"
          body="Tasks, habits, time blocks, and goals. Create, edit, and track status."
        />
        <QuickLink
          href="/expenses"
          title="Expenses →"
          body="Log naira expenses and income. Filter totals by month, category, and project."
        />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-black/60 dark:text-white/60">{label}</div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-black/10 p-5 transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
    >
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">{body}</p>
    </Link>
  );
}
