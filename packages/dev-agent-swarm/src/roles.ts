import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { runAgentCli } from "./providers";
import type { AgentProviderName } from "./types";

export type RoleRunContext = {
  worktreeDir: string;
  repoRoot: string;
  verticalId: string;
  workflowId: string;
  onOutput: (chunk: string, stream: "stdout" | "stderr") => void;
};

// -- Builder ------------------------------------------------------------------

export async function runBuilder(
  ctx: RoleRunContext & {
    provider: AgentProviderName;
    instructions: string;
    priorFailure?: string;
    onProcessStart?: (kill: () => void) => void;
  },
): Promise<{ exitCode: number | null }> {
  const promptParts = [
    `You are the Builder agent for the MailMyPDF ecosystem, working in vertical "${ctx.verticalId}" on workflow "${ctx.workflowId}".`,
    `Task: ${ctx.instructions}`,
    "Make the necessary code changes directly in this working directory and commit your work with git as you go (small, well-described commits). Do not push anywhere.",
  ];
  if (ctx.priorFailure) {
    promptParts.push(`A previous attempt at this task failed with the following. Fix it:\n${ctx.priorFailure}`);
  }
  const result = await runAgentCli({
    provider: ctx.provider,
    mode: "work",
    cwd: ctx.worktreeDir,
    prompt: promptParts.join("\n\n"),
    onOutput: ctx.onOutput,
    onProcessStart: ctx.onProcessStart,
  });
  return { exitCode: result.exitCode };
}

// -- Tester ---------------------------------------------------------------------

type AcceptanceRegistryEntry = { vertical: string; verticalDir: string };

export async function runTester(
  ctx: RoleRunContext,
): Promise<{ pass: boolean; detail: string }> {
  const registryPath = path.join(ctx.worktreeDir, "packages", "workflow-acceptance", "registry", "workflows.json");
  let registry: Record<string, AcceptanceRegistryEntry> = {};
  try {
    registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
  } catch {
    // No registry readable — fall through to the vertical's own test suite below.
  }

  if (registry[ctx.workflowId]) {
    const cliPath = path.join(ctx.worktreeDir, "packages", "workflow-acceptance", "bin", "studio.mjs");
    const result = await spawnAndCapture(
      process.execPath,
      [cliPath, "workflow", "test", ctx.workflowId, "--json", "--all-scenarios"],
      ctx.worktreeDir,
      ctx.onOutput,
    );
    if (result.exitCode === 0) return { pass: true, detail: "Acceptance test passed." };
    if (result.exitCode === 1) return { pass: false, detail: result.stdout || "Acceptance test reported failures." };
    return { pass: false, detail: `Acceptance test infrastructure error (exit ${result.exitCode}).\n${result.stderr}` };
  }

  // No acceptance coverage for this workflow — fall back to the vertical's own suite.
  const result = await spawnAndCapture(
    "pnpm",
    ["--filter", ctx.verticalId, "run", "test"],
    ctx.worktreeDir,
    ctx.onOutput,
  );
  return { pass: result.exitCode === 0, detail: result.exitCode === 0 ? "Test suite passed." : `${result.stdout}\n${result.stderr}` };
}

// -- Reviewer -------------------------------------------------------------------

/** Finds every balanced {...} span in text (tracking string/escape state so
 * nested braces and braces inside string literals don't break the scan) and
 * returns the ones that parse as JSON, in the order they appear. */
function findJsonObjects(text: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") { if (depth === 0) start = i; depth += 1; }
    else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          found.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // Not valid JSON on its own — skip.
        }
        start = -1;
      }
    }
  }
  return found;
}

/**
 * Extracts the Reviewer's verdict from a provider's raw CLI output.
 * Handles two shapes: codex's `--json` JSONL, where the model's actual reply
 * is nested as an escaped JSON *string* inside an
 * `{"type":"item.completed","item":{"type":"agent_message","text":"..."}}`
 * event (so a plain brace-scan over the outer stdout finds the wrapper, not
 * the verdict, unless we also parse the text field) — and a plainer format
 * (e.g. Claude's) where the verdict may just be the final object in stdout.
 */
