// The demo session: an HMAC-signed, HttpOnly cookie minted only after a
// Turnstile solve, carrying nothing but an opaque id and an expiry.
//
// The cookie is not an identity. It exists so the AI routes have something to
// rate-limit per tab, and so a scripted caller has to solve a challenge before
// it can reach the provider at all. Nothing about the visitor is stored in it.
//
// Time is injected rather than read from `Date.now()` inside the crypto. That
// is the whole reason this module exists: expiry was previously unreachable
// from a test, and the suite carried a test named "expired-shaped" whose three
// variants were tampered, unsigned and malformed — no expired one. The
// injection point matches `StreamBudget`'s (`worker/stream.ts`).
//
// Like `limits.ts`, `body.ts`, `stream.ts` and `policy.ts`, this module imports
// nothing from the router: it returns `null` for every rejection and lets
// `index.ts` decide what that means on the public error contract.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SESSION_COOKIE = "calipar_ai_session";
const SESSION_SECONDS = 30 * 60;

/** Longest `sid` this module will hand back, so a forged payload cannot bloat a limiter key. */
const MAX_SESSION_ID_LENGTH = 128;

/**
 * Shared with `limits.ts`, which digests the connecting address into a bucket
 * key. Exported here rather than duplicated there. The two copies had already
 * drifted — `limits.ts` dropped the `g` flag on the trailing-`=` strip — which
 * is a no-op against an anchored `$` and so changed nothing, but it is evidence
 * the copies were being maintained independently.
 */
export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function unixSeconds(now: () => number): number {
  return Math.floor(now() / 1_000);
}

/**
 * Mint a fresh session. The caller never chooses the id: it is a
 * `crypto.randomUUID()` generated here, which is why the per-session rate limit
 * is fairness rather than a ceiling and why `limits.ts` also bounds by address.
 *
 * Returns the whole `Set-Cookie` value, so the cookie's name, lifetime and
 * `HttpOnly`/`Secure`/`SameSite=Strict`/`Path=/api/ai` attributes are stated
 * once, here, and the router cannot weaken them by restating them.
 */
export async function issueSession(
  secret: string,
  now: () => number = () => Date.now(),
): Promise<{ cookie: string; expiresIn: number }> {
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({
        sid: crypto.randomUUID(),
        exp: unixSeconds(now) + SESSION_SECONDS,
      }),
    ),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)),
  );
  const token = `${payload}.${base64Url(signature)}`;
  return {
    cookie:
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_SECONDS}` +
      `; Path=/api/ai; HttpOnly; Secure; SameSite=Strict`,
    expiresIn: SESSION_SECONDS,
  };
}

/**
 * Verify a signed token and return its session id, or `null`.
 *
 * Every rejection — absent, malformed, wrong signature, unparseable payload,
 * over-long id, expired — is the same `null`. A caller cannot learn *which*
 * check refused it, and the router maps the whole set onto one
 * AI_SESSION_REQUIRED.
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: () => number = () => Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  try {
    const parsed = JSON.parse(decoder.decode(fromBase64Url(payload))) as {
      sid?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.sid !== "string" ||
      parsed.sid.length > MAX_SESSION_ID_LENGTH ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= unixSeconds(now)
    ) {
      return null;
    }
    return parsed.sid;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

/** Read and verify the session a request carries, or `null` if it carries none. */
export async function readSession(
  request: Request,
  secret: string,
  now: () => number = () => Date.now(),
): Promise<string | null> {
  return verifySessionToken(cookieValue(request, SESSION_COOKIE), secret, now);
}
