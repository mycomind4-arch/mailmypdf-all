import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { runAgentCli } from "./providers";
import type { AgentProviderName, AgentRole } from "./types";

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
    model?: string;
    instructions: string;
    priorFailure?: string;
    timeoutMs?: number;
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
    model: ctx.model,
    mode: "work",
    cwd: ctx.worktreeDir,
    prompt: promptParts.join("\n\n"),
    onOutput: ctx.onOutput,
    onProcessStart: ctx.onProcessStart,
    timeoutMs: ctx.timeoutMs,
  });
  return { exitCode: result.exitCode };
}

// -- Tester ---------------------------------------------------------------------

type AcceptanceRegistryEntry = { vertical: string; verticalDir: string };

/** Paths whose contents are authored authority copy and nothing else. A change
 * confined to these cannot alter any vertical's runtime behaviour. */
const AUTHORITY_CONTENT_PATH = "mailmypdf/src/lib/workflow-seo-entries/";

/**
 * Returns every path changed on this run's branch, or null if the diff can't
 * be read (in which case callers must assume the change is unscoped).
 */
async function changedPaths(worktreeDir: string, baseBranch: string): Promise<string[] | null> {
  const diff = await spawnAndCapture("git", ["diff", "--name-only", `${baseBranch}...HEAD`], worktreeDir, () => {});
  if (diff.exitCode !== 0) return null;
  return diff.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

export async function runTester(
  ctx: RoleRunContext & { baseBranch?: string },
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

  // A run that only authored authority copy has not touched any vertical's
  // code, so the vertical's suite can neither confirm nor refute it — and
  // several verticals carry large pre-existing failure baselines (appeal-mail
  // has ~50 failing files per context/FACTORY_STATUS.md), which would fail the
  // run before the SEO gate ever sees it. The real check for this kind of
  // change is the Authority Gate, which now blocks and which imports the
  // authored module, so a malformed or non-compiling record fails there.
  //
  // The condition is deliberately strict: EVERY changed path must be authored
  // content. Anything else, including an unreadable diff, runs the full suite.
  if (ctx.baseBranch) {
    const changed = await changedPaths(ctx.worktreeDir, ctx.baseBranch);
    if (changed && changed.length > 0 && changed.every((file) => file.startsWith(AUTHORITY_CONTENT_PATH))) {
      return {
        pass: true,
        detail:
          `Authored authority content only (${changed.length} file(s) under ${AUTHORITY_CONTENT_PATH}); ` +
          "no vertical code changed, so the vertical suite was not run. Correctness for this change is enforced by the blocking SEO/Authority Gate.",
      };
    }
  }

  // No acceptance coverage for this workflow — fall back to the vertical's own suite.
  // Filtering by bare verticalId (a pnpm package-name filter) is a trap for any
  // vertical that has migrated to the new root-level architecture: the legacy
  // apps/verticals/<id> package is very often named exactly "<id>" (unscoped),
  // while the new root-level package is "@mailmypdf/<id>" — pnpm matches by
  // exact name, so a bare filter silently resolves to the OLD package and
  // tests the wrong code (with its own unrelated pre-existing failures) while
  // reporting a false verdict on the new architecture. Resolve by path instead,
  // which is unambiguous regardless of either package's declared name.
  const newArchDir = path.join(ctx.worktreeDir, ctx.verticalId);
  const testFilter = await fileExists(path.join(newArchDir, "package.json"))
    ? `./${ctx.verticalId}`
    : `./apps/verticals/${ctx.verticalId}`;
  const result = await spawnAndCapture(
    "pnpm",
    ["--filter", testFilter, "run", "test"],
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
 * Handles three shapes, all escaped JSON *strings* nested inside an outer
 * event rather than a bare top-level object — so a plain brace-scan over the
 * outer stdout only ever finds the wrapper, not the verdict, unless each of
 * these string fields is also parsed on its own:
 * - codex's `--json` JSONL: `{"type":"item.completed","item":{"type":"agent_message","text":"..."}}`.
 * - Claude's streaming `assistant`/`message` events: `{"message":{"content":[{"type":"text","text":"..."}]}}` (handled elsewhere) — but Claude's own final
 *   `{"type":"result",...,"result":"..."}` summary event carries the same
 *   reply as a `result` string field, which a short single-turn reply
 *   (`stop_reason: "end_turn"`) can arrive as *instead of* a streamed
 *   `assistant` event — confirmed via a real run where a well-formed
 *   `{"approved":false,...}` verdict was missed because only `.item.text`/
 *   `.message.text` were checked, never `.result`.
 */
function extractLastVerdict(stdout: string): Record<string, unknown> | null {
  const candidateTexts: string[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const event = JSON.parse(trimmed);
      const text = event?.item?.text ?? event?.message?.text ?? (typeof event?.result === "string" ? event.result : undefined);
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
  ctx: RoleRunContext & { provider: AgentProviderName; model?: string; baseBranch: string; timeoutMs?: number; onProcessStart?: (kill: () => void) => void },
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
    model: ctx.model,
    timeoutMs: ctx.timeoutMs,
    mode: "chat",
    cwd: ctx.worktreeDir,
    prompt,
    onOutput: ctx.onOutput,
    onProcessStart: ctx.onProcessStart,
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

// -- Specialist review gates --------------------------------------------------

type SpecialistRole = Exclude<AgentRole, "builder" | "tester" | "reviewer" | "seo">;

const specialistFocus: Record<SpecialistRole, string> = {
  workflow_evaluator: "the end-to-end user journey, required inputs, deterministic hand-offs, useful failures, and payment or mailing completion where applicable",
  visual_qa: "the visible hierarchy, responsive layout, accessibility, empty/loading/error states, and consistency with the surrounding product",
  safety_reviewer: "privacy, authentication and authorization boundaries, untrusted input, accidental secret exposure, unsafe claims, and harmful automation",
  release_manager: "test coverage, migrations and configuration, observability, rollback risk, operational readiness, and whether this is safe to release",
  documentation: "developer and operator documentation, workflow instructions, user-facing copy, and whether changed behavior is discoverable",
  design_system: "design tokens, shared components, typography, spacing, color contrast, interaction states, and visual cohesion across the vertical",
};

/** Runs a bounded, read-only specialist gate over the change produced by the
 * Builder. Specialists deliberately cannot edit the worktree: their verdict
 * is an independent quality signal and a failed gate keeps the run ready for
 * a human decision instead of introducing competing edits. */
export async function runSpecialistReview(
  ctx: RoleRunContext & { role: SpecialistRole; provider: AgentProviderName; model?: string; baseBranch: string; timeoutMs?: number; onProcessStart?: (kill: () => void) => void },
): Promise<{ approved: boolean; comments: string[] }> {
  const diff = await spawnAndCapture("git", ["diff", `${ctx.baseBranch}...HEAD`], ctx.worktreeDir, () => {});
  const prompt = [
    `You are the ${ctx.role} specialist for the MailMyPDF ecosystem, independently evaluating a change to vertical "${ctx.verticalId}", workflow "${ctx.workflowId}".`,
    `Evaluate the diff specifically for ${specialistFocus[ctx.role]}.`,
    "Do not edit files. Report only material release blockers; do not reject a change for optional improvements.",
    "```diff",
    diff.stdout.slice(0, 20000),
    "```",
    'Respond with ONLY a single JSON object as your final message, nothing else: {"approved": boolean, "comments": string[]}.',
  ].join("\n\n");
  const result = await runAgentCli({
    provider: ctx.provider,
    model: ctx.model,
    timeoutMs: ctx.timeoutMs,
    mode: "chat",
    cwd: ctx.worktreeDir,
    prompt,
    onOutput: ctx.onOutput,
    onProcessStart: ctx.onProcessStart,
  });
  const parsed = extractLastVerdict(result.stdout);
  if (!parsed || typeof parsed.approved !== "boolean") {
    const tail = (result.stdout || result.stderr).trim().slice(-500) || "(no output captured)";
    return { approved: false, comments: [`${ctx.role} output could not be parsed as a verdict — needs human review. Last output:\n${tail}`] };
  }
  return {
    approved: parsed.approved,
    comments: Array.isArray(parsed.comments) ? parsed.comments.map(String) : [],
  };
}

// -- SEO --------------------------------------------------------------------

export type SeoFinding = { check: string; pass: boolean; detail: string; severity?: "error" | "warning" };

/** Minimum element counts for the shared WorkflowLandingPage's content sections.
 * A present-but-empty array renders an empty section, which is why these are
 * counts rather than existence checks. */
const CONFIG_LIST_FIELDS = [
  ["what-you-do", "whatYouDo", 3],
  ["what-you-need", "whatYouNeed", 3],
  ["outputs", "outputs", 2],
  ["faqs", "faqs", 4],
  ["workflow-steps", "workflowSteps", 4],
  ["ready-items", "readyItems", 3],
] as const;

/**
 * Counts top-level elements of an array literal assigned to `field`, tracking
 * string, comment, bracket and brace state so nested objects/arrays and
 * commas inside strings don't inflate the count. Returns null when the field
 * isn't present at all.
 *
 * A regex can only answer "does `field: [` appear", which `faqs: []` satisfies
 * — the exact shape of thin config this check exists to catch.
 */
export function countArrayElements(source: string, field: string): number | null {
  const match = new RegExp(`\\b${field}\\s*:\\s*\\[`).exec(source);
  if (!match) return null;
  let index = match.index + match[0].length;
  let depth = 0;
  let elements = 0;
  // Counted per segment rather than per comma so a trailing comma —
  // near-universal in this codebase's formatting — doesn't add a phantom element.
  let segmentHasContent = false;
  let inString: string | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") { inBlockComment = false; index += 1; }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === "/" && next === "/") { inLineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { inBlockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === "`") { inString = char; segmentHasContent = true; continue; }

    if (char === "[" || char === "{" || char === "(") { depth += 1; segmentHasContent = true; continue; }
    if (char === ")" || char === "}") { depth -= 1; continue; }
    if (char === "]") {
      if (depth === 0) return segmentHasContent ? elements + 1 : elements;
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) {
      if (segmentHasContent) elements += 1;
      segmentHasContent = false;
      continue;
    }
    if (!/\s/.test(char)) segmentHasContent = true;
  }
  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks a workflow landing page against the new root-level architecture
 * (see context/CURRENT_WORK.md and packages/design-system's WorkflowLandingPage):
 * a real config.ts, actually mounted at mailmypdf/src/routes/ (a config with
 * nothing mounting it is exactly the gap CP14 exposed — see
 * context/FACTORY_STATUS.md's 2026-09-20 entry), indexable, every shared-
 * template content section populated, and listed in the sitemap.
 *
 * Every migrated vertical's root-level package directory shares its vertical
 * id (notice-respond, appeal-mail, records-request, immigration-mail), so
 * this needs no separate registry of root directories.
 */
async function runNewArchitectureSeoCheck(
  ctx: RoleRunContext & { publicPath: string },
  configSource: string,
): Promise<SeoFinding[]> {
  const findings: SeoFinding[] = [{ check: "config-file", pass: true, detail: `Found ${ctx.verticalId}/workflows/${ctx.workflowId}/config.ts.` }];

  const mountPath = path.join(ctx.worktreeDir, "mailmypdf", "src", "routes", ctx.verticalId, "workflows", ctx.workflowId, "index.tsx");
  const mounted = await fileExists(mountPath);
  findings.push({
    check: "route-mounted",
    pass: mounted,
    detail: mounted
      ? `Mounted at mailmypdf/src/routes/${ctx.verticalId}/workflows/${ctx.workflowId}/.`
      : `No mount file at mailmypdf/src/routes/${ctx.verticalId}/workflows/${ctx.workflowId}/index.tsx — TanStack Router's file-based generator only scans mailmypdf/src/routes/, so the page will not actually serve until this exists.`,
  });

  const hasStartMount = await fileExists(path.join(ctx.worktreeDir, "mailmypdf", "src", "routes", ctx.verticalId, "workflows", ctx.workflowId, "start", "index.tsx"));
  findings.push({
    check: "start-route-mounted",
    pass: hasStartMount,
    detail: hasStartMount ? "The /start execution route is mounted." : `No mount file for the /start route — visitors can't actually begin the workflow.`,
  });

  const indexable = /indexable\s*:\s*true/.test(configSource);
  findings.push({ check: "indexable", pass: indexable, detail: indexable ? "indexable: true." : "indexable is false (or missing) — search engines will be told not to index this page." });

  for (const [check, field, minimum] of CONFIG_LIST_FIELDS) {
    const count = countArrayElements(configSource, field);
    if (count === null) {
      findings.push({
        check,
        pass: false,
        detail: `${field} is missing from config.ts — the shared WorkflowLandingPage template renders nothing for that section without it.`,
      });
      continue;
    }
    findings.push({
      check,
      pass: count >= minimum,
      detail: count >= minimum
        ? `${field} has ${count} entries.`
        : `${field} has ${count} ${count === 1 ? "entry" : "entries"}, below the ${minimum} this section needs to render as anything other than a thin stub.`,
    });
  }

  const sitemapSource = await fs.readFile(path.join(ctx.worktreeDir, "mailmypdf", "src", "routes", "sitemap[.]xml.ts"), "utf8").catch(() => "");
  const inSitemap = sitemapSource.includes(`${ctx.verticalId}/workflows/${ctx.workflowId}/config`);
  findings.push({
    check: "sitemap-entry",
    pass: inSitemap,
    detail: inSitemap
      ? "Referenced from mailmypdf/src/routes/sitemap[.]xml.ts."
      : `${ctx.workflowId}'s config is not imported/listed in mailmypdf/src/routes/sitemap[.]xml.ts yet, so it won't appear in sitemap.xml even if indexable.`,
  });

  return findings;
}

/** Legacy apps/verticals/<vertical> architecture — kept for verticals not yet migrated. */
async function runLegacyArchitectureSeoCheck(ctx: RoleRunContext & { publicPath: string }): Promise<SeoFinding[]> {
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

type AuthorityGatePayload = {
  ok?: boolean;
  error?: string;
  result?: {
    id: string;
    state: string;
    score: number;
    minimumScore: number;
    substantiveWordCount: number;
    eligibleForIndexing: boolean;
    issues?: { code: string; message: string; severity: "error" | "warning" }[];
  };
  sources?: { title: string; publisher: string; url: string; kind: string }[];
};

/**
 * Runs the host app's real Authority Gate for this workflow's public page.
 *
 * The 100 indexable workflow pages are served from the authority catalog, not
 * from the new-architecture config.ts tree, so a config-only SEO check reports
 * nothing at all about them. The gate is the project's own published standard
 * (>=1200 substantive words, >=85/100 across ten dimensions, cross-page
 * duplicate and near-duplicate detection), so the agent defers to it rather
 * than inventing a second, weaker definition of "good enough".
 */
async function runAuthorityGateCheck(
  ctx: RoleRunContext & { publicPath: string },
): Promise<SeoFinding[] | null> {
  const appDir = path.join(ctx.worktreeDir, "mailmypdf");
  if (!(await fileExists(path.join(appDir, "scripts", "validate-workflow-authority.ts")))) return null;

  const run = await spawnAndCapture(
    "npx",
    ["tsx", "scripts/validate-workflow-authority.ts", "--json", "--route", ctx.publicPath],
    appDir,
    ctx.onOutput,
  );

  let payload: AuthorityGatePayload | null = null;
  for (const line of run.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      payload = JSON.parse(trimmed) as AuthorityGatePayload;
    } catch {
      // Not the verdict line — keep scanning.
    }
  }

  // No catalog record for this route: this workflow's public page is served by
  // another system, so the caller should fall through rather than fail it here.
  if (!payload || (!payload.result && payload.error)) return null;

  const result = payload.result!;
  const findings: SeoFinding[] = [
    {
      check: "authority-gate",
      pass: result.eligibleForIndexing,
      detail: result.eligibleForIndexing
        ? `Authority Gate passed: ${result.score}/${result.minimumScore} minimum, ${result.substantiveWordCount} substantive words, state ${result.state}.`
        : `Authority Gate failed: ${result.score}/100 against a ${result.minimumScore} minimum, ${result.substantiveWordCount} substantive words, state ${result.state}. The page stays noindex and out of sitemap.xml until this passes.`,
    },
  ];

  for (const gateIssue of result.issues ?? []) {
    findings.push({
      check: `authority:${gateIssue.code.toLowerCase().replace(/_/g, "-")}`,
      pass: gateIssue.severity !== "error",
      detail: gateIssue.message,
      severity: gateIssue.severity,
    });
  }

  findings.push(...(await verifySourceUrls(payload.sources ?? [])));
  return findings;
}

/**
 * Fetches every cited authority source and reports the ones that don't resolve.
 *
 * The gate validates that a source URL is well-formed HTTPS, which a confidently
 * invented URL also is. Generated authority content is exactly where fabricated
 * citations appear, and on this product's subject matter (benefits, immigration,
 * tax notices, criminal defense) a dead or wrong citation is a credibility
 * problem, not a broken link. Checked at agent time because the gate itself must
 * stay a pure, offline function.
 */
async function verifySourceUrls(
  sources: { title: string; publisher: string; url: string; kind: string }[],
): Promise<SeoFinding[]> {
  if (!sources.length) return [];
  return Promise.all(sources.map(async (source) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      let response = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        // Several .gov hosts reject requests without a browser user agent, which
        // would otherwise read as a dead citation.
        headers: { "user-agent": "Mozilla/5.0 (compatible; MailMyPDF-SEO-Agent)" },
      });
      if (response.status === 405) {
        response = await fetch(source.url, { method: "GET", redirect: "follow", signal: controller.signal });
      }
      const reachable = response.status >= 200 && response.status < 400;
      // A 403 is usually bot filtering rather than a missing page, so it is
      // surfaced for a human to confirm instead of failing the run outright.
      const ambiguous = response.status === 403 || response.status === 429;
      return {
        check: `source-url:${source.publisher}`,
        pass: reachable || ambiguous,
        severity: ambiguous ? ("warning" as const) : ("error" as const),
        detail: reachable
          ? `${source.url} resolved (${response.status}).`
          : ambiguous
            ? `${source.url} returned ${response.status}, which is usually bot filtering rather than a dead page — confirm it manually.`
            : `${source.url} returned ${response.status}. A cited authority source that does not resolve must be corrected or removed, not shipped.`,
      };
    } catch (error) {
      return {
        check: `source-url:${source.publisher}`,
        pass: false,
        severity: "error" as const,
        detail: `${source.url} could not be fetched: ${error instanceof Error ? error.message : String(error)}.`,
      };
    } finally {
      clearTimeout(timer);
    }
  }));
}

export async function runSeoCheck(ctx: RoleRunContext & { publicPath: string }): Promise<SeoFinding[]> {
  // The authority catalog owns the indexable public pages, so it is checked
  // first and its verdict stands on its own when the route is catalogued.
  const authorityFindings = await runAuthorityGateCheck(ctx);

  const newArchConfigPath = path.join(ctx.worktreeDir, ctx.verticalId, "workflows", ctx.workflowId, "config.ts");
  const configSource = await fs.readFile(newArchConfigPath, "utf8").catch(() => null);
  if (configSource !== null) {
    const configFindings = await runNewArchitectureSeoCheck(ctx, configSource);
    return [...(authorityFindings ?? []), ...configFindings];
  }
  if (authorityFindings) return authorityFindings;
  return runLegacyArchitectureSeoCheck(ctx);
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
