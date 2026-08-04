import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { REQUIRED_EXPORTS } from "../required-exports.mjs";

const root = resolve(process.cwd());
const output = resolve(root, "out");

if (!existsSync(output)) {
  throw new Error("Static export directory out/ does not exist. Run npm run build first.");
}

const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
    } else {
      files.push(absolute);
    }
  }
}
walk(output);

const errors = [];
const required = REQUIRED_EXPORTS;

for (const requiredPath of required) {
  if (!existsSync(join(output, requiredPath))) {
    errors.push(`Missing required export: ${requiredPath}`);
  }
}

const forbiddenNames = [
  "openrouter-llms-full.txt",
  ".env",
  ".dev.vars",
  "serviceAccountKey.json",
];
for (const file of files) {
  const path = relative(output, file);
  if (forbiddenNames.some((name) => path === name || path.endsWith(`/${name}`))) {
    errors.push(`Forbidden file in export: ${path}`);
  }

  const size = statSync(file).size;
  if (size > 25 * 1024 * 1024) {
    errors.push(`Asset exceeds Cloudflare's 25 MiB per-file limit: ${path}`);
  }
}

if (files.length > 20_000) {
  errors.push(`Export contains ${files.length} assets; Cloudflare Free allows 20,000.`);
}

const textExtensions = /\.(?:html|js|mjs|css|json|map|txt|xml|webmanifest)$/i;
const secretPatterns = [
  /sk-or-v1-[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"private_key"\s*:/,
  /OPENROUTER_API_KEY\s*[:=]\s*["'][^"']+["']/,
  /TURNSTILE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/,
  /AI_SESSION_SECRET\s*[:=]\s*["'][^"']+["']/,
];

for (const file of files.filter((candidate) => textExtensions.test(candidate))) {
  const contents = readFileSync(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(contents)) {
      errors.push(`Potential secret matched ${pattern} in ${relative(output, file)}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const digest = createHash("sha256")
    .update(
      files
        .map((file) => `${relative(output, file)}:${statSync(file).size}`)
        .sort()
        .join("\n"),
    )
    .digest("hex");
  console.log(
    `Verified ${files.length} exported assets; manifest digest ${digest.slice(0, 16)}.`,
  );
}
