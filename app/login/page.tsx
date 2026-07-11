import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  verifyPassword,
} from "@/lib/auth";

export const metadata = {
  title: "Sign in · MyScheduler",
};

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");

  if (!verifyPassword(password)) {
    redirect("/login?error=1");
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in? Skip the form.
  const existing = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(existing)) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">MyScheduler</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Enter your password to continue.
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              placeholder="Password"
              className="w-full rounded-lg border border-black/15 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              Incorrect password. Try again.
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
