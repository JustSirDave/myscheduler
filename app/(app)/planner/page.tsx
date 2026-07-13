import Link from "next/link";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import { PlannerItemType, Status } from "@/lib/generated/prisma/enums";
import {
  Field,
  EnumOptions,
  controlClass,
} from "@/app/(app)/_components/form-controls";
import { createPlannerItem, deletePlannerItem } from "./actions";
import { StatusSelect } from "./_components/status-select";
import { ItemForm } from "./_components/item-form";
import { DeleteButton } from "./_components/delete-button";

export const dynamic = "force-dynamic";

const typeValues = Object.values(PlannerItemType);
const statusValues = Object.values(Status);

const REMINDER_KIND_LABELS: Record<string, string> = {
  Event: "Event",
  Habit: "Habit",
  StartGoal: "Start goal",
  ContinueGoal: "Continue goal",
  General: "Reminder",
};

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; error?: string }>;
}) {
  const { type, status, error } = await searchParams;

  const where: Prisma.PlannerItemWhereInput = {};
  if (type && (typeValues as string[]).includes(type)) {
    where.type = type as (typeof typeValues)[number];
  }
  if (status && (statusValues as string[]).includes(status)) {
    where.status = status as (typeof statusValues)[number];
  }

  const [items, goals] = await Promise.all([
    prisma.plannerItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: { linkedGoal: { select: { name: true } } },
    }),
    prisma.plannerItem.findMany({
      where: { type: "Goal" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Reminders, alarms, tasks, and goals.
          </p>
        </div>
      </header>

      {/* Quick add */}
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="mb-3 text-sm font-medium">Quick add</h2>
        {error ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            Please provide at least a name and type.
          </p>
        ) : null}
        <ItemForm action={createPlannerItem} goals={goals} submitLabel="Add item" />
      </section>

      {/* Filters */}
      <section>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Field label="Filter by type" htmlFor="filter-type">
            <select id="filter-type" name="type" defaultValue={type ?? ""} className={controlClass}>
              <EnumOptions values={typeValues} blankLabel="All types" />
            </select>
          </Field>
          <Field label="Filter by status" htmlFor="filter-status">
            <select id="filter-status" name="status" defaultValue={status ?? ""} className={controlClass}>
              <EnumOptions values={statusValues} blankLabel="All statuses" />
            </select>
          </Field>
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Apply
          </button>
          {type || status ? (
            <Link
              href="/planner"
              className="px-2 py-2 text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      {/* List */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
          {items.length} item{items.length === 1 ? "" : "s"}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            Nothing here yet. Add your first item above.
          </p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {items.map((item) => {
              const badge =
                item.type === "Reminder" && item.reminderKind
                  ? (REMINDER_KIND_LABELS[item.reminderKind] ?? "Reminder")
                  : item.type;
              const showStatus = item.type === "Task" || item.type === "Goal";
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {badge}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="truncate text-xs text-black/50 dark:text-white/50">
                      {[
                        item.project,
                        item.priority,
                        item.linkedGoal ? `↳ ${item.linkedGoal.name}` : null,
                        formatDateTime(item.startAt),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </div>
                  </div>
                  {showStatus ? (
                    <StatusSelect id={item.id} status={item.status} options={statusValues} />
                  ) : null}
                  <Link
                    href={`/planner/${item.id}`}
                    className="rounded-md border border-black/15 px-2.5 py-1 text-xs transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                  >
                    Edit
                  </Link>
                  <DeleteButton action={deletePlannerItem} id={item.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
