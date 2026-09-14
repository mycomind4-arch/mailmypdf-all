import { spawn } from "node:child_process";
import type { AgentMode, AgentProviderName } from "./types";

const availability = new Map<AgentProviderName, boolean>();

/** Checks (and caches) whether a provider's CLI is actually on PATH. */
export async function isProviderAvailable(provider: AgentProviderName): Promise<boolean> {
  if (availability.has(provider)) return availability.get(provider)!;
  const binary = provider === "claude" ? "claude" : "codex";
  const available = await new Promise<boolean>((resolve) => {
    const check = spawn("which", [binary]);
    check.on("close", (code) => resolve(code === 0));
    check.on("error", () => resolve(false));
  });
  availability.set(provider, available);
  return available;
}

export type AgentCallOptions = {
  provider: AgentProviderName;
  mode: AgentMode;
  cwd: string;
  prompt: string;
  model?: string;
  /** The provider's own session/thread id to continue, if this isn't the first turn. */
  resumeSessionId?: string;
  /** Wall-clock timeout in ms before the process is killed. */
  timeoutMs?: number;
  onOutput?: (chunk: string, stream: "stdout" | "stderr") => void;
  /** Called once the process has been spawned, with a function to kill it early. */
  onProcessStart?: (kill: () => void) => void;
};

export type AgentCallResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function buildCommand(options: AgentCallOptions): { command: string; args: string[] } {
  const { provider, mode, cwd, prompt, model, resumeSessionId } = options;
  if (provider === "codex") {
    // read-only ("chat") vs workspace-write ("work") maps directly onto
    // codex's own sandbox flag — see plan's "Chat vs. work mode routing".
    // `codex exec resume` is its own subcommand with its own flag set — it
    // does NOT accept -C/-s (it reuses the resumed session's original
    // workspace and sandbox), so those must be omitted, not just reordered.
    const sandbox = mode === "chat" ? "read-only" : "workspace-write";
    if (resumeSessionId) {
      return { command: "codex", args: ["exec", "resume", resumeSessionId, "--json", ...(model ? ["--model", model] : []), prompt] };
    }
    return { command: "codex", args: ["exec", "-C", cwd, "-s", sandbox, "--json", ...(model ? ["--model", model] : []), prompt] };
  }
  // Claude has no OS-level workspace sandbox. Do not use bypassPermissions:
  // a disposable git worktree does not stop a shell command from reaching the
  // rest of the developer machine. Builder runs may edit their worktree, while
  // reviewer runs remain in plan mode. Commands that would need an interactive
  // grant are denied rather than hanging this background service.
  const permissionMode = mode === "chat" ? "plan" : "acceptEdits";
  return {
    command: "claude",
    args: [
      "-p", prompt,
      "--output-format", "stream-json",
      "--verbose",
      "--permission-mode", permissionMode,
      "--permission-prompts", "none",
      ...(model ? ["--model", model] : []),
      ...(resumeSessionId ? ["--resume", resumeSessionId] : []),
    ],
  };
}

/** Scans a provider's raw stdout for JSONL/event lines and returns any that parse. */
function parseJsonLines(stdout: string): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Not a JSON event line (e.g. an ANSI-colored log line) — ignore.
    }
  }
  return events;
}

/**
 * Extracts the provider's own session/thread id from its stdout, so a later
 * call can resume this exact conversation instead of starting fresh. Codex
 * announces it in a `thread.started` event; Claude's `system`/`init` event
 * carries `session_id` (present on every event, so the first one suffices).
 */
export function extractProviderSessionId(stdout: string, provider: AgentProviderName): string | undefined {
  const events = parseJsonLines(stdout);
  if (provider === "codex") {
    const started = events.find((event) => event.type === "thread.started");
    return typeof started?.thread_id === "string" ? started.thread_id : undefined;
  }
  const withSession = events.find((event) => typeof (event as { session_id?: unknown }).session_id === "string");
  return withSession ? (withSession as { session_id: string }).session_id : undefined;
}

/** Extracts the assistant's final reply text from a provider's raw stdout. */
export function extractReplyText(stdout: string, provider: AgentProviderName): string {
  const events = parseJsonLines(stdout);
  if (provider === "codex") {
    const messages = events.filter((event) => event.type === "item.completed" && (event.item as { type?: string })?.type === "agent_message");
    const last = messages[messages.length - 1];
    const text = (last?.item as { text?: string })?.text;
    return text ?? "";
  }
  const assistantEvents = events.filter((event) => event.type === "assistant");
  const last = assistantEvents[assistantEvents.length - 1];
  const content = (last?.message as { content?: Array<{ type?: string; text?: string }> })?.content ?? [];
  return content.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
}

/** Runs one agent CLI call to completion, streaming raw output as it arrives. */
export async function runAgentCli(options: AgentCallOptions): Promise<AgentCallResult> {
  const { cwd, timeoutMs = 15 * 60 * 1000, onOutput, onProcessStart } = options;
  const { command, args } = buildCommand(options);

  return new Promise((resolve) => {
    // stdin must be closed, not just unused: both CLIs treat a piped-but-open
    // stdin as additional input to read and append to the prompt, and will
    // hang waiting for EOF forever if we never write to or close it.
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    onProcessStart?.(() => child.kill("SIGKILL"));
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      onOutput?.(text, "stdout");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      onOutput?.(text, "stderr");
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      stderr += `\n${error instanceof Error ? error.message : String(error)}`;
      resolve({ exitCode: null, stdout, stderr, timedOut });
    });
  });
}
