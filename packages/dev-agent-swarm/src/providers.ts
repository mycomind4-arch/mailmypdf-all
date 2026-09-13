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
  const { provider, mode, cwd, prompt } = options;
  if (provider === "codex") {
    // read-only ("chat") vs workspace-write ("work") maps directly onto
    // codex's own sandbox flag — see plan's "Chat vs. work mode routing".
    const sandbox = mode === "chat" ? "read-only" : "workspace-write";
    return { command: "codex", args: ["exec", "-C", cwd, "-s", sandbox, "--json", prompt] };
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
    ],
  };
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
