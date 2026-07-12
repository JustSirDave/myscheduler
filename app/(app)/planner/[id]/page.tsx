import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDateTimeInputValue } from "@/lib/dates";
import {
  PlannerItemType,
  Horizon,
  Priority,
  Status,
} from "@/lib/generated/prisma/enums";
import {
  Field,
  EnumOptions,
  SubmitButton,
  controlClass,
} from "@/app/(app)/_components/form-controls";
import { updatePlannerItem, deletePlannerItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPlannerItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item, goals] = await Promise.all([
    prisma.plannerItem.findUnique({ where: { id } }),
    prisma.plannerItem.findMany({
      where: { type: "Goal", id: { not: id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!item) notFound();

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/planner"
          className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
        >
          ← Back to planner
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit item</h1>
      </div>

      <form action={updatePlannerItem} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={item.id} />

        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" required defaultValue={item.name} className={controlClass} />
          </Field>
        </div>

        <Field label="Type" htmlFor="type">
          <select id="type" name="type" required defaultValue={item.type} className={controlClass}>
            <EnumOptions values={Object.values(PlannerItemType)} />
          </select>
        </Field>
        <Field label="Project" htmlFor="project">
          <input id="project" name="project" defaultValue={item.project ?? ""} className={controlClass} />
        </Field>

        <Field label="Start" htmlFor="startAt">
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={toDateTimeInputValue(item.startAt)}
            className={controlClass}
          />
        </Field>
        <Field label="End" htmlFor="endAt">
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toDateTimeInputValue(item.endAt)}
            className={controlClass}
          />
        </Field>

        <Field label="Horizon" htmlFor="horizon">
          <select id="horizon" name="horizon" defaultValue={item.horizon ?? ""} className={controlClass}>
            <EnumOptions values={Object.values(Horizon)} blankLabel="—" />
          </select>
        </Field>
        <Field label="Priority" htmlFor="priority">
          <select id="priority" name="priority" defaultValue={item.priority ?? ""} className={controlClass}>
            <EnumOptions values={Object.values(Priority)} blankLabel="—" />
          </select>
        </Field>

        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={item.status} className={controlClass}>
            <EnumOptions values={Object.values(Status)} />
          </select>
        </Field>
        <Field label="Linked goal" htmlFor="linkedGoalId" hint="Ladder this item up to a goal.">
          <select
            id="linkedGoalId"
            name="linkedGoalId"
            defaultValue={item.linkedGoalId ?? ""}
            className={controlClass}
          >
            <option value="">— None —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Remind (min before)"
          htmlFor="reminderMinutes"
          hint="Popup notification on the Google event (Event/Alarm/Reminder)."
        >
          <input
            id="reminderMinutes"
            name="reminderMinutes"
            type="number"
            min="0"
            step="1"
            defaultValue={item.reminderMinutes ?? ""}
            placeholder="e.g. 10"
            className={controlClass}
          />
        </Field>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="isAllDay"
            defaultChecked={item.isAllDay}
            className="h-4 w-4"
          />
          <span className="text-sm">All day</span>
        </label>

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
            href="/planner"
            className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form action={deletePlannerItem} className="border-t border-black/10 pt-4 dark:border-white/10">
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
        >
          Delete this item
        </button>
      </form>
    </main>
  );
}
