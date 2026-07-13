"use client";

import { useState } from "react";

// Two-step delete: first click reveals Confirm / Cancel so nothing is deleted by
// a single click. The confirm submits a real <form> to the server action.
export function DeleteButton({
  action,
  id,
  label = "Delete",
  size = "sm",
}: {
  action: (formData: FormData) => void;
  id: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [confirming, setConfirming] = useState(false);
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`rounded-md border border-red-500/30 text-red-600 transition hover:bg-red-500/10 dark:text-red-400 ${pad}`}
      >
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-md bg-red-600 font-medium text-white transition hover:bg-red-700 ${pad}`}
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={`rounded-md border border-black/15 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5 ${pad}`}
      >
        Cancel
      </button>
    </form>
  );
}
