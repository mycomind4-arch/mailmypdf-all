/**
 * Background synchronization of supervised factory GitHub CI.
 *
 * This is NOT workflow creation, publication, approval, payment, or fulfillment.
 * The stateful executor decides whether an exact tested commit may transition
 * from acceptance to explicit administrator publication review.
 */
export type FactoryPendingCiJob = Readonly<{
  id: string;
  stage: string;
  status: string;
  buildArtifact: { remote?: unknown } | null;
}>;

export function isPendingRemoteFactoryCi(
  job: FactoryPendingCiJob,
): boolean {
  return job.stage === "acceptance" &&
    job.status === "running" &&
    Boolean(job.buildArtifact?.remote);
}

export type FactoryCiSweepSummary = Readonly<{
  examined: number;
  eligible: number;
  advancedToReview: number;
  pending: number;
  failedAcceptance: number;
  errors: number;
}>;

export async function sweepFactoryRemoteCi<T extends FactoryPendingCiJob>(input: {
  list: (limit: number) => Promise<readonly T[]>;
  sync: (jobId: string) => Promise<Pick<T, "stage" | "status">>;
  limit?: number;
  onError?: (jobId: string, cause: unknown) => void;
}): Promise<FactoryCiSweepSummary> {
  const limit = input.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("Factory CI sweep limit must be an integer from 1 to 25.");
  }

  const jobs = await input.list(limit);
  if (jobs.length > limit) {
    throw new Error("Factory CI sweep returned more jobs than the requested limit.");
  }

  let eligible = 0;
  let advancedToReview = 0;
  let pending = 0;
  let failedAcceptance = 0;
  let errors = 0;
  for (const job of jobs) {
    if (!isPendingRemoteFactoryCi(job)) continue;
    eligible++;
    try {
      const result = await input.sync(job.id);
      if (result.stage === "publication_review" && result.status === "awaiting_review") {
        advancedToReview++;
      } else if (result.status === "failed") {
        failedAcceptance++;
      } else if (result.stage === "acceptance" && result.status === "running") {
        pending++;
      } else {
        // Never treat an unexpected state transition as a successful approval.
        throw new Error("Factory CI sweep encountered an unexpected job state.");
      }
    } catch (cause) {
      errors++;
      input.onError?.(job.id, cause);
    }
  }

  return Object.freeze({
    examined: jobs.length,
    eligible,
    advancedToReview,
    pending,
    failedAcceptance,
    errors,
  });
}
