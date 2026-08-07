import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PROJECT_NAME = "calipar-pwa-demo";
export const WRANGLER_CONFIG = resolve(ROOT, "wrangler.jsonc");
export const WRANGLER = resolve(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);
export const RELEASE_DIR = resolve(ROOT, ".wrangler", "release");

export function fail(message) {
  console.error(`\nCloudflare release check failed: ${message}`);
  process.exit(1);
}

export function requireLocalWrangler() {
  if (!existsSync(WRANGLER)) {
    fail(
      "local Wrangler is missing. Run `npm ci`; release scripts never fall back to an unpinned global CLI.",
    );
  }
}

export function run(command, args, options = {}) {
  mkdirSync(resolve(ROOT, ".wrangler", "logs"), { recursive: true });
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    env: {
      ...process.env,
      NO_COLOR: "1",
      WRANGLER_LOG_PATH:
        process.env.WRANGLER_LOG_PATH ??
        resolve(ROOT, ".wrangler", "logs", "wrangler.log"),
    },
  });

  if (options.inherit) {
    if (result.status !== 0) {
      fail(`${command} ${args.join(" ")} exited with status ${result.status}.`);
    }
    return { status: result.status, stdout: "", stderr: "" };
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (!options.quiet) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }
  if (!options.allowFailure && result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited with status ${result.status}.`);
  }
  return { status: result.status, stdout, stderr };
}

export function runWrangler(args, options = {}) {
  requireLocalWrangler();
  return run(
    WRANGLER,
    [...args, "--config", WRANGLER_CONFIG],
    options,
  );
}

/**
 * Parse wrangler.jsonc. The file is JSONC — wrangler supports comments there
 * and the extension says so — but JSON.parse does not, so a comment in the
 * config used to crash every Cloudflare script with a bare SyntaxError.
 *
 * The scan is string-aware: a `//` or `/*` inside a quoted value (a URL, say)
 * must not be treated as the start of a comment.
 */
export function parseJsonc(raw) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (inLine) {
      if (char === "\n") {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === "*" && next === "/") {
        inBlock = false;
        index += 1;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && next === "/") {
      inLine = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlock = true;
      index += 1;
      continue;
    }
    out += char;
  }
  // Trailing commas are also legal in JSONC and illegal in JSON.
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

export function assertConfigIdentity() {
  const raw = readFileSync(WRANGLER_CONFIG, "utf8");
  const config = parseJsonc(raw);
  if (config.name !== PROJECT_NAME) {
    fail(
      `wrangler.jsonc names ${JSON.stringify(config.name)} instead of ${PROJECT_NAME}.`,
    );
  }
  if (config.assets?.directory !== "./out") {
    fail("wrangler.jsonc must publish exactly ./out.");
  }
  if (
    JSON.stringify(config.assets?.run_worker_first) !==
    JSON.stringify(["/api/*"])
  ) {
    fail("only /api/* may be configured Worker-first.");
  }
}

export function assertAuthenticated() {
  runWrangler(["whoami"]);
}

export function gitSha() {
  const result = run("git", ["rev-parse", "HEAD"], { quiet: true });
  const sha = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    fail("could not resolve a full Git commit SHA.");
  }
  return sha.toLowerCase();
}

export function packageVersion() {
  const value = JSON.parse(
    readFileSync(resolve(ROOT, "package.json"), "utf8"),
  ).version;
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(value)) {
    fail("package.json must contain a valid release version.");
  }
  return value;
}

export function assertProjectTreeClean() {
  const result = run(
    "git",
    ["status", "--porcelain", "--untracked-files=normal", "--", "."],
    { quiet: true },
  );
  if (result.stdout.trim()) {
    process.stderr.write(result.stdout);
    fail(
      "the CALIPAR PWA directory is dirty. Commit the exact tested source before uploading a preview.",
    );
  }
}

export function listDeployments() {
  return runWrangler(
    ["deployments", "list", "--name", PROJECT_NAME, "--json"],
    { allowFailure: true, quiet: true },
  );
}

