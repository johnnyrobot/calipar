import {
  PROJECT_NAME,
  assertAuthenticated,
  assertConfigIdentity,
  assertProjectTreeClean,
  assertUploadIntent,
  extractReturnedMetadata,
  gitSha,
  packageVersion,
  run,
  runWrangler,
  writeReleaseRecord,
} from "./lib.mjs";

assertConfigIdentity();
assertProjectTreeClean();
assertAuthenticated();
assertUploadIntent();
run(process.execPath, ["scripts/cloudflare/dry-run.mjs"]);

const sha = gitSha();
const shortSha = sha.slice(0, 12);
const appVersion = packageVersion();
const alias = `validation-${shortSha}`;
const result = runWrangler(
  [
    "versions",
    "upload",
    "--name",
    PROJECT_NAME,
    "--strict",
    "--tag",
    `git-${shortSha}`,
    "--message",
    `CALIPAR preview ${sha}`,
    "--preview-alias",
    alias,
    "--var",
    `BUILD_SHA:${sha}`,
    "--var",
    `APP_VERSION:${appVersion}`,
    "--var",
    "ENVIRONMENT:release-candidate",
  ],
  { quiet: true },
);

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
const rawOutput = `${result.stdout}\n${result.stderr}`.trim();
const returned = extractReturnedMetadata(rawOutput);
writeReleaseRecord(`preview-${shortSha}.json`, {
  worker: PROJECT_NAME,
  gitSha: sha,
  appVersion,
  previewAlias: alias,
  versionId: returned.versionId,
  previewUrl: returned.previewUrl,
  wranglerOutput: rawOutput,
  recordedAt: new Date().toISOString(),
});

if (!returned.versionId || !returned.previewUrl) {
  throw new Error(
    "The preview uploaded without changing production traffic, but Wrangler output did not expose both an exact version ID and preview URL. Use the recorded raw output or Cloudflare dashboard; do not construct either value.",
  );
}

console.log(`Exact preview URL returned by Wrangler: ${returned.previewUrl}`);
console.log(`Exact preview version returned by Wrangler: ${returned.versionId}`);
