// Dependency-light single-user auth.
//
// One seeded password (process.env.AUTH_PASSWORD). On a correct submission we
// issue a signed, httpOnly session cookie. The cookie is an HMAC-SHA256 signed
// token (payload.signature) using AUTH_PASSWORD itself as the signing key, so
// no extra secret env var is required and rotating the password invalidates all
// existing sessions. Everything here uses the Web Crypto API so it runs in both
// the Edge middleware and Node server actions.

export const SESSION_COOKIE = "myscheduler_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

interface SessionPayload {
  sub: "owner";
  iat: number;
  exp: number;
}

function getAuthPassword(): string | undefined {
  return process.env.AUTH_PASSWORD;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array<ArrayBuffer> {
  const padLength = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Constant-time comparison of the submitted password against AUTH_PASSWORD. */
export function verifyPassword(submitted: string): boolean {
  const expected = getAuthPassword();
  if (!expected) return false;
  if (submitted.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= submitted.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Create a signed session token. Throws if AUTH_PASSWORD is unset. */
export async function createSessionToken(): Promise<string> {
  const secret = getAuthPassword();
  if (!secret) {
    throw new Error("AUTH_PASSWORD is not set — cannot create a session.");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: "owner",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const payloadPart = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadPart));
  return `${payloadPart}.${base64urlEncode(new Uint8Array(signature))}`;
}

/** Verify a session token's signature and expiry. Never throws. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = getAuthPassword();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadPart, signaturePart] = parts;

  try {
    const key = await importKey(secret);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signaturePart),
      encoder.encode(payloadPart),
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payloadPart)),
    ) as SessionPayload;

    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
