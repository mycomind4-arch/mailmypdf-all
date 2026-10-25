import assert from "node:assert/strict";
import test from "node:test";
import {
  isPendingRemoteFactoryCi,
  sweepFactoryRemoteCi,
  type FactoryPendingCiJob,
} from "../src/studio/factory-ci-scheduler";

const remote: FactoryPendingCiJob = {
  id: "remote-1",
  stage: "acceptance",
  status: "running",
  buildArtifact: { remote: { repository: "owner/repo" } },
};

test("background sweep only processes remote acceptance, never unreviewed or local jobs", async () => {
  const calls: string[] = [];
  const jobs = [
    remote,
    { ...remote, id: "local", buildArtifact: {} },
    { ...remote, id: "review", stage: "publication_review", status: "awaiting_review" },
    { ...remote, id: "queued", status: "queued" },
  ];
  const result = await sweepFactoryRemoteCi({
    list: async (limit) => {
      assert.equal(limit, 20);
      return jobs;
    },
    sync: async (id) => {
      calls.push(id);
      return { stage: "publication_review", status: "awaiting_review" };
    },
  });
  assert.deepEqual(calls, ["remote-1"]);
  assert.deepEqual(result, {
    examined: 4,
    eligible: 1,
    advancedToReview: 1,
    pending: 0,
    failedAcceptance: 0,
    errors: 0,
  });
});

test("background sweep preserves pending work and reports acceptance failures separately", async () => {
  const result = await sweepFactoryRemoteCi({
    list: async () => [remote, { ...remote, id: "remote-2" }],
    sync: async (id) => id === "remote-1"
      ? { stage: "acceptance", status: "running" }
      : { stage: "acceptance", status: "failed" },
  });
  assert.equal(result.pending, 1);
  assert.equal(result.failedAcceptance, 1);
  assert.equal(result.advancedToReview, 0);
  assert.equal(result.errors, 0);
});

test("background sweep is bounded, isolates per-job errors and fails closed", async () => {
  const failures: string[] = [];
  const result = await sweepFactoryRemoteCi({
    limit: 2,
    list: async () => [remote, { ...remote, id: "remote-2" }],
    sync: async (id) => {
      if (id === "remote-1") throw new Error("The default branch moved.");
      return { stage: "complete", status: "completed" };
    },
    onError: id => failures.push(id),
  });
  assert.deepEqual(failures, ["remote-1", "remote-2"]);
  assert.equal(result.errors, 2);
  assert.equal(result.advancedToReview, 0);
  await assert.rejects(
    sweepFactoryRemoteCi({ limit: 26, list: async () => [], sync: async () => ({ stage: "acceptance", status: "running" }) }),
    /integer from 1 to 25/,
  );
  await assert.rejects(
    sweepFactoryRemoteCi({ limit: 1, list: async () => [remote, remote], sync: async () => ({ stage: "acceptance", status: "running" }) }),
    /more jobs/,
  );
});

test("unreviewed or invalid factory jobs are never eligible", () => {
  assert.equal(isPendingRemoteFactoryCi(remote), true);
  assert.equal(isPendingRemoteFactoryCi({ ...remote, buildArtifact: null }), false);
  assert.equal(isPendingRemoteFactoryCi({ ...remote, buildArtifact: {} }), false);
  assert.equal(isPendingRemoteFactoryCi({ ...remote, status: "completed" }), false);
  assert.equal(isPendingRemoteFactoryCi({ ...remote, stage: "template_review" }), false);
});
