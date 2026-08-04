import { describe, expect, it, vi } from "vitest";

import {
  clientKey,
  enforceMintLimits,
  enforceTaskLimits,
  LimitExceeded,
} from "../../worker/limits";
import type { Env, RateLimitBinding } from "../../worker/index";

const secret = "test-session-secret-that-is-longer-than-32-characters";

function limiter(success = true): RateLimitBinding {
  return { limit: vi.fn(async () => ({ success })) };
}

function req(ip?: string): Request {
  const headers = new Headers();
  if (ip) headers.set("CF-Connecting-IP", ip);
  return new Request("https://calipar.example/api/ai/chat", {
    method: "POST",
    headers,
  });
}

function env(over: Partial<Env> = {}): Env {
  return {
    AI_SESSION_SECRET: secret,
    AI_RATE_LIMITER: limiter(),
    AI_IP_LIMITER: limiter(),
    AI_MINT_LIMITER: limiter(),
    ...over,
  };
}

describe("clientKey", () => {
  it("is stable for one address and different across addresses", async () => {
    const a1 = await clientKey(req("203.0.113.9"), secret);
    const a2 = await clientKey(req("203.0.113.9"), secret);
    const b = await clientKey(req("198.51.100.4"), secret);
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  it("never contains the raw address and is bounded in length", async () => {
    const key = await clientKey(req("203.0.113.9"), secret);
    expect(key).not.toContain("203.0.113.9");
    expect(key.length).toBeLessThanOrEqual(64);
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("buckets every caller together when the address header is absent", async () => {
    expect(await clientKey(req(), secret)).toBe(await clientKey(req(), secret));
  });

  it("does not collide across secrets", async () => {
    const one = await clientKey(req("203.0.113.9"), secret);
    const two = await clientKey(req("203.0.113.9"), `${secret}-rotated`);
    expect(one).not.toBe(two);
  });
});

describe("enforceTaskLimits", () => {
  it("consults the IP ceiling and the session limiter with distinct keys", async () => {
    const ip = limiter();
    const session = limiter();
    await enforceTaskLimits(
      req("203.0.113.9"),
      env({ AI_IP_LIMITER: ip, AI_RATE_LIMITER: session }),
      "session-abc",
    );

    const ipKey = vi.mocked(ip.limit).mock.calls[0]![0].key;
    expect(vi.mocked(session.limit)).toHaveBeenCalledWith({ key: "session-abc" });
    expect(ipKey).not.toBe("session-abc");
    expect(ipKey).not.toContain("203.0.113.9");
  });

  it("throws when the IP ceiling is exhausted, before touching the session limiter", async () => {
    const session = limiter();
    const target = env({ AI_IP_LIMITER: limiter(false), AI_RATE_LIMITER: session });
    await expect(
      enforceTaskLimits(req("203.0.113.9"), target, "session-abc"),
    ).rejects.toBeInstanceOf(LimitExceeded);
    expect(vi.mocked(session.limit)).not.toHaveBeenCalled();
  });

  it("throws when the session limiter is exhausted", async () => {
    const target = env({ AI_RATE_LIMITER: limiter(false) });
    await expect(
      enforceTaskLimits(req("203.0.113.9"), target, "session-abc"),
    ).rejects.toBeInstanceOf(LimitExceeded);
  });

  it("fails closed when a limiter binding is missing", async () => {
    await expect(
      enforceTaskLimits(req("203.0.113.9"), env({ AI_IP_LIMITER: undefined }), "session-abc"),
    ).rejects.toThrow(/not configured/i);
  });
});

describe("enforceMintLimits", () => {
  it("limits minting by client key, not by session", async () => {
    const mint = limiter();
    await enforceMintLimits(req("203.0.113.9"), env({ AI_MINT_LIMITER: mint }));
    expect(vi.mocked(mint.limit).mock.calls[0]![0].key).toMatch(/^mint:/);
  });

  it("throws with a retry hint when minting is exhausted", async () => {
    const target = env({ AI_MINT_LIMITER: limiter(false) });
    await expect(enforceMintLimits(req("203.0.113.9"), target)).rejects.toMatchObject({
      retryAfter: 60,
    });
  });

  it("fails closed when the mint limiter binding is missing", async () => {
    await expect(
      enforceMintLimits(req("203.0.113.9"), env({ AI_MINT_LIMITER: undefined })),
    ).rejects.toThrow(/not configured/i);
  });
});
