import { rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROOT,
  assertConfigIdentity,
  run,
  runWrangler,
} from "./lib.mjs";

assertConfigIdentity();

run(process.execPath, ["scripts/cloudflare/check-free-limits.mjs"]);

const dryRunDirectory = resolve(ROOT, ".wrangler", "dry-run");
rmSync(dryRunDirectory, { recursive: true, force: true });

runWrangler([
  "versions",
  "upload",
  "--name",
  "calipar-pwa-demo",
  "--dry-run",
  "--outdir",
  dryRunDirectory,
]);

run(process.execPath, [
  "scripts/cloudflare/check-free-limits.mjs",
  "--worker-dir=.wrangler/dry-run",
]);

console.log("Wrangler dry run and Workers Free artifact checks passed.");
