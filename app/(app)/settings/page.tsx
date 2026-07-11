import { getAccount, isConfigured } from "@/lib/google";
import { formatDateTime } from "@/lib/dates";
import { SubmitButton } from "@/app/(app)/_components/form-controls";
import { syncNow, disconnectGoogle } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    disconnected?: string;
    synced?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const configured = isConfigured();
  const account = configured ? await getAccount() : null;

  return (
    <main className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Google Calendar two-way sync.
        </p>
      </header>

      <Banner sp={sp} />

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-base font-medium">Google Calendar</h2>

        {!configured ? (
          <NotConfigured />
        ) : account ? (
          <Connected account={account} />
        ) : (
          <NotConnected />
        )}
      </section>
    </main>
  );
}

function Banner({
  sp,
}: {
  sp: { connected?: string; disconnected?: string; synced?: string; error?: string };
}) {
  let message: string | null = null;
  let tone: "ok" | "err" = "ok";

  if (sp.connected) message = "Google Calendar connected and synced.";
  else if (sp.disconnected) message = "Google Calendar disconnected.";
  else if (sp.synced !== undefined) message = `Synced — ${sp.synced} event(s) pulled in.`;
  else if (sp.error === "notconfigured") {
    message = "Google credentials aren't set yet. See the checklist below.";
    tone = "err";
  } else if (sp.error === "notconnected") {
    message = "Connect Google Calendar first.";
    tone = "err";
  } else if (sp.error) {
    message = "Something went wrong with Google. Try reconnecting.";
    tone = "err";
  }

  if (!message) return null;
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        tone === "ok"
          ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
          : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
      }`}
    >
      {message}
    </div>
  );
}

function Connected({
  account,
}: {
  account: { calendarId: string; lastSyncedAt: Date | null };
}) {
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
        <span className="font-medium">Connected</span>
        <span className="text-black/50 dark:text-white/50">· calendar “{account.calendarId}”</span>
      </div>
      <p className="text-sm text-black/60 dark:text-white/60">
        Last synced:{" "}
        {account.lastSyncedAt ? formatDateTime(account.lastSyncedAt) : "never"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <form action={syncNow}>
          <SubmitButton>Sync now</SubmitButton>
        </form>
        <form action={disconnectGoogle}>
          <button
            type="submit"
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
          >
            Disconnect
          </button>
        </form>
      </div>
      <p className="text-xs text-black/40 dark:text-white/40">
        Inbound events also pull automatically on a schedule (Vercel Cron). Items you
        create here with a time push out to Google instantly.
      </p>
    </div>
  );
}

function NotConnected() {
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" aria-hidden />
        <span className="font-medium">Not connected</span>
      </div>
      <p className="text-sm text-black/60 dark:text-white/60">
        Credentials are configured. Connect your Google account to start syncing.
      </p>
      <a
        href="/api/google/connect"
        className="inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
      >
        Connect Google Calendar
      </a>
      <p className="text-xs text-black/40 dark:text-white/40">
        You’ll see an “unverified app” warning (expected for a single test user) — click
        through it to continue.
      </p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-black/30 dark:bg-white/30" aria-hidden />
        <span className="font-medium">Not set up yet</span>
      </div>
      <p className="text-black/60 dark:text-white/60">
        Add Google OAuth credentials to enable sync. One-time setup in the Google Cloud
        Console:
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-black/70 dark:text-white/70">
        <li>Enable the <strong>Google Calendar API</strong>.</li>
        <li>
          Configure the <strong>OAuth consent screen</strong> (External, Testing) and add
          your own email as a <strong>test user</strong>.
        </li>
        <li>
          Create an <strong>OAuth client ID</strong> (Web application) with authorized
          redirect URIs:
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">
            <li>http://localhost:3000/api/google/callback</li>
            <li>https://myscheduler-five.vercel.app/api/google/callback</li>
          </ul>
        </li>
        <li>
          Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> (and a
          random <code>CRON_SECRET</code>) in <code>.env</code> locally and in the Vercel
          project, then redeploy.
        </li>
      </ol>
      <p className="text-black/50 dark:text-white/50">
        Once set, this page shows a “Connect Google Calendar” button.
      </p>
    </div>
  );
}
