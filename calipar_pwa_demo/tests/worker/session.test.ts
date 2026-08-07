import { describe, expect, it } from "vitest";

import {
  base64Url,
  issueSession,
  readSession,
  verifySessionToken,
} from "../../worker/session";

const secret = "test-session-secret-that-is-longer-than-32-characters";

/** Pull the signed token back out of a Set-Cookie header value. */
function tokenFrom(cookie: string): string {
  return decodeURIComponent(cookie.split(";")[0]!.split("=").slice(1).join("="));
}

describe("session expiry", () => {
  it("accepts a token inside its window and rejects it after", async () => {
    const minted = 1_800_000_000_000;
    const { cookie, expiresIn } = await issueSession(secret, () => minted);
    const token = tokenFrom(cookie);

    const justInside = minted + (expiresIn - 1) * 1_000;
    const justOutside = minted + (expiresIn + 1) * 1_000;

    await expect(
      verifySessionToken(token, secret, () => justInside),
    ).resolves.toMatch(/^[0-9a-f-]{36}$/);
    await expect(
      verifySessionToken(token, secret, () => justOutside),
    ).resolves.toBeNull();
  });

  it("rejects a token exactly at its expiry second", async () => {
    // `exp <= now` — the boundary belongs to the rejecting side.
    const minted = 1_800_000_000_000;
    const { cookie, expiresIn } = await issueSession(secret, () => minted);

    await expect(
      verifySessionToken(
        tokenFrom(cookie),
        secret,
        () => minted + expiresIn * 1_000,
      ),
    ).resolves.toBeNull();
  });

  it("does not let a re-signed payload buy more time", async () => {
    // An attacker who can mint their own token still cannot mint one that
    // outlives the window, because `exp` is written here and never read from
    // caller input.
    const minted = 1_800_000_000_000;
    const forged = base64Url(
      new TextEncoder().encode(
        JSON.stringify({ sid: "forged", exp: 4_000_000_000 }),
      ),
    );

    await expect(
      verifySessionToken(`${forged}.not-a-real-signature`, secret, () => minted),
    ).resolves.toBeNull();
  });
});

describe("session rejection modes", () => {
  const minted = 1_800_000_000_000;

  it("returns null for every malformed shape without distinguishing them", async () => {
    const { cookie } = await issueSession(secret, () => minted);
    const token = tokenFrom(cookie);

    for (const candidate of [
      undefined,
      "",
      token.slice(0, -2),
      `${token}tampered`,
      "missing-signature",
      "bad.payload.extra",
      "!!!.!!!",
    ]) {
      await expect(
        verifySessionToken(candidate, secret, () => minted),
      ).resolves.toBeNull();
    }
  });

  it("returns null for a validly signed but unparseable payload", async () => {
    // A correct signature over garbage must still be refused, and must not
    // throw out of the function — the JSON.parse sits inside the try for
    // exactly this case.
    const payload = base64Url(new TextEncoder().encode("not-json-at-all"));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = base64Url(
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(payload),
        ),
      ),
    );

    await expect(
      verifySessionToken(`${payload}.${signature}`, secret, () => minted),
    ).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const { cookie } = await issueSession(secret, () => minted);

    await expect(
      verifySessionToken(
        tokenFrom(cookie),
        `${secret}-but-different`,
        () => minted,
      ),
    ).resolves.toBeNull();
  });
});

describe("readSession", () => {
  const minted = 1_800_000_000_000;

  function requestWith(cookie: string | undefined): Request {
    return new Request("https://calipar.example/api/ai/chat", {
      headers: cookie ? { Cookie: cookie } : {},
    });
  }

  it("reads the session cookie out of a request that carries other cookies", async () => {
    const { cookie } = await issueSession(secret, () => minted);
    const header = `theme=dark; ${cookie.split(";")[0]}; other=1`;

    await expect(
      readSession(requestWith(header), secret, () => minted),
    ).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns null when the request carries no cookie at all", async () => {
    await expect(
      readSession(requestWith(undefined), secret, () => minted),
    ).resolves.toBeNull();
  });

  it("returns null when the request carries a different cookie", async () => {
    await expect(
      readSession(requestWith("theme=dark"), secret, () => minted),
    ).resolves.toBeNull();
  });
});

describe("issueSession", () => {
  it("pins the cookie attributes the demo depends on", async () => {
    const { cookie, expiresIn } = await issueSession(
      secret,
      () => 1_800_000_000_000,
    );

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api/ai");
    expect(cookie).toContain(`Max-Age=${expiresIn}`);
    expect(expiresIn).toBe(30 * 60);
  });

  it("uses the real clock when none is injected", async () => {
    // Every other test drives an injected clock, so this is the only one that
    // exercises the default the Worker actually runs on.
    const { cookie } = await issueSession(secret);

    await expect(verifySessionToken(tokenFrom(cookie), secret)).resolves.toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });

  it("never reuses a session id", async () => {
    const now = () => 1_800_000_000_000;
    const [first, second] = await Promise.all([
      issueSession(secret, now),
      issueSession(secret, now),
    ]);

    expect(tokenFrom(first.cookie)).not.toBe(tokenFrom(second.cookie));
  });
});
