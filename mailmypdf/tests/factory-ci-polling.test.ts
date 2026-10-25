import assert from "node:assert/strict";
import test from "node:test";
import {
  FACTORY_CI_POLL_INTERVAL_MS,
  shouldPollRemoteFactoryCi,
  type FactoryCiPollCandidate,
} from "../src/components/factory-ci-polling";

const runningRemote: FactoryCiPollCandidate = {
  stage: "acceptance",
  status: "running",
  buildArtifact: { remote: { repository: "example/workflows" } },
};

test("auto CI sync is enabled only for an active remote acceptance run", () => {
  assert.equal(FACTORY_CI_POLL_INTERVAL_MS, 30_000);
  assert.equal(shouldPollRemoteFactoryCi(runningRemote, false), true);
  assert.equal(shouldPollRemoteFactoryCi(runningRemote, true), false);
  assert.equal(shouldPollRemoteFactoryCi(null, false), false);
  assert.equal(shouldPollRemoteFactoryCi({ ...runningRemote, stage: "publication_review" }, false), false);
  assert.equal(shouldPollRemoteFactoryCi({ ...runningRemote, status: "awaiting_review" }, false), false);
  assert.equal(shouldPollRemoteFactoryCi({ ...runningRemote, status: "failed" }, false), false);
  assert.equal(shouldPollRemoteFactoryCi({ ...runningRemote, buildArtifact: null }, false), false);
  assert.equal(shouldPollRemoteFactoryCi({ ...runningRemote, buildArtifact: {} }, false), false);
});

test("auto CI sync never considers a local-only acceptance run", () => {
  assert.equal(shouldPollRemoteFactoryCi({
    ...runningRemote,
    buildArtifact: { remote: undefined },
  }, false), false);
});
