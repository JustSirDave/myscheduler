import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPlannerItem } from "../actions";
import { ItemForm } from "../_components/item-form";

export const dynamic = "force-dynamic";

// Landing for "click a date on the calendar to create". Prefills the Start/time
// from ?date=YYYY-MM-DD (&time=HH:mm optional).
export default async function NewPlannerItemPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const { date, time } = await searchParams;

  const goals = await prisma.plannerItem.findMany({
    where: { type: "Goal" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : "";
  const validTime = /^\d{2}:\d{2}$/.test(time ?? "") ? time! : "09:00";
  const startAt = validDate ? `${validDate}T${validTime}` : "";

  return (
    <main className="space-y-6">
      <div>
        <Link
          href="/calendar"
          className="text-sm text-black/50 underline-offset-4 hover:underline dark:text-white/50"
        >
          ← Back to calendar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New item</h1>
      </div>

      <ItemForm action={createPlannerItem} goals={goals} submitLabel="Create" values={{ startAt }} />
    </main>
  );
}
