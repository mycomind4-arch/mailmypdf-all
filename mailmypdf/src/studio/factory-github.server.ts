import {
  buildReviewedFactoryRepositoryPlan,
  type FactoryAcceptanceCheck,
  type FactoryJob,
  type FactoryJobBuildArtifact,
  type WorkflowSeed,
} from "@mailmypdf/workflows";
import { GitHubRepositoryProvider } from "@mailmypdf/vertical-foundry";

const DEFAULT_FACTORY_REPOSITORY = "mycomind4-arch/mailmypdf-all";
const REQUIRED_FACTORY_CHECKS = Object.freeze([
  "Factory generated workflow verification",
  "Shared capability verification",
  "Records Request verification",
  "Public workflow landing gate",
  "Workspace UI verification",
] as const);

function factoryRepository(): string {
  return (
    process.env.FACTORY_GITHUB_REPOSITORY?.trim() ||
    DEFAULT_FACTORY_REPOSITORY
  );
}

function githubProvider(): GitHubRepositoryProvider {
  const token =
    process.env.GITHUB_ACCESS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Factory GitHub execution requires GITHUB_ACCESS_TOKEN or GITHUB_TOKEN.",
    );
  }
  return new GitHubRepositoryProvider({ token });
}

function branchName(job: FactoryJob): string {
  if (!job.build) throw new Error("Factory job has no reviewed build recipe.");
  const compactId = job.id.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 48);
  return `factory/generated/${compactId}-${job.build.slug}`.slice(0, 180);
}

function parseWorkflowSeeds(content: string): readonly WorkflowSeed[] {
  const value = JSON.parse(content) as unknown;
  if (!Array.isArray(value)) {
    throw new Error("Live canonical workflow registry is not an array.");
  }
  return value as readonly WorkflowSeed[];
}

export async function createFactoryAcceptanceArtifact(
  job: FactoryJob,
): Promise<FactoryJobBuildArtifact> {
  if (job.stage !== "acceptance" || !job.build || job.build.artifact) {
    throw new Error("Factory job is not ready to create an isolated acceptance artifact.");
  }

  const repository = factoryRepository();
  const provider = githubProvider();
  const repositoryInfo = await provider.validateRepository(repository);
  if (!repositoryInfo.exists || !repositoryInfo.defaultBranch) {
    throw new Error(`Factory repository ${repository} is unavailable.`);
  }

  const baseBranch = repositoryInfo.defaultBranch;
  const { sha: baseCommitSha } = await provider.getBranchSha(
    repository,
    baseBranch,
  );
  const registryFile = await provider.getFile(
    repository,
    "packages/workflows/src/canonical-workflows.json",
    baseCommitSha,
  );
  if (!registryFile) {
    throw new Error("Factory repository is missing the canonical workflow registry.");
  }

  const plan = buildReviewedFactoryRepositoryPlan(
    job.build.request,
    parseWorkflowSeeds(registryFile.content),
  );

  // New-template automation must never silently adopt or overwrite workflow
  // files already present on the live base branch. Central registry/inventory
  // files are the only intentional replacements in this patch.
  const centralPaths = new Set([
    "packages/workflows/src/canonical-workflows.json",
    "mailmypdf/WORKFLOW_INVENTORY.json",
  ]);
  for (const file of plan.files) {
    if (centralPaths.has(file.path)) continue;
    const existing = await provider.getFile(repository, file.path, baseCommitSha);
    if (existing) {
      throw new Error(
        `Factory refuses to overwrite existing workflow file ${file.path}.`,
      );
    }
  }

  const branch = branchName(job);
  const created = await provider.createBranch(repository, branch, baseBranch);
  let commitSha: string;

  if (created.created) {
    const commit = await provider.createTree(
      repository,
      branch,
      plan.files.map((file) => ({
        path: file.path,
        content: file.content,
      })),
      `Factory: materialize ${plan.build.canonicalId}`,
    );
    commitSha = commit.commitSha;
  } else {
    const existing = await provider.getBranchSha(repository, branch);
    if (existing.sha === baseCommitSha) {
      const commit = await provider.createTree(
        repository,
        branch,
        plan.files.map((file) => ({
          path: file.path,
          content: file.content,
        })),
        `Factory: materialize ${plan.build.canonicalId}`,
      );
      commitSha = commit.commitSha;
    } else {
      for (const file of plan.files) {
        const observed = await provider.getFile(repository, file.path, existing.sha);
        if (!observed || observed.content !== file.content) {
          throw new Error(
            `Existing factory branch ${branch} does not exactly match the reviewed build plan at ${file.path}.`,
          );
        }
      }
      commitSha = existing.sha;
    }
  }

  const pullRequest =
    (await provider.findOpenPullRequestByHead(repository, branch, baseBranch)) ??
    (await provider.createPullRequest(
      repository,
      branch,
      baseBranch,
      `Factory: ${plan.build.request.label}`,
      [
        "## Supervised workflow-factory candidate",
        "",
        `Canonical workflow: \`${plan.build.canonicalId}\``,
        `Family: \`${plan.build.request.startTemplate}\``,
        `Factory job: \`${job.id}\``,
        "",
        "This pull request was materialized from an administrator-reviewed factory recipe.",
        "Public copy is scaffold-only and non-indexable. CI acceptance must pass before Studio can present publication review.",
        "",
        "No payment, mailing, deployment, or merge is performed by this build step.",
      ].join("\n"),
    ));

  return Object.freeze({
    repository,
    branch,
    baseCommitSha,
    commitSha,
    pullRequestNumber: pullRequest.number,
    pullRequestUrl: pullRequest.url,
  });
}

export async function checkFactoryAcceptance(
  job: FactoryJob,
): Promise<Readonly<{
  state: "pending" | "success" | "failure";
  checks: readonly FactoryAcceptanceCheck[];
}>> {
  const artifact = job.build?.artifact;
  if (job.stage !== "acceptance" || !artifact) {
    throw new Error("Factory job has no isolated acceptance artifact.");
  }

  const provider = githubProvider();
  const status = await provider.getCommitStatus(
    artifact.repository,
    artifact.commitSha,
  );
  const byName = new Map<string, (typeof status.checks)[number]>();
  for (const check of status.checks) {
    if (!byName.has(check.context)) byName.set(check.context, check);
  }
  const checks: FactoryAcceptanceCheck[] = REQUIRED_FACTORY_CHECKS.map((context) => {
    const observed = byName.get(context);
    return observed
      ? Object.freeze({
          context,
          state: observed.state,
          ...(observed.description ? { description: observed.description } : {}),
        })
      : Object.freeze({
          context,
          state: "pending" as const,
          description: "Required workflow has not reported for this commit yet.",
        });
  });

  if (checks.some((check) => check.state === "failure" || check.state === "error")) {
    return Object.freeze({ state: "failure", checks: Object.freeze(checks) });
  }
  if (checks.every((check) => check.state === "success")) {
    return Object.freeze({ state: "success", checks: Object.freeze(checks) });
  }
  return Object.freeze({ state: "pending", checks: Object.freeze(checks) });
}
