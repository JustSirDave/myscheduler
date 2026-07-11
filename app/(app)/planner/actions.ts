"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { parseDateInput } from "@/lib/dates";
import {
  PlannerItemType,
  Horizon,
  Priority,
  Status,
} from "@/lib/generated/prisma/enums";

function str(v: FormDataEntryValue | null): string {
  return v == null ? "" : String(v).trim();
}

function nullableStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

function oneOf<T extends string>(
  enumObj: Record<string, T>,
  v: FormDataEntryValue | null,
): T | null {
  const s = str(v);
  return (Object.values(enumObj) as string[]).includes(s) ? (s as T) : null;
}

function parsePlannerData(formData: FormData) {
  const name = str(formData.get("name"));
  const type = oneOf(PlannerItemType, formData.get("type"));
  if (!name || !type) return null;

  return {
    name,
    type,
    project: nullableStr(formData.get("project")),
    startAt: parseDateInput(formData.get("startAt")),
    endAt: parseDateInput(formData.get("endAt")),
    isAllDay: formData.get("isAllDay") != null,
    horizon: oneOf(Horizon, formData.get("horizon")),
    priority: oneOf(Priority, formData.get("priority")),
    status: oneOf(Status, formData.get("status")) ?? Status.NotStarted,
    notes: nullableStr(formData.get("notes")),
    linkedGoalId: nullableStr(formData.get("linkedGoalId")),
  };
}

export async function createPlannerItem(formData: FormData) {
  await requireSession();
  const data = parsePlannerData(formData);
  if (!data) redirect("/planner?error=invalid");

  await prisma.plannerItem.create({ data });
  revalidatePath("/planner");
  revalidatePath("/");
  redirect("/planner");
}

export async function updatePlannerItem(formData: FormData) {
  await requireSession();
  const id = str(formData.get("id"));
  const data = parsePlannerData(formData);
  if (!id || !data) redirect(`/planner/${id}?error=invalid`);

  // Guard against linking an item to itself.
  if (data.linkedGoalId === id) data.linkedGoalId = null;

  await prisma.plannerItem.update({ where: { id }, data });
  revalidatePath("/planner");
  revalidatePath(`/planner/${id}`);
  revalidatePath("/");
  redirect("/planner");
}

export async function deletePlannerItem(formData: FormData) {
  await requireSession();
  const id = str(formData.get("id"));
  if (id) {
    // Children linked to this (if it's a goal) have linkedGoalId set null via
    // the schema's onDelete: SetNull.
    await prisma.plannerItem.delete({ where: { id } });
  }
  revalidatePath("/planner");
  revalidatePath("/");
  redirect("/planner");
}

export async function setPlannerStatus(formData: FormData) {
  await requireSession();
  const id = str(formData.get("id"));
  const status = oneOf(Status, formData.get("status"));
  if (id && status) {
    await prisma.plannerItem.update({ where: { id }, data: { status } });
  }
  revalidatePath("/planner");
  revalidatePath("/");
}
