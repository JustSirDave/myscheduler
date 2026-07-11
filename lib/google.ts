import { prisma } from "@/lib/prisma";
import type { GoogleAccount } from "@/lib/generated/prisma/client";

// Dependency-free Google OAuth 2.0 + Calendar API. No SDK — just fetch against
// Google's token and Calendar v3 endpoints. Single-user, so tokens live in the
// one-row GoogleAccount table.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

// Read + write access to the user's calendar events.
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const ACCOUNT_ID = "primary";

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(origin: string): string {
  return `${origin}/api/google/callback`;
}

/** Build the Google consent-screen URL. */
export function getAuthUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // force refresh_token issuance on re-consent
    include_granted_scopes: "true",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

/** Exchange an auth code for tokens and persist them. */
export async function exchangeCodeAndStore(code: string, origin: string): Promise<void> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const token = (await res.json()) as TokenResponse;
  if (!token.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke access at myaccount.google.com and reconnect.",
    );
  }

  const expiryDate = new Date(Date.now() + token.expires_in * 1000);
  const data = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiryDate,
    scope: token.scope ?? GOOGLE_SCOPE,
  };

  await prisma.googleAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: { id: ACCOUNT_ID, ...data },
    update: data,
  });
}

export async function getAccount(): Promise<GoogleAccount | null> {
  return prisma.googleAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

export async function isConnected(): Promise<boolean> {
  if (!isConfigured()) return false;
  return (await getAccount()) !== null;
}

export async function disconnect(): Promise<void> {
  await prisma.googleAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

/** Return a valid access token, refreshing (and persisting) if it has expired. */
async function getValidAccessToken(account: GoogleAccount): Promise<string> {
  // 60s safety margin.
  if (account.expiryDate.getTime() - 60_000 > Date.now()) {
    return account.accessToken;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }

  const token = (await res.json()) as TokenResponse;
  const expiryDate = new Date(Date.now() + token.expires_in * 1000);
  await prisma.googleAccount.update({
    where: { id: account.id },
    data: { accessToken: token.access_token, expiryDate },
  });
  return token.access_token;
}

/**
 * Authenticated call to the Google Calendar v3 API. `path` is relative to the
 * calendar base (e.g. `/calendars/primary/events`). Returns the parsed JSON, or
 * `null` for 204/404 responses.
 */
export async function calendarFetch(
  account: GoogleAccount,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const accessToken = await getValidAccessToken(account);
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Google Calendar API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
