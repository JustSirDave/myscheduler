"use client";

import { setPlannerStatus } from "@/app/(app)/planner/actions";

export function StatusSelect({
  id,
  status,
  options,
}: {
  id: string;
  status: string;
  options: readonly string[];
}) {
  return (
    <form action={setPlannerStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs outline-none dark:border-white/15"
        aria-label="Status"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </form>
  );
}
