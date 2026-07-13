import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatKobo } from "@/lib/money";
import { currentMonthString, monthRange } from "@/lib/dates";
import {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  addDays,
  isSameDay,
  monthGridDays,
  startOfDay,
  toDateParam,
} from "@/lib/calendar";
import { APP_TZ, watYear, watMonth, watDate } from "@/lib/tz";

export const dynamic = "force-dynamic";

function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Home() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);

  const grid = monthGridDays(now);
  const gridStart = grid[0];
  const gridEnd = addDays(grid[41], 1);
  const { start: monthStart, end: monthEnd } = monthRange(currentMonthString());

  const [todayItemsAll, monthItems, spend, income] = await Promise.all([
    prisma.plannerItem.findMany({
      where: { startAt: { gte: todayStart, lt: todayEnd } },
      orderBy: [{ isAllDay: "desc" }, { startAt: "asc" }],
      select: { id: true, name: true, type: true, isAllDay: true, startAt: true },
    }),
    prisma.plannerItem.findMany({
      where: { startAt: { gte: gridStart, lt: gridEnd } },
      select: { startAt: true },
    }),
    prisma.expense.aggregate({
      _sum: { amountKobo: true },
      where: { type: "Expense", date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.expense.aggregate({
      _sum: { amountKobo: true },
      where: { type: "Income", date: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  // Agenda shows all-day items plus timed items still upcoming today — drop the
  // ones whose time has already passed so it isn't cluttered with stale entries.
  const todayItems = todayItemsAll.filter(
    (i) => i.isAllDay || !i.startAt || i.startAt.getTime() >= now.getTime(),
  );

  const daysWithItems = new Set(
    monthItems.map((i) => (i.startAt ? toDateParam(i.startAt) : "")),
  );

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {now.toLocaleDateString("en-GB", {
              timeZone: APP_TZ,
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-black/60 dark:text-white/60">
            Spent: <span className="font-medium text-red-600 dark:text-red-400">{formatKobo(spend._sum.amountKobo ?? 0)}</span>
          </span>
          <span className="text-black/60 dark:text-white/60">
            Income: <span className="font-medium text-green-600 dark:text-green-400">{formatKobo(income._sum.amountKobo ?? 0)}</span>
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today agenda */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-black/70 dark:text-white/70">Agenda</h2>
          {todayItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
              Nothing scheduled today.{" "}
              <Link href="/planner" className="underline underline-offset-4">
                Add something
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {todayItems.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/planner/${i.id}`}
                    className="flex items-center gap-3 p-3 transition hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span className="w-14 shrink-0 text-xs tabular-nums text-black/50 dark:text-white/50">
                      {i.isAllDay || !i.startAt ? "all-day" : timeLabel(i.startAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{i.name}</span>
                    <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] dark:bg-white/10">
                      {i.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mini month calendar */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
              {MONTH_LABELS[watMonth(now)]} {watYear(now)}
            </h2>
            <Link
              href="/calendar"
              className="text-xs text-black/50 underline-offset-4 hover:underline dark:text-white/50"
            >
              Open calendar →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <div className="grid grid-cols-7 border-b border-black/10 text-[10px] text-black/40 dark:border-white/10 dark:text-white/40">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-1 text-center">
                  {w[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                const inMonth = watMonth(day) === watMonth(now);
                const isToday = isSameDay(day, todayStart);
                const hasItems = daysWithItems.has(toDateParam(day));
                return (
                  <Link
                    key={idx}
                    href={`/calendar?view=week&date=${toDateParam(day)}`}
                    className={`flex aspect-square flex-col items-center justify-center border-b border-r border-black/[.06] text-xs transition last:border-r-0 hover:bg-black/5 dark:border-white/[.06] dark:hover:bg-white/5 ${
                      idx % 7 === 6 ? "border-r-0" : ""
                    } ${inMonth ? "" : "text-black/30 dark:text-white/30"}`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                        isToday ? "bg-foreground font-semibold text-background" : ""
                      }`}
                    >
                      {watDate(day)}
                    </span>
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        hasItems ? "bg-blue-500" : "bg-transparent"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
