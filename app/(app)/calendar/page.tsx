import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  WEEKDAY_LABELS,
  MONTH_LABELS,
  addDays,
  addMonths,
  isSameDay,
  minutesSinceMidnight,
  monthGridDays,
  parseDateParam,
  startOfDay,
  startOfWeek,
  toDateParam,
  weekDays,
} from "@/lib/calendar";
import { APP_TZ, watYear, watMonth, watDate, watDay } from "@/lib/tz";

export const dynamic = "force-dynamic";

type View = "month" | "week";

type CalItem = {
  id: string;
  name: string;
  type: string;
  isAllDay: boolean;
  startAt: Date | null;
  endAt: Date | null;
};

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_PX = 44;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const view: View = sp.view === "week" ? "week" : "month";
  const cursor = parseDateParam(sp.date);

  const [rangeStart, rangeEnd] =
    view === "month"
      ? monthRange(cursor)
      : [startOfWeek(cursor), addDays(startOfWeek(cursor), 7)];

  const items = (await prisma.plannerItem.findMany({
    where: { startAt: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { startAt: "asc" },
    select: { id: true, name: true, type: true, isAllDay: true, startAt: true, endAt: true },
  })) as CalItem[];

  const prevHref = navHref(view, view === "month" ? addMonths(cursor, -1) : addDays(cursor, -7));
  const nextHref = navHref(view, view === "month" ? addMonths(cursor, 1) : addDays(cursor, 7));
  const todayHref = navHref(view, new Date());

  const label =
    view === "month"
      ? `${MONTH_LABELS[watMonth(cursor)]} ${watYear(cursor)}`
      : weekLabel(cursor);

  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-black/15 text-sm dark:border-white/15">
            <ViewTab active={view === "month"} href={navHref("month", cursor)} label="Month" />
            <ViewTab active={view === "week"} href={navHref("week", cursor)} label="Week" />
          </div>
          <div className="flex items-center gap-1">
            <NavBtn href={prevHref} label="‹" />
            <Link
              href={todayHref}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Today
            </Link>
            <NavBtn href={nextHref} label="›" />
          </div>
        </div>
      </header>

      {view === "month" ? (
        <MonthGrid cursor={cursor} items={items} />
      ) : (
        <WeekGrid cursor={cursor} items={items} />
      )}
    </main>
  );
}

function monthRange(cursor: Date): [Date, Date] {
  const grid = monthGridDays(cursor);
  return [grid[0], addDays(grid[41], 1)];
}

function navHref(view: View, date: Date): string {
  return `/calendar?view=${view}&date=${toDateParam(date)}`;
}

function weekLabel(cursor: Date): string {
  const days = weekDays(cursor);
  const a = days[0];
  const b = days[6];
  const fmt = (d: Date) => `${MONTH_LABELS[watMonth(d)].slice(0, 3)} ${watDate(d)}`;
  return `${fmt(a)} – ${fmt(b)}, ${watYear(b)}`;
}

function ViewTab({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 transition ${
        active ? "bg-black/10 font-medium dark:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );
}

function NavBtn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-black/15 px-3 py-1.5 text-sm leading-none transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      aria-label={label === "‹" ? "Previous" : "Next"}
    >
      {label}
    </Link>
  );
}

