import Link from "next/link";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import {
  PlannerItemType,
  Priority,
  Status,
} from "@/lib/generated/prisma/enums";
import {
  Field,
  EnumOptions,
  SubmitButton,
  controlClass,
} from "@/app/(app)/_components/form-controls";
import { createPlannerItem, deletePlannerItem } from "./actions";
import { StatusSelect } from "./_components/status-select";

export const dynamic = "force-dynamic";

const typeValues = Object.values(PlannerItemType);
const priorityValues = Object.values(Priority);
const statusValues = Object.values(Status);

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

  const items = await prisma.plannerItem.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: { linkedGoal: { select: { name: true } } },
  });

  return (
    <main className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Tasks, habits, time blocks, and goals.
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
        <form
          action={createPlannerItem}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <Field label="Name" htmlFor="name">
              <input id="name" name="name" required className={controlClass} />
            </Field>
          </div>
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" required defaultValue="Event" className={controlClass}>
              <EnumOptions values={typeValues} />
            </select>
          </Field>
          <Field label="Project" htmlFor="project">
            <input id="project" name="project" className={controlClass} />
          </Field>
          <Field label="Start" htmlFor="startAt" hint="Event/Alarm/Reminder need a time to sync to Google.">
            <input id="startAt" name="startAt" type="datetime-local" className={controlClass} />
          </Field>
          <Field label="End" htmlFor="endAt">
            <input id="endAt" name="endAt" type="datetime-local" className={controlClass} />
          </Field>
          <Field label="Remind (min before)" htmlFor="reminderMinutes">
            <input
              id="reminderMinutes"
              name="reminderMinutes"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 10"
              className={controlClass}
            />
          </Field>
          <Field label="Priority" htmlFor="priority">
            <select id="priority" name="priority" className={controlClass}>
              <EnumOptions values={priorityValues} blankLabel="—" />
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue="NotStarted" className={controlClass}>
              <EnumOptions values={statusValues} />
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <SubmitButton>Add item</SubmitButton>
          </div>
        </form>
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
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
              >
                <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  {item.type}
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
                <StatusSelect id={item.id} status={item.status} options={statusValues} />
                <Link
                  href={`/planner/${item.id}`}
                  className="rounded-md border border-black/15 px-2.5 py-1 text-xs transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  Edit
                </Link>
                <form action={deletePlannerItem}>
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