export function assertUploadIntent() {
  const intent = process.env.CALIPAR_WORKER_INTENT;
  if (!["create", "update"].includes(intent)) {
    fail(
      "set CALIPAR_WORKER_INTENT=create for a verified unused name or CALIPAR_WORKER_INTENT=update for the existing CALIPAR Worker.",
    );
  }

  const deployments = listDeployments();
  const combined = `${deployments.stdout}\n${deployments.stderr}`;

  if (intent === "create") {
    if (
      process.env.CALIPAR_CONFIRMED_NEW_WORKER !== PROJECT_NAME
    ) {
      fail(
        `creation requires CALIPAR_CONFIRMED_NEW_WORKER=${PROJECT_NAME} after checking the exact Cloudflare account and name.`,
      );
    }
    if (deployments.status === 0) {
      fail(
        `${PROJECT_NAME} already exists in this account. Creation mode will not add a version to an existing Worker.`,
      );
    }
    if (
      !/(not found|does not exist|could not find|10090|10007)/i.test(combined)
    ) {
      process.stderr.write(combined);
      fail(
        "Wrangler did not provide an explicit not-found result. Treating an ambiguous API/auth failure as an unused name is unsafe.",
      );
    }
  }

  if (intent === "update") {
    if (
      process.env.CALIPAR_CONFIRMED_EXISTING_WORKER !== PROJECT_NAME
    ) {
      fail(
        `update requires CALIPAR_CONFIRMED_EXISTING_WORKER=${PROJECT_NAME}.`,
      );
    }
    if (deployments.status !== 0) {
      process.stderr.write(combined);
      fail(
        "the confirmed existing Worker could not be read; no version will be uploaded.",
      );
    }
  }
}

export function assertVersionId(versionId) {
  if (
    typeof versionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      versionId,
    )
  ) {
    fail("provide an explicit Cloudflare Worker version UUID.");
  }
  return versionId.toLowerCase();
}

export function assertRemoteVersionExists(versionId) {
  const result = runWrangler(
    ["versions", "list", "--name", PROJECT_NAME, "--json"],
    { quiet: true },
  );
  let versions;
  try {
    versions = JSON.parse(result.stdout);
  } catch {
    fail("Wrangler versions output was not valid JSON.");
  }
  // Match the id field structurally. This used to be
  // `JSON.stringify(versions).includes(versionId)`, which a version UUID
  // appearing anywhere in the blob would satisfy — inside a deploy message, a
  // tag, or an annotation. The entire job of this guard is to refuse to
  // promote or roll back to a version that does not exist, so a substring hit
  // is not good enough.
  const list = Array.isArray(versions)
    ? versions
    : Array.isArray(versions?.versions)
      ? versions.versions
      : null;
  if (!list) {
    fail(
      "Wrangler versions output was not a recognisable version list; refusing to treat it as a match.",
    );
  }
  if (!list.some((version) => version?.id?.toLowerCase?.() === versionId)) {
    fail(
      `version ${versionId} is not present in the current ${PROJECT_NAME} version list.`,
    );
  }
}

export function writeReleaseRecord(name, value) {
  mkdirSync(RELEASE_DIR, { recursive: true });
  const file = resolve(RELEASE_DIR, name);
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(`Release evidence: ${file}`);
  return file;
}

export function extractReturnedMetadata(output) {
  const urls = (output.match(/https:\/\/[^\s"'<>]+/g) ?? []).map((url) =>
    url.replace(/[),.;]+$/, ""),
  );
  const previewUrl =
    urls.find((url) => /\.workers\.dev[/?#]?/i.test(url)) ?? null;
  const versionMatch = output.match(
    /(?:version(?:\s+id)?[:\s]+)([0-9a-f]{8}-[0-9a-f-]{27,})/i,
  );
  return {
    previewUrl,
    versionId: versionMatch?.[1]?.toLowerCase() ?? null,
  };
}
