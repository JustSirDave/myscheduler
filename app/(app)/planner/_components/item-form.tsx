"use client";

import { useState } from "react";
import {
  PlannerItemType,
  ReminderKind,
  Horizon,
  Priority,
  Status,
} from "@/lib/generated/prisma/enums";
import {
  Field,
  SubmitButton,
  controlClass,
} from "@/app/(app)/_components/form-controls";

export interface ItemFormValues {
  id?: string;
  type?: string;
  name?: string;
  reminderKind?: string;
  project?: string;
  startAt?: string; // WAT "YYYY-MM-DDTHH:mm"
  endAt?: string;
  isAllDay?: boolean;
  horizon?: string;
  priority?: string;
  status?: string;
  notes?: string;
  reminderMinutes?: string;
  targetDate?: string; // WAT "YYYY-MM-DD"
  linkedGoalId?: string;
}

const REMINDER_KIND_LABELS: Record<string, string> = {
  Event: "Event (on Google Calendar)",
  Habit: "Habit",
  StartGoal: "Start a goal",
  ContinueGoal: "Continue a goal",
  General: "General",
};

const typeValues = Object.values(PlannerItemType);
const kindValues = Object.values(ReminderKind);
const priorityValues = Object.values(Priority);
const statusValues = Object.values(Status);
const horizonValues = Object.values(Horizon);

export function ItemForm({
  action,
  values = {},
  goals,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: ItemFormValues;
  goals: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [type, setType] = useState(values.type ?? PlannerItemType.Reminder);
  const [kind, setKind] = useState(values.reminderKind ?? ReminderKind.General);

  const isReminder = type === PlannerItemType.Reminder;
  const isEventReminder = isReminder && kind === ReminderKind.Event;
  const isGoalReminder =
    isReminder && (kind === ReminderKind.StartGoal || kind === ReminderKind.ContinueGoal);
  const isAlarm = type === PlannerItemType.Alarm;
  const isTask = type === PlannerItemType.Task;
  const isGoal = type === PlannerItemType.Goal;

  const linkableGoals = goals.filter((g) => g.id !== values.id);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {/* Type first */}
      <Field label="Type" htmlFor="type">
        <select
          id="type"
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={controlClass}
        >
          {typeValues.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      {isReminder ? (
        <Field label="Reminder for" htmlFor="reminderKind">
          <select
            id="reminderKind"
            name="reminderKind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={controlClass}
          >
            {kindValues.map((k) => (
              <option key={k} value={k}>
                {REMINDER_KIND_LABELS[k] ?? k}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="hidden sm:block" />
      )}

      <div className="sm:col-span-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required defaultValue={values.name ?? ""} className={controlClass} />
        </Field>
      </div>

      {/* Time — label depends on type */}
      {(isReminder || isAlarm || isTask) && (
        <Field
          label={isTask ? "Due" : isEventReminder ? "Start" : "Time"}
          htmlFor="startAt"
        >
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={values.startAt ?? ""}
            className={controlClass}
          />
        </Field>
      )}

      {isEventReminder && (
        <Field label="End" htmlFor="endAt">
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={values.endAt ?? ""}
            className={controlClass}
          />
        </Field>
      )}

      {/* Remind lead time — reminders (incl. event) */}
      {isReminder && (
        <Field
          label="Remind (min before)"
          htmlFor="reminderMinutes"
          hint={isEventReminder ? "Popup on the Google event." : "Phone alert lead time."}
        >
          <input
            id="reminderMinutes"
            name="reminderMinutes"
            type="number"
            min="0"
            step="1"
            defaultValue={values.reminderMinutes ?? ""}
            placeholder="e.g. 10"
            className={controlClass}
          />
        </Field>
      )}

      {isGoalReminder && (
        <Field label="Goal" htmlFor="linkedGoalId" hint="Which goal this reminder is about.">
          <select id="linkedGoalId" name="linkedGoalId" defaultValue={values.linkedGoalId ?? ""} className={controlClass}>
            <option value="">— Select a goal —</option>
            {linkableGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {isEventReminder && (
        <>
          <Field label="Project" htmlFor="project">
            <input id="project" name="project" defaultValue={values.project ?? ""} className={controlClass} />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="isAllDay" defaultChecked={values.isAllDay} className="h-4 w-4" />
            <span className="text-sm">All day</span>
          </label>
        </>
      )}

      {isGoal && (
        <>
          <Field label="Target date" htmlFor="targetDate">
            <input
              id="targetDate"
              name="targetDate"
              type="date"
              defaultValue={values.targetDate ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Horizon" htmlFor="horizon">
            <select id="horizon" name="horizon" defaultValue={values.horizon ?? ""} className={controlClass}>
              <option value="">—</option>
              {horizonValues.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {isTask && (
        <>
          <Field label="Priority" htmlFor="priority">
            <select id="priority" name="priority" defaultValue={values.priority ?? ""} className={controlClass}>
              <option value="">—</option>
              {priorityValues.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="project">
            <input id="project" name="project" defaultValue={values.project ?? ""} className={controlClass} />
          </Field>
          <Field label="Linked goal" htmlFor="linkedGoalId" hint="Ladder this task up to a goal.">
            <select id="linkedGoalId" name="linkedGoalId" defaultValue={values.linkedGoalId ?? ""} className={controlClass}>
              <option value="">— None —</option>
              {linkableGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {/* Status — task and goal */}
      {(isTask || isGoal) && (
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={values.status ?? Status.NotStarted} className={controlClass}>
            {statusValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Notes — everything except Alarm */}
      {!isAlarm && (
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="notes">
            <textarea id="notes" name="notes" rows={3} defaultValue={values.notes ?? ""} className={controlClass} />
          </Field>
        </div>
      )}

      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
