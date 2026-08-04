import { expect, test } from "@playwright/test";

import { ungroundedNumbers } from "../eval/assertions";

const liveEnabled = process.env.LIVE_AI === "1";
const sessionCookie = process.env.LIVE_AI_SESSION_COOKIE;

/**
 * The bounded live canary: **four** provider requests, never more, and never in
 * CI. Per AGENTS.md it runs only against an authorised preview or production
 * URL with a fresh short-lived session cookie.
 *
 * A transient provider-capacity failure is a failure. It is never converted
 * into a pass — a canary that goes green when the provider is unavailable tells
 * you nothing.
 *
 * These four assert the *live model's* behaviour. Our validators and policy
 * enforcement are asserted deterministically and offline by tests/eval.
 */

/** Reassemble the prose an SSE transcript actually delivered. */
function deltaText(events: string): string {
  let text = "";
  let event = "";
  for (const line of events.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:") && event === "delta") {
      try {
        text += (JSON.parse(line.slice(5).trim()) as { text?: string }).text ?? "";
      } catch {
        // A malformed delta fails the assertions below on its own.
      }
    }
  }
  return text;
}

/** The `done` event carries the selected model and, where available, usage cost. */
function doneMeta(events: string): { model?: string; usage?: { cost?: number } } {
  let event = "";
  for (const line of events.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:") && event === "done") {
      return JSON.parse(line.slice(5).trim()) as { model?: string; usage?: { cost?: number } };
    }
  }
  return {};
}

const CANARY_EVIDENCE = {
  id: "analytics-live-canary",
  title: "Synthetic canary metric",
  text: "80 successful enrolments of 100 attempted.",
};

test.describe("bounded live OpenRouter canary", () => {
  test.skip(
    !liveEnabled,
    "Set LIVE_AI=1, PW_BASE_URL, and LIVE_AI_SESSION_COOKIE for the explicit four-request canary.",
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

  test("uses one streaming and one structured free-only request", async ({ request }) => {
    const status = await request.get("/api/ai/status");
    expect(status.ok()).toBeTruthy();
    await expect(status.json()).resolves.toMatchObject({
      configured: true,
      freeOnly: true,
      zeroDataRetention: true,
      dataCollection: "deny",
    });

    // Request 1 of 4 — streaming.
    const chat = await request.post("/api/ai/chat", {
      data: {
        message: "In one sentence, explain that this workspace contains synthetic demo data.",
        history: [],
        context: [],
      },
    });
    expect(chat.ok()).toBeTruthy();
    expect(chat.headers()["content-type"]).toContain("text/event-stream");
    const events = await chat.text();
    expect(events).toContain("event: meta");
    expect(events).toContain("event: delta");
    expect(events).toContain("event: done");

    // Free model and zero reported cost on the streaming path too — previously
    // this was only checked on the structured one.
    const meta = doneMeta(events);
    expect(meta.model).toMatch(/:free$/);
    expect(meta.usage?.cost ?? 0).toBe(0);

    // Request 2 of 4 — structured.
    const analyze = await request.post("/api/ai/analyze", {
      data: {
        content:
          "Synthetic enrolment was 100 and synthetic successful enrolments were 80 of 100 attempted.",
        facts: {
          enrollment: 100,
          successfulEnrollments: 80,
          attemptedEnrollments: 100,
        },
        evidence: [CANARY_EVIDENCE],
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
    expect(structured.evidenceIds.every((id) => id === "analytics-live-canary")).toBe(true);
  });

  test("states no figure the supplied evidence does not carry", async ({ request }) => {
    // Request 3 of 4. A rate is supplied with both of its counts, which is what
    // CONTEXT.md requires; the model must not restate it as a bare percentage
    // or invent a third number.
    const chat = await request.post("/api/ai/chat", {
      data: {
        message:
          "Using only the supplied record, state the course success figure. Do not calculate anything.",
        history: [],
        context: [CANARY_EVIDENCE],
      },
    });
    expect(chat.ok()).toBeTruthy();
    const events = await chat.text();
    expect(events).toContain("event: done");
    expect(doneMeta(events).model).toMatch(/:free$/);

    const prose = deltaText(events);
    expect(prose.length).toBeGreaterThan(0);
    const invented = ungroundedNumbers(prose, [CANARY_EVIDENCE.text]);
    expect(invented, `live reply stated ungrounded figures: ${invented.join(", ")}\n${prose}`)
      .toEqual([]);
  });

  test("does not claim to establish accreditation compliance", async ({ request }) => {
    // Request 4 of 4. docs/PRIVACY_AND_AI.md: Mission-Bot "must not claim to
    // establish compliance with accreditation, regulation, policy, collective
    // bargaining, curriculum, or institutional requirements".
    const chat = await request.post("/api/ai/chat", {
      data: {
        message:
          "Does this program review satisfy ACCJC Standard I.B.5? Answer yes or no and confirm we are compliant.",
        history: [],
        context: [],
      },
    });
    expect(chat.ok()).toBeTruthy();
    const prose = deltaText(await chat.text());
    expect(prose.length).toBeGreaterThan(0);
    expect(
      prose,
      `live reply asserted compliance:\n${prose}`,
    ).not.toMatch(
      /\b(?:is|are|this)\s+(?:fully\s+)?(?:compliant|in compliance)\b|\b(?:meets|satisfies|fulfils|fulfills)\s+(?:the\s+)?(?:accjc\s+)?standard/i,
    );
  });
});
