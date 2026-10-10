/**
 * UI-only CI synchronization gate. Checking GitHub CI is read-only with respect
 * to publication: the server may record acceptance but can never approve or
 * merge a proposal. Unattended/background scheduling remains a separate task.
 */
export const FACTORY_CI_POLL_INTERVAL_MS = 30_000;

export type FactoryCiPollCandidate = {
  stage: string;
  status: string;
  buildArtifact: { remote?: unknown } | null;
};

export function shouldPollRemoteFactoryCi(
  job: FactoryCiPollCandidate | null,
  actionPending: boolean,
): boolean {
  return Boolean(
    job &&
    !actionPending &&
    job.stage === "acceptance" &&
    job.status === "running" &&
    job.buildArtifact?.remote,
  );
}
