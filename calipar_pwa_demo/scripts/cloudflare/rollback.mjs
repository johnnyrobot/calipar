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
if (process.env.CALIPAR_ROLLBACK_WORKER !== PROJECT_NAME) {
  fail(`rollback requires CALIPAR_ROLLBACK_WORKER=${PROJECT_NAME}.`);
}
assertRemoteVersionExists(versionId);

runWrangler([
  "rollback",
  versionId,
  "--name",
  PROJECT_NAME,
  "--message",
  `Rollback CALIPAR to verified version ${versionId}`,
  "--yes",
]);

const deployments = runWrangler(
  ["deployments", "list", "--name", PROJECT_NAME, "--json"],
  { quiet: true },
);
writeReleaseRecord(`rollback-${versionId}.json`, {
  worker: PROJECT_NAME,
  versionId,
  deployments: JSON.parse(deployments.stdout),
  recordedAt: new Date().toISOString(),
});
