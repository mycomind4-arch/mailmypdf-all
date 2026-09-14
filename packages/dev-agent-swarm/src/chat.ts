import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runsDir, runDir, appendEvent, git, prepareWorktree } from "./orchestrator";
import { runAgentCli, extractProviderSessionId, extractReplyText } from "./providers";
import { runTester, runReviewer, runSeoCheck } from "./roles";
import type { AgentProviderName, ChatSession, ChatMessage, RunEvent } from "./types";

// An interactive counterpart to orchestrator.ts's batch runs: one persistent
// worktree per session, driven turn-by-turn like the real `claude`/`codex`
// CLIs, with Tester/Reviewer/SEO available as on-demand gates rather than an
// automatic pipeline. Lives in the same `.agent-runs/<id>/` layout as a batch
// run (see prepareWorktree/runDir in orchestrator.ts) — a session.json next
// to the worktree and events.jsonl instead of a run.json.

const activeChats = new Map<string, { kill: () => void }>();

function sessionJsonPath(repoRoot: string, sessionId: string): string {
  return path.join(runDir(repoRoot, sessionId), "session.json");
}

async function writeSession(repoRoot: string, session: ChatSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(sessionJsonPath(repoRoot, session.sessionId), JSON.stringify(session, null, 2));
}

export async function getChatSession(repoRoot: string, sessionId: string): Promise<ChatSession | null> {
  try {
    return JSON.parse(await fs.readFile(sessionJsonPath(repoRoot, sessionId), "utf8"));
  } catch {
    return null;
  }
}

