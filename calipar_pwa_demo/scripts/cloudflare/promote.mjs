import {
  PROJECT_NAME,
  assertAuthenticated,
  assertConfigIdentity,
  assertRemoteVersionExists,
  assertVersionId,
  fail,
  runWrangler,
  writeReleaseRecord,
} from "./lib.mjs";

assertConfigIdentity();
assertAuthenticated();

const versionId = assertVersionId(process.argv[2]);
if (process.env.CALIPAR_PROMOTE_WORKER !== PROJECT_NAME) {
  fail(`promotion requires CALIPAR_PROMOTE_WORKER=${PROJECT_NAME}.`);
}
assertRemoteVersionExists(versionId);

runWrangler([
  "versions",
  "deploy",
  `${versionId}@100%`,
  "--name",
  PROJECT_NAME,
  "--message",
  `Promote tested CALIPAR version ${versionId}`,
  "--dry-run",
  "--yes",
]);

runWrangler([
  "versions",
  "deploy",
  `${versionId}@100%`,
  "--name",
  PROJECT_NAME,
  "--message",
  `Promote tested CALIPAR version ${versionId}`,
  "--yes",
]);

const deployments = runWrangler(
  ["deployments", "list", "--name", PROJECT_NAME, "--json"],
  { quiet: true },
);
writeReleaseRecord(`promote-${versionId}.json`, {
  worker: PROJECT_NAME,
  versionId,
  deployments: JSON.parse(deployments.stdout),
  recordedAt: new Date().toISOString(),
});
