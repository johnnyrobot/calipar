import { readFile } from "node:fs/promises";
import { vi } from "vitest";

import { handleRequest, type Env, type RateLimitBinding } from "../../worker/index";

const ORIGIN = "https://calipar.example";
const SECRET = "eval-session-secret-that-is-longer-than-32-characters";

/** Values the harness configures, so an eval can prove none of them leak out. */
export const EVAL_SECRETS = [
  "eval-openrouter-key",
  SECRET,
  "eval-turnstile-secret",
] as const;

export type EvalTask = "chat" | "analyze" | "expand" | "equity-check" | "socratic";

export interface EvalCase {
  name: string;
  task: EvalTask;
  body: Record<string, unknown>;
  cassette: string;
}

export interface EvalOutcome {
  status: number;
  json?: Record<string, unknown>;
  sse?: string;
  allowedEvidence: string[];
  upstreamBody: Record<string, unknown>;
}

function limiter(): RateLimitBinding {
  return { limit: async () => ({ success: true }) };
}

function evalEnv(): Env {
  return {
    OPENROUTER_API_KEY: "eval-openrouter-key",
    TURNSTILE_SECRET_KEY: "eval-turnstile-secret",
    TURNSTILE_SITE_KEY: "eval-turnstile-site",
    AI_SESSION_SECRET: SECRET,
    AI_RATE_LIMITER: limiter(),
    AI_IP_LIMITER: limiter(),
    AI_MINT_LIMITER: limiter(),
  };
}

/**
 * Chat cassettes are recorded SSE transcripts, structured cassettes are single
 * JSON bodies — the two upstream shapes OpenRouter actually returns.
 */
async function cassette(name: string, streaming: boolean): Promise<string> {
  const file = streaming ? `${name}.sse.txt` : `${name}.json`;
  return readFile(new URL(`./cassettes/${file}`, import.meta.url), "utf8");
}

function suppliedIds(body: Record<string, unknown>): string[] {
  const evidence = Array.isArray(body.evidence) ? body.evidence : [];
  const context = Array.isArray(body.context) ? body.context : [];
  return [...evidence, ...context]
    .map((record) => (record as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");
}

/**
 * Replay a recorded provider response through the real Worker.
 *
 * This asserts *our* validators, prompt construction, and policy enforcement —
 * deterministically, with no network. Whether the live model behaves well is a
 * separate question, answered by the bounded canary in tests/e2e/live-ai.spec.ts.
 * Do not conflate the two.
 */
export async function runCase(input: EvalCase): Promise<EvalOutcome> {
  const env = evalEnv();
  const calls: Array<[string, RequestInit | undefined]> = [];
  const streaming = input.task === "chat";
  const body = await cassette(input.cassette, streaming);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push([String(url), init]);
      if (String(url).includes("challenges.cloudflare.com")) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!String(url).includes("openrouter.ai")) {
        throw new Error(`Eval reached an unexpected host: ${String(url)}`);
      }
      return new Response(body, {
        headers: {
          "Content-Type": streaming ? "text/event-stream" : "application/json",
        },
      });
    }),
  );

  try {
    const session = await handleRequest(
      new Request(`${ORIGIN}/api/ai/session`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ turnstileToken: "eval-token" }),
      }),
      env,
    );
    const cookie = session.headers.get("Set-Cookie")!.split(";")[0]!;

    const response = await handleRequest(
      new Request(`${ORIGIN}/api/ai/${input.task}`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify(input.body),
      }),
      env,
    );

    const upstream = calls.find(([url]) => url.includes("openrouter.ai"));
    const outcome: EvalOutcome = {
      status: response.status,
      allowedEvidence: suppliedIds(input.body),
      upstreamBody: upstream
        ? (JSON.parse(String(upstream[1]?.body)) as Record<string, unknown>)
        : {},
    };
    if (streaming) outcome.sse = await response.text();
    else outcome.json = (await response.json()) as Record<string, unknown>;
    return outcome;
  } finally {
    vi.unstubAllGlobals();
  }
}

/** The prose a chat outcome actually delivered, reassembled from its delta events. */
export function deltaText(sse: string): string {
  let text = "";
  let event = "";
  for (const line of sse.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:") && event === "delta") {
      try {
        text += (JSON.parse(line.slice(5).trim()) as { text?: string }).text ?? "";
      } catch {
        // A malformed delta is the Worker's problem to report, not the harness's.
      }
    }
  }
  return text;
}
