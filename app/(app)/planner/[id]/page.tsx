import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toDateTimeInputValue, toDateInputValue } from "@/lib/dates";
import { updatePlannerItem, deletePlannerItem } from "../actions";
import { ItemForm } from "../_components/item-form";
import { DeleteButton } from "../_components/delete-button";

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

      <ItemForm
        action={updatePlannerItem}
        goals={goals}
        submitLabel="Save changes"
        values={{
          id: item.id,
          type: item.type,
          name: item.name,
          reminderKind: item.reminderKind ?? undefined,
          project: item.project ?? "",
          startAt: toDateTimeInputValue(item.startAt),
          endAt: toDateTimeInputValue(item.endAt),
          isAllDay: item.isAllDay,
          horizon: item.horizon ?? "",
          priority: item.priority ?? "",
          status: item.status,
          notes: item.notes ?? "",
          reminderMinutes: item.reminderMinutes != null ? String(item.reminderMinutes) : "",
          targetDate: toDateInputValue(item.targetDate),
          linkedGoalId: item.linkedGoalId ?? "",
        }}
      />

      <div className="border-t border-black/10 pt-4 dark:border-white/10">
        <DeleteButton action={deletePlannerItem} id={item.id} label="Delete this item" size="md" />
      </div>
    </main>
  );
}