/** Lists chat sessions for Studio's session picker, most recently active first. */
export async function listChatSessions(repoRoot: string): Promise<ChatSession[]> {
  const dir = runsDir(repoRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const sessions = await Promise.all(entries.map((id) => getChatSession(repoRoot, id)));
  return sessions.filter((session): session is ChatSession => session !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function chatEventsLogPath(repoRoot: string, sessionId: string): string {
  return path.join(runDir(repoRoot, sessionId), "events.jsonl");
}

export function stopChatMessage(sessionId: string): boolean {
  const active = activeChats.get(sessionId);
  if (!active) return false;
  active.kill();
  activeChats.delete(sessionId);
  return true;
}

/** Starts a new chat session: prepares its worktree (same setup a batch run gets) and returns it ready for the first message. */
export async function startChatSession(input: {
  repoRoot: string;
  verticalId: string;
  workflowId: string;
  publicPath?: string;
  provider?: AgentProviderName;
}): Promise<ChatSession> {
  const sessionId = `chat-${input.workflowId}-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
  const branch = `agent/chat-${input.workflowId}-${sessionId.split("-").pop()}`;
  const worktreeDir = path.join(runDir(input.repoRoot, sessionId), "work");

  const session: ChatSession = {
    sessionId,
    verticalId: input.verticalId,
    workflowId: input.workflowId,
    publicPath: input.publicPath,
    branch,
    worktreeDir,
    provider: input.provider ?? "codex",
    providerSessionIds: {},
    messages: [],
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(runDir(input.repoRoot, sessionId), { recursive: true });
  await fs.writeFile(path.join(runDir(input.repoRoot, sessionId), "events.jsonl"), "");
  await writeSession(input.repoRoot, session);

  const emit = (role: RunEvent["role"], type: string, detail?: string) =>
    appendEvent(input.repoRoot, sessionId, { at: new Date().toISOString(), role, type, detail });

  const prepared = await prepareWorktree(input.repoRoot, worktreeDir, branch, emit);
  session.status = "idle";
  if (!prepared.pass) {
    session.messages.push({
      id: randomUUID(),
      role: "system",
      content: `Could not prepare a workspace for this session: ${prepared.detail}`,
      at: new Date().toISOString(),
    });
  }
  await writeSession(input.repoRoot, session);
  return session;
}

/** Sends one message to the session's active (or explicitly chosen) provider, resuming its native session if this isn't the first turn with that provider. */
export async function sendChatMessage(input: {
  repoRoot: string;
  sessionId: string;
  message: string;
  provider?: AgentProviderName;
  model?: string;
  timeoutMs?: number;
}): Promise<ChatSession> {
  const session = await getChatSession(input.repoRoot, input.sessionId);
  if (!session) throw new Error(`Unknown chat session "${input.sessionId}".`);

  const provider = input.provider ?? session.provider;
  session.provider = provider;
  session.status = "running";
  session.messages.push({ id: randomUUID(), role: "user", content: input.message, at: new Date().toISOString() });
  await writeSession(input.repoRoot, session);

  const emit = (role: RunEvent["role"], type: string, detail?: string) =>
    appendEvent(input.repoRoot, session.sessionId, { at: new Date().toISOString(), role, type, detail });
  await emit("builder", "message.started", `via ${provider}`);

  const result = await runAgentCli({
    provider,
    model: input.model,
    mode: "work",
    cwd: session.worktreeDir,
    prompt: input.message,
    resumeSessionId: session.providerSessionIds[provider],
    timeoutMs: input.timeoutMs,
    onOutput: (chunk) => void emit("builder", "output", chunk),
    onProcessStart: (kill) => activeChats.set(session.sessionId, { kill }),
  });
  activeChats.delete(session.sessionId);

  const newProviderSessionId = extractProviderSessionId(result.stdout, provider);
  if (newProviderSessionId) session.providerSessionIds[provider] = newProviderSessionId;

  const replyText =
    extractReplyText(result.stdout, provider) ||
    (result.exitCode === 0
      ? "(No reply text — see the log below for what changed.)"
      : `The ${provider} CLI exited with code ${result.exitCode}. See the log below.`);

  session.messages.push({ id: randomUUID(), role: "assistant", content: replyText, at: new Date().toISOString(), provider });
  session.status = "idle";
  await emit("builder", "message.finished", `exit code ${result.exitCode}`);
  await writeSession(input.repoRoot, session);
  return session;
}

export type ChatGate = "tester" | "reviewer" | "seo";

/** Runs one on-demand quality gate against a session's current worktree, appending a system message with the result. */
export async function runChatGate(input: {
  repoRoot: string;
  sessionId: string;
  gate: ChatGate;
  provider?: AgentProviderName;
  model?: string;
}): Promise<ChatSession> {
  const session = await getChatSession(input.repoRoot, input.sessionId);
  if (!session) throw new Error(`Unknown chat session "${input.sessionId}".`);
  session.status = "running";
  await writeSession(input.repoRoot, session);

  const emit = (role: RunEvent["role"], type: string, detail?: string) =>
    appendEvent(input.repoRoot, session.sessionId, { at: new Date().toISOString(), role, type, detail });

  let summary: string;
  if (input.gate === "tester") {
    await emit("tester", "role.started");
    const result = await runTester({
      worktreeDir: session.worktreeDir,
      repoRoot: input.repoRoot,
      verticalId: session.verticalId,
      workflowId: session.workflowId,
      onOutput: (chunk) => void emit("tester", "output", chunk),
    });
    summary = `Tester: ${result.pass ? "PASS" : "FAIL"}\n${result.detail}`;
    await emit("tester", "role.finished", summary);
  } else if (input.gate === "reviewer") {
    const provider = input.provider ?? session.provider;
    const baseBranch = (await git(input.repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim() || "main";
    await emit("reviewer", "role.started", `via ${provider}`);
    const result = await runReviewer({
      worktreeDir: session.worktreeDir,
      repoRoot: input.repoRoot,
      verticalId: session.verticalId,
      workflowId: session.workflowId,
      provider,
      model: input.model,
      baseBranch,
      onOutput: (chunk) => void emit("reviewer", "output", chunk),
    });
    summary = `Reviewer: ${result.approved ? "APPROVED" : "CHANGES REQUESTED"}${result.comments.length ? `\n${result.comments.join("\n")}` : ""}`;
    await emit("reviewer", "role.finished", summary);
  } else {
    await emit("seo", "role.started");
    const findings = await runSeoCheck({
      worktreeDir: session.worktreeDir,
      repoRoot: input.repoRoot,
      verticalId: session.verticalId,
      workflowId: session.workflowId,
      publicPath: session.publicPath ?? `/workflows/${session.workflowId}`,
      onOutput: (chunk) => void emit("seo", "output", chunk),
    });
    const pass = findings.every((finding) => finding.pass);
    summary = `SEO: ${pass ? "PASS" : "ISSUES FOUND"}\n${findings.map((finding) => `${finding.pass ? "✓" : "✗"} ${finding.check}: ${finding.detail}`).join("\n")}`;
    await emit("seo", "role.finished", summary);
  }

  const systemMessage: ChatMessage = { id: randomUUID(), role: "system", content: summary, at: new Date().toISOString() };
  session.messages.push(systemMessage);
  session.status = "idle";
  await writeSession(input.repoRoot, session);
  return session;
}
