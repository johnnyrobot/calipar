import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { REQUIRED_EXPORTS } from "../required-exports.mjs";
import { ROOT, fail } from "./lib.mjs";

const MIB = 1024 * 1024;
const MAX_ASSET_COUNT = 20_000;
const MAX_ASSET_BYTES = 25 * MIB;
const MAX_WORKER_GZIP_BYTES = 3 * MIB;
const OUT = resolve(ROOT, "out");

const required = REQUIRED_EXPORTS;

const forbiddenBasenames = new Set([
  ".env",
  ".dev.vars",
  "serviceAccountKey.json",
  "openrouter-llms-full.txt",
]);

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      fail(`symbolic links are not permitted in deploy artifacts: ${absolute}`);
    }
    if (entry.isDirectory()) files.push(...walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

if (!existsSync(OUT)) {
  fail("out/ does not exist. Run the production build first.");
}

for (const expected of required) {
  if (!existsSync(resolve(OUT, expected))) {
    fail(`required static-export artifact is missing: out/${expected}`);
  }
}

const assets = walk(OUT);
if (assets.length > MAX_ASSET_COUNT) {
  fail(
    `asset count ${assets.length} exceeds the Workers Free limit ${MAX_ASSET_COUNT}.`,
  );
}

let totalBytes = 0;
for (const asset of assets) {
  const path = relative(OUT, asset);
  const stat = lstatSync(asset);
  totalBytes += stat.size;
  if (stat.size > MAX_ASSET_BYTES) {
    fail(
      `${path} is ${(stat.size / MIB).toFixed(2)} MiB; the per-asset limit is 25 MiB.`,
    );
  }
  if (
    path.endsWith(".map") ||
    path.endsWith(".key") ||
    path.endsWith(".pem") ||
    path.endsWith(".p12") ||
    path.endsWith(".pfx") ||
    forbiddenBasenames.has(basename(path)) ||
    basename(path).startsWith(".env.") ||
    basename(path).startsWith(".dev.vars.")
  ) {
    fail(`forbidden deployment artifact found: out/${path}`);
  }
}

const workerDirArgument = process.argv.find((value) =>
  value.startsWith("--worker-dir="),
);
let workerGzipBytes = null;
if (workerDirArgument) {
  const workerDirectory = resolve(
    ROOT,
    workerDirArgument.slice("--worker-dir=".length),
  );
  if (!existsSync(workerDirectory)) {
    fail(`dry-run Worker directory does not exist: ${workerDirectory}`);
  }
  const workerFiles = walk(workerDirectory).filter(
    (file) => !file.endsWith(".map"),
  );
  workerGzipBytes = workerFiles.reduce(
    (sum, file) => sum + gzipSync(readFileSync(file)).byteLength,
    0,
  );
  if (workerGzipBytes > MAX_WORKER_GZIP_BYTES) {
    fail(
      `dry-run Worker modules gzip to ${(workerGzipBytes / MIB).toFixed(2)} MiB; Workers Free allows 3 MiB.`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      assetCount: assets.length,
      assetBytes: totalBytes,
      largestAssetLimitBytes: MAX_ASSET_BYTES,
      workerGzipBytes,
      workerGzipLimitBytes: MAX_WORKER_GZIP_BYTES,
      status: "within-static-free-limits",
    },
    null,
    2,
  ),
);
