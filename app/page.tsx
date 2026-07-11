import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth";

// Counts are read live from Postgres on every request.
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

type DbResult =
  | { ok: true; plannerItems: number; expenses: number }
  | { ok: false; error: string };

async function loadCounts(): Promise<DbResult> {
  try {
    const [plannerItems, expenses] = await Promise.all([
      prisma.plannerItem.count(),
      prisma.expense.count(),
    ]);
    return { ok: true, plannerItems, expenses };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export default async function Home() {
  const result = await loadCounts();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MyScheduler</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Foundation build — session &amp; database plumbing.
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Sign out
          </button>
        </form>
      </header>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              result.ok ? "bg-green-500" : "bg-red-500"
            }`}
            aria-hidden
          />
          <h2 className="text-sm font-medium text-black/70 dark:text-white/70">
            {result.ok ? "Connected to Postgres" : "Database unreachable"}
          </h2>
        </div>

        {result.ok ? (
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Planner items" value={result.plannerItems} />
            <Stat label="Expenses" value={result.expenses} />
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">Could not read counts from the database.</p>
            <p className="mt-1 break-words font-mono text-xs opacity-80">
              {result.error}
            </p>
            <p className="mt-2 opacity-80">
              Check that <code>DATABASE_URL</code> is set and the migration has
              been applied (<code>npx prisma migrate deploy</code>).
            </p>
          </div>
        )}
      </section>

      <p className="text-xs text-black/40 dark:text-white/40">
        This is a placeholder that proves the session and database both work.
        Planner and expense UIs are next-phase work.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-black/60 dark:text-white/60">{label}</div>
    </div>
  );
}