function extractLastVerdict(stdout: string): Record<string, unknown> | null {
  const candidateTexts: string[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const event = JSON.parse(trimmed);
      const text = event?.item?.text ?? event?.message?.text;
      if (typeof text === "string") candidateTexts.push(text);
    } catch {
      // Not a JSONL event line — ignore.
    }
  }
  // Most recent agent message first, then fall back to the raw stdout itself.
  for (const candidate of [...candidateTexts.reverse(), stdout]) {
    const objects = findJsonObjects(candidate);
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      if (typeof objects[i].approved === "boolean") return objects[i];
    }
  }
  return null;
}

export async function runReviewer(
  ctx: RoleRunContext & { provider: AgentProviderName; baseBranch: string },
): Promise<{ approved: boolean; comments: string[] }> {
  const diff = await spawnAndCapture("git", ["diff", `${ctx.baseBranch}...HEAD`], ctx.worktreeDir, () => {});
  const prompt = [
    `You are the Reviewer agent for the MailMyPDF ecosystem, reviewing a change to vertical "${ctx.verticalId}", workflow "${ctx.workflowId}".`,
    "Review this diff for correctness, safety, and quality:",
    "```diff",
    diff.stdout.slice(0, 20000),
    "```",
    'Respond with ONLY a single JSON object as your final message, nothing else: {"approved": boolean, "comments": string[]}.',
  ].join("\n\n");

  const result = await runAgentCli({
    provider: ctx.provider,
    mode: "chat",
    cwd: ctx.worktreeDir,
    prompt,
    onOutput: ctx.onOutput,
  });

  const parsed = extractLastVerdict(result.stdout);
  if (!parsed || typeof parsed.approved !== "boolean") {
    const tail = (result.stdout || result.stderr).trim().slice(-500) || "(no output captured)";
    return {
      approved: false,
      comments: [`Reviewer output could not be parsed as a verdict — needs human review. Last output:\n${tail}`],
    };
  }
  const comments = Array.isArray(parsed.comments) ? parsed.comments.map(String) : [];
  return { approved: parsed.approved, comments };
}

// -- SEO --------------------------------------------------------------------

export type SeoFinding = { check: string; pass: boolean; detail: string };

export async function runSeoCheck(ctx: RoleRunContext & { publicPath: string }): Promise<SeoFinding[]> {
  const findings: SeoFinding[] = [];
  const verticalDir = path.join(ctx.worktreeDir, "apps", "verticals", ctx.verticalId);
  const routeFile = path.join(verticalDir, "src", "routes", "workflows", `${ctx.workflowId}.tsx`);

  let source = "";
  try {
    source = await fs.readFile(routeFile, "utf8");
  } catch {
    findings.push({ check: "route-file", pass: false, detail: `No route file found at ${routeFile}.` });
    return findings;
  }

  const hasTitle = /title\s*[:=]/i.test(source) || /<title>/i.test(source);
  findings.push({ check: "title-tag", pass: hasTitle, detail: hasTitle ? "A title is set." : "No title/meta title found in the route file." });

  const hasDescription = /description\s*[:=]/i.test(source);
  findings.push({ check: "meta-description", pass: hasDescription, detail: hasDescription ? "A description is set." : "No meta description found in the route file." });

  const sitemapPath = path.join(verticalDir, "public", "sitemap.xml");
  let inSitemap = false;
  try {
    const sitemap = await fs.readFile(sitemapPath, "utf8");
    inSitemap = sitemap.includes(ctx.publicPath);
  } catch {
    // No sitemap file at all — reported as a finding below.
  }
  findings.push({
    check: "sitemap-entry",
    pass: inSitemap,
    detail: inSitemap ? "Listed in sitemap.xml." : `${ctx.publicPath} was not found in ${sitemapPath}.`,
  });

  return findings;
}

// -- shared helper ------------------------------------------------------------

function spawnAndCapture(
  command: string,
  args: string[],
  cwd: string,
  onOutput: (chunk: string, stream: "stdout" | "stderr") => void,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      onOutput(chunk.toString("utf8"), "stdout");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      onOutput(chunk.toString("utf8"), "stderr");
    });
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
    child.on("error", (error) => resolve({ exitCode: null, stdout, stderr: stderr + String(error) }));
  });
}
