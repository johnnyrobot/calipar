import type { Env, RateLimitBinding } from "./index";
import { base64Url } from "./session";

// Abuse ceilings for the AI routes.
//
// The session limiter alone is not a ceiling: a session id is a
// `crypto.randomUUID()` minted on every Turnstile solve, so a caller who mints
// freely multiplies their own budget. The bound has to key on something the
// caller does not choose, which is the connecting address.
//
// The bucket key is a salted digest, never the address itself: AGENTS.md forbids
// holding or logging a raw IP. It is not a security token — it only needs to be
// stable per address and unlinkable back to one.
//
// When Cloudflare does not supply the header — local `wrangler dev`, or a
// misconfiguration — every caller shares one bucket, so the ceiling degrades to
// a global one rather than disappearing. That is deliberate: fail closed.
const UNKNOWN_CLIENT = "unknown-client";

export class LimitExceeded extends Error {
  constructor(
    message: string,
    readonly retryAfter: number = 60,
  ) {
    super(message);
    this.name = "LimitExceeded";
  }
}

export async function clientKey(request: Request, secret: string): Promise<string> {
  const address = request.headers.get("CF-Connecting-IP")?.trim() || UNKNOWN_CLIENT;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret}:${address}`),
  );
  return base64Url(new Uint8Array(digest)).slice(0, 32);
}

function required(binding: RateLimitBinding | undefined, name: string): RateLimitBinding {
  if (!binding) throw new Error(`AI rate limiting is not configured (${name}).`);
  return binding;
}

/**
 * Two tiers on the task routes: a per-network ceiling that bounds abuse, then a
 * per-session limit that keeps one tab from starving the others behind the same
 * address. The network ceiling runs first so an exhausted attacker never even
 * reaches the session limiter.
 */
export async function enforceTaskLimits(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<void> {
  const ipLimiter = required(env.AI_IP_LIMITER, "AI_IP_LIMITER");
  const sessionLimiter = required(env.AI_RATE_LIMITER, "AI_RATE_LIMITER");
  const secret = env.AI_SESSION_SECRET ?? "";

  const ip = await ipLimiter.limit({ key: `task:${await clientKey(request, secret)}` });
  if (!ip.success) {
    throw new LimitExceeded("Too many AI requests from this network. Try again in a minute.");
  }
  const session = await sessionLimiter.limit({ key: sessionId });
  if (!session.success) {
    throw new LimitExceeded("Too many AI requests. Try again in a minute.");
  }
}

/**
 * Bound session minting itself. Without this the per-session limit is only a
 * fairness control, because the caller mints as many sessions as they like.
 */
export async function enforceMintLimits(request: Request, env: Env): Promise<void> {
  const mintLimiter = required(env.AI_MINT_LIMITER, "AI_MINT_LIMITER");
  const secret = env.AI_SESSION_SECRET ?? "";
  const allowed = await mintLimiter.limit({ key: `mint:${await clientKey(request, secret)}` });
  if (!allowed.success) {
    throw new LimitExceeded("Too many verification attempts. Try again in a minute.");
  }
}