function itemsForDay(items: CalItem[], day: Date): CalItem[] {
  return items.filter((i) => i.startAt && isSameDay(i.startAt, day));
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Month
// ---------------------------------------------------------------------------

function MonthGrid({ cursor, items }: { cursor: Date; items: CalItem[] }) {
  const days = monthGridDays(cursor);
  const today = startOfDay(new Date());
  const currentMonth = watMonth(cursor);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      <div className="grid grid-cols-7 border-b border-black/10 text-xs font-medium text-black/50 dark:border-white/10 dark:text-white/50">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="px-2 py-2 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayItems = itemsForDay(items, day);
          const inMonth = watMonth(day) === currentMonth;
          const isToday = isSameDay(day, today);
          return (
            <div
              key={idx}
              className={`min-h-24 border-b border-r border-black/10 p-1.5 dark:border-white/10 ${
                inMonth ? "" : "bg-black/[.02] dark:bg-white/[.02]"
              } ${idx % 7 === 6 ? "border-r-0" : ""}`}
            >
              <div
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-foreground font-semibold text-background"
                    : inMonth
                      ? "text-black/70 dark:text-white/70"
                      : "text-black/35 dark:text-white/35"
                }`}
              >
                {watDate(day)}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((i) => (
                  <Link
                    key={i.id}
                    href={`/planner/${i.id}`}
                    className="block truncate rounded bg-black/5 px-1.5 py-0.5 text-[11px] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                    title={i.name}
                  >
                    {!i.isAllDay && i.startAt ? (
                      <span className="tabular-nums opacity-60">{timeLabel(i.startAt)} </span>
                    ) : null}
                    {i.name}
                  </Link>
                ))}
                {dayItems.length > 3 ? (
                  <div className="px-1.5 text-[11px] text-black/40 dark:text-white/40">
                    +{dayItems.length - 3} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week
// ---------------------------------------------------------------------------

function WeekGrid({ cursor, items }: { cursor: Date; items: CalItem[] }) {
  const days = weekDays(cursor);
  const today = startOfDay(new Date());
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-black/10 dark:border-white/10">
          <div />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="border-l border-black/10 px-1 py-2 text-center dark:border-white/10">
                <div className="text-[11px] text-black/50 dark:text-white/50">
                  {WEEKDAY_LABELS[(watDay(day) + 6) % 7]}
                </div>
                <div
                  className={`mx-auto mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-foreground font-semibold text-background" : ""
                  }`}
                >
                  {watDate(day)}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-black/10 dark:border-white/10">
          <div className="px-1 py-1 text-right text-[10px] text-black/40 dark:text-white/40">all-day</div>
          {days.map((day) => {
            const allDay = itemsForDay(items, day).filter((i) => i.isAllDay);
            return (
              <div key={day.toISOString()} className="min-h-8 space-y-0.5 border-l border-black/10 p-1 dark:border-white/10">
                {allDay.map((i) => (
                  <Link
                    key={i.id}
                    href={`/planner/${i.id}`}
                    className="block truncate rounded bg-black/5 px-1 py-0.5 text-[11px] hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    {i.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        {/* Hour grid */}
        <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.slice(0, -1).map((h, i) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-black/40 dark:text-white/40"
                style={{ top: i * HOUR_PX }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((day) => {
            const timed = itemsForDay(items, day).filter((i) => !i.isAllDay && i.startAt);
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-black/10 dark:border-white/10"
                style={{ height: gridHeight }}
              >
                {/* hour lines */}
                {hours.slice(1).map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-black/[.06] dark:border-white/[.06]"
                    style={{ top: (i + 1) * HOUR_PX }}
                  />
                ))}
                {timed.map((i) => (
                  <WeekEvent key={i.id} item={i} gridHeight={gridHeight} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekEvent({ item, gridHeight }: { item: CalItem; gridHeight: number }) {
  const start = item.startAt!;
  const startMin = minutesSinceMidnight(start);
  const rangeStartMin = DAY_START_HOUR * 60;
  const top = Math.max(0, ((startMin - rangeStartMin) / 60) * HOUR_PX);

  const endMin = item.endAt ? minutesSinceMidnight(item.endAt) : startMin + 60;
  const durationMin = Math.max(30, endMin - startMin);
  const height = Math.min(gridHeight - top, (durationMin / 60) * HOUR_PX);

  return (
    <Link
      href={`/planner/${item.id}`}
      className="absolute inset-x-1 overflow-hidden rounded-md border border-black/10 bg-blue-500/15 px-1.5 py-0.5 text-[11px] leading-tight hover:bg-blue-500/25 dark:border-white/10"
      style={{ top, height }}
      title={`${item.name} · ${timeLabel(start)}`}
    >
      <div className="tabular-nums opacity-70">{timeLabel(start)}</div>
      <div className="truncate font-medium">{item.name}</div>
    </Link>
  );
}
