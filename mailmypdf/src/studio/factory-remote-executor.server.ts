import type {
  FactoryBuildArtifact,
  FactoryBuildCheck,
  FactoryJob,
  WorkflowSeed,
} from "@mailmypdf/workflows";
import { GitHubRepositoryProvider } from "@mailmypdf/vertical-foundry";
import { findStudioProject } from "@/studio/domain/studio-project";
import {
  buildFactoryProposalPlan,
  profileRegistryPaths,
  type GeneratedNoticeResponseProfile,
  type GeneratedRecordsRequestProfile,
} from "@/studio/factory-proposal-plan";
import {
  failPersistentFactoryAcceptance,
  loadPersistentFactoryJob,
  recordPersistentFactoryAcceptance,
  recordPersistentFactoryBuildArtifact,
  recordPersistentFactoryPublication,
  startPersistentFactoryAcceptance,
} from "@/studio/factory-job.server";

const REQUIRED_COMMON_CHECKS = Object.freeze([
  "Factory generated workflow verification",
  "Shared capability verification",
  "Public workflow landing gate",
  "Workspace UI verification",
] as const);

function repositoryFromUrl(value: string): string {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Remote factory execution currently supports github.com repositories only.");
  }
  const parts = url.pathname
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.git$/, "")
    .split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Studio project GitHub repository URL is invalid.");
  }
  return `${parts[0]}/${parts[1]}`;
}

function githubProvider(): GitHubRepositoryProvider {
  const token =
    process.env.GITHUB_ACCESS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Remote factory execution requires GITHUB_ACCESS_TOKEN or GITHUB_TOKEN.",
    );
  }
  return new GitHubRepositoryProvider({ token });
}

function assertSupportedBuild(job: FactoryJob): asserts job is FactoryJob & {
  build: NonNullable<FactoryJob["build"]>;
} {
  if (!job.build) throw new Error("Factory build recipe is missing.");
  const { request, slug } = job.build;
  if (
    request.startTemplate !== "records-request" &&
    request.startTemplate !== "notice-response"
  ) {
    throw new Error(
      `Remote factory execution does not support ${request.startTemplate}.`,
    );
  }
  if (
    !request.adoptExisting &&
    request.startTemplate === "records-request" &&
    !slug.endsWith("-records-request")
  ) {
    throw new Error(
      "Generated Records Request workflow IDs must end in -records-request.",
    );
  }
  if (
    !request.adoptExisting &&
    request.startTemplate === "notice-response" &&
    !slug.endsWith("-response")
  ) {
    throw new Error(
      "Generated Notice Respond workflow IDs must end in -response.",
    );
  }
  if (request.startTemplate === "notice-response" && !request.noticeProfile) {
    throw new Error(
      "Notice Respond remote builds require a reviewer-authored noticeProfile.",
    );
  }
}

