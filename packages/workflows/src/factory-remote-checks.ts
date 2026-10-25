/**
 * Evaluate GitHub Actions evidence for a supervised factory proposal.
 *
 * An old acceptance snapshot never authorizes publication by itself. The
 * currently reported required workflow runs must all succeed for the exact
 * proposal commit. A missing, pending, cancelled or failed run blocks.
 *
 * GitHub's Actions runs endpoint is newest-first. For reruns of the same
 * workflow on the same SHA, only the first (latest) reported run is relevant.
 */
export type FactoryRemoteCheck = Readonly<{
  context: string;
  state: "success" | "failure" | "pending" | "error";
}>;

export type FactoryRemoteReadiness = Readonly<{
  ready: boolean;
  blockedContexts: readonly string[];
}>;

export function evaluateFactoryRemoteChecks(
  requiredContexts: readonly string[],
  reported: readonly FactoryRemoteCheck[],
): FactoryRemoteReadiness {
  const latest = new Map<string, FactoryRemoteCheck>();
  for (const check of reported) {
    if (!latest.has(check.context)) latest.set(check.context, check);
  }
  const blockedContexts = [...new Set(requiredContexts)].filter(
    (context) => latest.get(context)?.state !== "success",
  );
  return Object.freeze({
    ready: requiredContexts.length > 0 && blockedContexts.length === 0,
    blockedContexts: Object.freeze(blockedContexts),
  });
}
