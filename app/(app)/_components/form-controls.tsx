import type { ReactNode } from "react";

// Shared control styling so every form looks the same. Server components —
// no client JS needed for the core CRUD forms.

export const controlClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1">
      <span className="text-xs font-medium text-black/60 dark:text-white/60">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs text-black/40 dark:text-white/40">{hint}</span>
      ) : null}
    </label>
  );
}

/** Render <option>s from a Prisma enum object, with an optional blank first option. */
export function EnumOptions({
  values,
  blankLabel,
}: {
  values: readonly string[];
  blankLabel?: string;
}) {
  return (
    <>
      {blankLabel !== undefined ? <option value="">{blankLabel}</option> : null}
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
    >
      {children}
    </button>
  );
}