function parseJsonArray<T>(content: string, label: string): readonly T[] {
  const value = JSON.parse(content) as unknown;
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a JSON array.`);
  }
  return value as readonly T[];
}

function remoteBranchName(job: FactoryJob & {
  build: NonNullable<FactoryJob["build"]>;
}): string {
  return `factory/remote-${job.id.slice(0, 8)}-${job.build.slug}`.slice(0, 220);
}

function requiredChecks(job: FactoryJob): readonly string[] {
  const family = job.build?.request.startTemplate;
  const familyCheck =
    family === "records-request"
      ? "Records Request verification"
      : family === "notice-response"
        ? "Notice Respond package verification"
        : null;
  if (!familyCheck) {
    throw new Error("Remote factory CI is not configured for this workflow family.");
  }
  return Object.freeze([...REQUIRED_COMMON_CHECKS, familyCheck]);
}

function checkToBuildCheck(input: {
  context: string;
  state: "success" | "failure" | "pending" | "error";
  description?: string;
}): FactoryBuildCheck {
  return Object.freeze({
    id: input.context,
    command: `github-actions:${input.context}`,
    ok: input.state === "success",
    summary: input.description ?? input.state,
  });
}

async function exactPlanMatchesRemoteBranch(input: {
  provider: GitHubRepositoryProvider;
  repository: string;
  baseSha: string;
  headSha: string;
  desiredFiles: readonly Readonly<{ path: string; content: string }>[];
  changedPaths: readonly string[];
}): Promise<boolean> {
  const changed = [...await input.provider.compareChangedFiles(
    input.repository,
    input.baseSha,
    input.headSha,
  )].sort();
  const expected = [...input.changedPaths].sort();
  if (
    changed.length !== expected.length ||
    changed.some((path, index) => path !== expected[index])
  ) {
    return false;
  }
  for (const file of input.desiredFiles) {
    const observed = await input.provider.getFile(
      input.repository,
      file.path,
      input.headSha,
    );
    if (!observed || observed.content !== file.content) return false;
  }
  return true;
}

export async function startRemoteFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
}): Promise<FactoryJob> {
  let job = await loadPersistentFactoryJob(input.jobId);
  if (!job) throw new Error("Factory job was not found.");

  if (job.stage === "acceptance" && job.status === "queued") {
    job = await startPersistentFactoryAcceptance({
      jobId: job.id,
      actorId: input.actorId,
    });
  } else if (
    !(
      job.stage === "acceptance" &&
      job.status === "running" &&
      !job.buildArtifact
    )
  ) {
    throw new Error(
      "Factory job is not ready for remote acceptance execution.",
    );
  }
  assertSupportedBuild(job);

  const project = findStudioProject("mailmypdf");
  if (!project) throw new Error("MailMyPDF Studio project is not configured.");
  const repository = repositoryFromUrl(project.repoUrl);
  const provider = githubProvider();
  const repositoryInfo = await provider.validateRepository(repository);
  if (!repositoryInfo.exists) {
    throw new Error(`Factory repository ${repository} is unavailable.`);
  }

  const { sha: baseSha } = await provider.getBranchSha(
    repository,
    project.defaultBranch,
  );
  const canonicalFile = await provider.getFile(
    repository,
    "packages/workflows/src/canonical-workflows.json",
    baseSha,
  );
  if (!canonicalFile) {
    throw new Error("Factory repository is missing the canonical workflow registry.");
  }

  const registry = profileRegistryPaths(job);
  const profileFile = await provider.getFile(repository, registry.specs, baseSha);
  if (!profileFile) {
    throw new Error(`Factory repository is missing ${registry.specs}.`);
  }

  const workflowRoot = `${job.build.sectionId}/workflows/${job.build.slug}`;
  const configPath = `${workflowRoot}/config.ts`;
  const specPath = `${workflowRoot}/workflow.spec.json`;
  const [existingConfigFile, existingSpecFile] = await Promise.all([
    provider.getFile(repository, configPath, baseSha),
    provider.getFile(repository, specPath, baseSha),
  ]);

  const canonicalSeeds = parseJsonArray<WorkflowSeed>(
    canonicalFile.content,
    "Canonical workflow registry",
  );
  const profileSpecs = parseJsonArray<
    GeneratedRecordsRequestProfile | GeneratedNoticeResponseProfile
  >(profileFile.content, "Generated profile specs");

  const plan = buildFactoryProposalPlan({
    job,
    canonicalSeeds,
    profileSpecs,
    existingConfig: existingConfigFile?.content ?? null,
    existingSpec: existingSpecFile?.content ?? null,
  });

  if (!job.build.request.adoptExisting) {
    const central = new Set([
      registry.specs,
      registry.generated,
      "packages/workflows/src/canonical-workflows.json",
      "mailmypdf/WORKFLOW_INVENTORY.json",
    ]);
    for (const file of plan.files) {
      if (central.has(file.path)) continue;
      const existing = await provider.getFile(repository, file.path, baseSha);
      if (existing) {
        throw new Error(
          `Remote factory refuses to overwrite existing workflow file ${file.path}.`,
        );
      }
    }
  }

  const filesToWrite: Array<Readonly<{ path: string; content: string }>> = [];
  for (const file of plan.files) {
    const existing = await provider.getFile(repository, file.path, baseSha);
    if (!existing || existing.content !== file.content) {
      filesToWrite.push(file);
    }
  }
  if (filesToWrite.length === 0) {
    throw new Error("Remote factory proposal produced no changed files.");
  }

  const branch = remoteBranchName(job);
  const created = await provider.createBranchAtSha(repository, branch, baseSha);
  let commitSha: string;
  if (created.created) {
    const commit = await provider.createTree(
      repository,
      branch,
      plan.files,
      `Factory proposal: ${plan.canonicalId}`,
    );
    commitSha = commit.commitSha;
  } else {
    const existing = await provider.getBranchSha(repository, branch);
    if (existing.sha === baseSha) {
      const commit = await provider.createTree(
        repository,
        branch,
        filesToWrite,
        `Factory proposal: ${plan.canonicalId}`,
      );
      commitSha = commit.commitSha;
    } else {
      const matches = await exactPlanMatchesRemoteBranch({
        provider,
        repository,
        baseSha,
        headSha: existing.sha,
        desiredFiles: plan.files,
        changedPaths: filesToWrite.map((file) => file.path),
      });
      if (!matches) {
        throw new Error(
          `Existing remote factory branch ${branch} does not exactly match the reviewed proposal plan.`,
        );
      }
      commitSha = existing.sha;
    }
  }

  const pullRequest =
    (await provider.findOpenPullRequestByHead(
      repository,
      branch,
      project.defaultBranch,
    )) ??
    (await provider.createPullRequest(
      repository,
      branch,
      project.defaultBranch,
      `Factory: ${job.build.request.label}`,
      [
        "## Remote supervised workflow-factory proposal",
        "",
        `Factory job: \`${job.id}\``,
        `Canonical workflow: \`${plan.canonicalId}\``,
        `Base commit: \`${baseSha}\``,
        `Proposal commit: \`${commitSha}\``,
        "",
        "This pull request was created from an administrator-reviewed factory recipe.",
        "GitHub Actions acceptance must pass before Studio can advance it to publication review.",
        "",
        "The factory did not merge, deploy, charge, or mail anything.",
      ].join("\n"),
    ));

  const artifact: FactoryBuildArtifact = Object.freeze({
    branch,
    baseSha,
    commitSha,
    specPath: plan.specPath,
    profileRegistryPath: plan.profileRegistryPath,
    configPath: plan.configPath,
    changedFiles: Object.freeze(filesToWrite.map((file) => file.path)),
    checks: Object.freeze([]),
    builtAt: new Date().toISOString(),
    remote: Object.freeze({
      repository,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.url,
    }),
  });

  return recordPersistentFactoryBuildArtifact({
    jobId: job.id,
    actorId: input.actorId,
    artifact,
  });
}

