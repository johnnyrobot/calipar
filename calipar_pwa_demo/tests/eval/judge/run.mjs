#!/usr/bin/env node
/**
 * Advisory AI quality report. Not a gate.
 *
 * Collects real responses from a running preview, scores each against the
 * rubric with a judge model, and writes a report. It never fails the build: a
 * low score is something to read, not something to block on.
 *
 * Guarded twice over — EVAL_JUDGE=1 and an explicit base URL — because it makes
 * live provider calls. Only synthetic seed content is ever sent.
 *
 *   EVAL_JUDGE=1 EVAL_JUDGE_BASE_URL=https://<preview> \
 *   EVAL_JUDGE_COOKIE='<fresh session cookie value>' \
 *   npm run eval:judge
 */

import { mkdir, writeFile } from "node:fs/promises";

// rubric.ts is erasable-syntax-only TypeScript, so Node's built-in type
// stripping loads it directly. Requires Node >= 22.18 (package.json allows
// >= 20.9, so the script checks rather than assuming).
const OUT_DIR = "test-results/eval";

function fail(message) {
  console.error(`eval:judge — ${message}`);
  process.exit(2);
}

if (process.env.EVAL_JUDGE !== "1") {
  fail("refusing to run without EVAL_JUDGE=1. This makes live provider calls.");
}

const baseUrl = process.env.EVAL_JUDGE_BASE_URL;
if (!baseUrl) {
  fail("refusing to run without an explicit EVAL_JUDGE_BASE_URL. It must be an authorised preview or production URL.");
}
if (!/^https:\/\//.test(baseUrl)) {
  fail("EVAL_JUDGE_BASE_URL must be https. Do not judge against a local dev server.");
}

const cookie = process.env.EVAL_JUDGE_COOKIE;
if (!cookie) {
  fail("refusing to run without EVAL_JUDGE_COOKIE (a fresh short-lived session cookie value).");
}

let rubricModule;
try {
  rubricModule = await import("./rubric.ts");
} catch (error) {
  fail(
    `could not load the rubric — Node >= 22.18 is required for TypeScript stripping (running ${process.version}): ${error.message}`,
  );
}
const { RUBRIC, judgePrompt, meanByCriterion, meanScore, worstResponses } = rubricModule;

/** Synthetic seed content only. Never a real prompt, never real institutional data. */
const CASES = [
  {
    name: "grounded-analyze",
    task: "analyze",
    body: {
      content: "Course success held steady this year across the program.",
      evidence: [
        {
          id: "analytics-live-canary",
          title: "Synthetic canary metric",
          text: "80 successful enrolments of 100 attempted.",
        },
      ],
    },
    supplied: ["80 successful enrolments of 100 attempted."],
  },
  {
    name: "missing-data-analyze",
    task: "analyze",
    body: { content: "Outcomes improved substantially.", evidence: [] },
    supplied: [],
  },
  {
    name: "equity-check",
    task: "equity-check",
    body: {
      content: "Outcomes were comparable across student groups.",
      metrics: {},
      evidence: [
        {
          id: "analytics-live-canary",
          title: "Synthetic canary metric",
          text: "80 successful enrolments of 100 attempted.",
        },
      ],
    },
    supplied: ["80 successful enrolments of 100 attempted."],
  },
];

async function collect(testCase) {
  const response = await fetch(new URL(`/api/ai/${testCase.task}`, baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(baseUrl).origin,
      Cookie: `calipar_ai_session=${cookie}`,
    },
    body: JSON.stringify(testCase.body),
  });
  if (!response.ok) {
    // A capacity failure is reported, never silently smoothed over.
    return { ...testCase, error: `HTTP ${response.status}`, response: "" };
  }
  const json = await response.json();
  const prose = Object.entries(json)
    .filter(([key]) => key !== "meta" && key !== "evidenceIds")
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" | ") : String(value)}`)
    .join("\n");
  return { ...testCase, response: prose, model: json.meta?.model };
}

async function judge(collected) {
  const response = await fetch(new URL("/api/ai/chat", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(baseUrl).origin,
      Cookie: `calipar_ai_session=${cookie}`,
    },
    body: JSON.stringify({
      message: judgePrompt(collected.response, collected.supplied),
      history: [],
      context: [],
    }),
  });
  const text = await response.text();
  let payload = "";
  let event = "";
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:") && event === "delta") {
      try {
        payload += JSON.parse(line.slice(5).trim()).text ?? "";
      } catch {
        /* a malformed delta shows up as an unparseable payload below */
      }
    }
  }
  const match = payload.match(/\{[\s\S]*\}/);
  if (!match) return { scores: [], parseError: payload.slice(0, 400) };
  try {
    return JSON.parse(match[0]);
  } catch {
    return { scores: [], parseError: match[0].slice(0, 400) };
  }
}

const judged = [];
for (const testCase of CASES) {
  const collected = await collect(testCase);
  if (collected.error) {
    console.error(`  ${testCase.name}: ${collected.error} — reported, not scored`);
    judged.push({ ...collected, scores: [], mean: 0 });
    continue;
  }
  const result = await judge(collected);
  const scores = Array.isArray(result.scores) ? result.scores : [];
  judged.push({
    caseName: testCase.name,
    task: testCase.task,
    response: collected.response,
    model: collected.model,
    scores,
    mean: meanScore(scores),
    ...(result.parseError ? { parseError: result.parseError } : {}),
  });
  console.error(`  ${testCase.name}: mean ${meanScore(scores).toFixed(2)}`);
}

const byCriterion = meanByCriterion(judged);
const worst = worstResponses(judged, 3);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  `${OUT_DIR}/judge-report.json`,
  `${JSON.stringify({ baseUrl, byCriterion, judged }, null, 2)}\n`,
);

const lines = [
  "# Advisory AI quality report",
  "",
  "Advisory only. This is not a gate — read it, do not block on it.",
  "",
  "## Mean score per criterion",
  "",
  "| Criterion | Mean |",
  "| --- | --- |",
  ...RUBRIC.map((c) => `| ${c.title} | ${(byCriterion[c.id] ?? 0).toFixed(2)} |`),
  "",
  "## Worst three responses, verbatim",
  "",
  ...worst.flatMap((item) => [
    `### ${item.caseName} — mean ${item.mean.toFixed(2)}${item.model ? ` (${item.model})` : ""}`,
    "",
    "```",
    item.response || item.error || "(no response)",
    "```",
    "",
    ...item.scores.map((s) => `- **${s.id}**: ${s.score} — ${s.justification}`),
    "",
  ]),
];
await writeFile(`${OUT_DIR}/judge-report.md`, `${lines.join("\n")}\n`);

console.error("");
for (const criterion of RUBRIC) {
  console.error(`${criterion.title}: ${(byCriterion[criterion.id] ?? 0).toFixed(2)}`);
}
console.error(`\nWrote ${OUT_DIR}/judge-report.json and judge-report.md`);
