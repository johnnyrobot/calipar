import { expect, test } from "@playwright/test";

const liveEnabled = process.env.LIVE_AI === "1";
const sessionCookie = process.env.LIVE_AI_SESSION_COOKIE;

test.describe("bounded live OpenRouter canary", () => {
  test.skip(
    !liveEnabled,
    "Set LIVE_AI=1, PW_BASE_URL, and LIVE_AI_SESSION_COOKIE for the explicit two-request canary.",
  );

  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL || !sessionCookie) {
      throw new Error(
        "The live canary requires PW_BASE_URL and a fresh HttpOnly calipar_ai_session cookie value.",
      );
    }
    const target = new URL(baseURL);
    await context.addCookies([
      {
        name: "calipar_ai_session",
        value: sessionCookie,
        domain: target.hostname,
        path: "/",
        httpOnly: true,
        secure: target.protocol === "https:",
        sameSite: "Strict",
      },
    ]);
  });

  test("uses one streaming and one structured free-only request", async ({
    request,
  }) => {
    const status = await request.get("/api/ai/status");
    expect(status.ok()).toBeTruthy();
    await expect(status.json()).resolves.toMatchObject({
      configured: true,
      freeOnly: true,
      zeroDataRetention: true,
      dataCollection: "deny",
    });

    const chat = await request.post("/api/ai/chat", {
      data: {
        message:
          "In one sentence, explain that this workspace contains synthetic demo data.",
        history: [],
        evidence: [],
      },
    });
    expect(chat.ok()).toBeTruthy();
    expect(chat.headers()["content-type"]).toContain("text/event-stream");
    const events = await chat.text();
    expect(events).toContain("event: meta");
    expect(events).toContain("event: delta");
    expect(events).toContain("event: done");
    expect(events).toMatch(/"model":"[^"]+:free"/);

    const analyze = await request.post("/api/ai/analyze", {
      data: {
        content:
          "Synthetic enrollment was 100 and synthetic successful enrollments were 80 of 100 attempted.",
        facts: {
          enrollment: 100,
          successfulEnrollments: 80,
          attemptedEnrollments: 100,
          successRate: 80,
        },
        evidence: [
          {
            id: "analytics-live-canary",
            title: "Synthetic canary metric",
            text: "80 successful enrollments of 100 attempted (80%).",
          },
        ],
      },
    });
    expect(analyze.ok()).toBeTruthy();
    const structured = (await analyze.json()) as {
      evidenceIds: string[];
      meta: { model: string; usage?: { cost?: number } };
    };
    expect(structured.meta.model).toMatch(/:free$/);
    expect(structured.meta.usage?.cost ?? 0).toBe(0);
    expect(structured.evidenceIds).toEqual(
      expect.arrayContaining(["analytics-live-canary"]),
    );
    expect(
      structured.evidenceIds.every((id) => id === "analytics-live-canary"),
    ).toBe(true);
  });
});