export async function syncRemoteFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
}): Promise<FactoryJob> {
  const job = await loadPersistentFactoryJob(input.jobId);
  if (!job) throw new Error("Factory job was not found.");
  if (
    job.stage !== "acceptance" ||
    job.status !== "running" ||
    !job.buildArtifact?.remote
  ) {
    throw new Error("Factory job has no remote acceptance run to synchronize.");
  }

  const provider = githubProvider();
  const status = await provider.getCommitStatus(
    job.buildArtifact.remote.repository,
    job.buildArtifact.commitSha,
  );
  const byName = new Map<string, (typeof status.checks)[number]>();
  for (const check of status.checks) {
    if (!byName.has(check.context)) byName.set(check.context, check);
  }

  const required = requiredChecks(job);
  const observed = required.map((context) => byName.get(context) ?? null);
  const failed = observed.filter(
    (check): check is NonNullable<typeof check> =>
      Boolean(check && (check.state === "failure" || check.state === "error")),
  );
  if (failed.length > 0) {
    return recordPersistentFactoryAcceptance({
      jobId: job.id,
      actorId: input.actorId,
      checks: Object.freeze(failed.map(checkToBuildCheck)),
    });
  }

  if (
    observed.some(
      (check) => !check || check.state === "pending",
    )
  ) {
    return job;
  }

  return recordPersistentFactoryAcceptance({
    jobId: job.id,
    actorId: input.actorId,
    checks: Object.freeze(
      observed
        .filter((check): check is NonNullable<typeof check> => Boolean(check))
        .map(checkToBuildCheck),
    ),
  });
}

export async function approveRemoteFactoryPublication(input: {
  jobId: string;
  actorId: string;
}): Promise<FactoryJob> {
  const job = await loadPersistentFactoryJob(input.jobId);
  if (!job) throw new Error("Factory job was not found.");
  if (
    job.stage !== "publication_review" ||
    job.status !== "awaiting_review" ||
    job.review.reason !== "generated-workflow-publication" ||
    !job.buildArtifact?.remote
  ) {
    throw new Error("Factory job is not ready for remote publication approval.");
  }
  if (
    job.buildArtifact.checks.length === 0 ||
    job.buildArtifact.checks.some((check) => !check.ok)
  ) {
    throw new Error("Remote publication approval requires passing acceptance checks.");
  }

  const project = findStudioProject("mailmypdf");
  if (!project) throw new Error("MailMyPDF Studio project is not configured.");
  const provider = githubProvider();
  const remoteHead = await provider.getBranchSha(
    job.buildArtifact.remote.repository,
    job.buildArtifact.branch,
  );
  if (remoteHead.sha !== job.buildArtifact.commitSha) {
    throw new Error("Remote factory branch moved after acceptance.");
  }
  const pullRequest = await provider.findOpenPullRequestByHead(
    job.buildArtifact.remote.repository,
    job.buildArtifact.branch,
    project.defaultBranch,
  );
  if (
    !pullRequest ||
    pullRequest.number !== job.buildArtifact.remote.pullRequestNumber ||
    pullRequest.url !== job.buildArtifact.remote.pullRequestUrl
  ) {
    throw new Error("Accepted remote factory pull request is no longer open.");
  }

  return recordPersistentFactoryPublication({
    jobId: job.id,
    actorId: input.actorId,
    artifact: Object.freeze({
      repository: job.buildArtifact.remote.repository,
      branch: job.buildArtifact.branch,
      commitSha: job.buildArtifact.commitSha,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.url,
      publishedAt: new Date().toISOString(),
    }),
  });
}

export async function failRemoteFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
  message: string;
}): Promise<FactoryJob> {
  return failPersistentFactoryAcceptance({
    jobId: input.jobId,
    actorId: input.actorId,
    code: "REMOTE_FACTORY_ACCEPTANCE_FAILED",
    message: input.message,
  });
}
