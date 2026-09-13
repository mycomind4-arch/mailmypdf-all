import { mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { TraceEvent } from "./types.js";

/**
 * Owns one acceptance run's directory under
 * <vertical>/tests/runs/<workflowId>/<scenarioId>/<runId>/ and every
 * artifact written into it. Never overwrites a previous run -- each run gets
 * the next zero-padded run id for that workflow+scenario pair.
 */
export class ArtifactStore {
  readonly runId: string;
  readonly runDir: string;
  private readonly trace: TraceEvent[] = [];
  private readonly startedAtMs = Date.now();

  private constructor(runDir: string, runId: string) {
    this.runDir = runDir;
    this.runId = runId;
  }

  /** Computes the next zero-padded run id for a workflow+scenario, without creating anything. */
  static nextRunId(runsRoot: string, workflowId: string, scenarioId: string): string {
    const scenarioRunsDir = join(runsRoot, workflowId, scenarioId);
    const existing = existsSync(scenarioRunsDir) ? readdirSync(scenarioRunsDir) : [];
    const nextNumber = existing
      .map((name) => Number.parseInt(name, 10))
      .filter((n) => Number.isFinite(n))
      .reduce((max, n) => Math.max(max, n), 0) + 1;
    return String(nextNumber).padStart(4, "0");
  }

  /**
   * `explicitRunId` lets a CLI wrapper compute the run id up front (before
   * spawning the test process that will actually create this store) so it
   * knows where to find report.json afterward without parsing stdout.
   */
  static create(runsRoot: string, workflowId: string, scenarioId: string, explicitRunId?: string): ArtifactStore {
    const scenarioRunsDir = join(runsRoot, workflowId, scenarioId);
    mkdirSync(scenarioRunsDir, { recursive: true });
    const runId = explicitRunId ?? ArtifactStore.nextRunId(runsRoot, workflowId, scenarioId);
    const runDir = join(scenarioRunsDir, runId);
    for (const sub of ["generated", "packet", "screenshots", "logs"]) {
      mkdirSync(join(runDir, sub), { recursive: true });
    }
    return new ArtifactStore(runDir, runId);
  }

  path(...segments: string[]): string {
    return join(this.runDir, ...segments);
  }

  writeJson(relativePath: string, data: unknown): string {
    const full = this.path(relativePath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, JSON.stringify(data, null, 2), "utf8");
    return full;
  }

  writeBytes(relativePath: string, data: Uint8Array): string {
    const full = this.path(relativePath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, data);
    return full;
  }

  writeText(relativePath: string, text: string): string {
    const full = this.path(relativePath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, text, "utf8");
    return full;
  }

  record(event: string, detail?: Record<string, unknown>): void {
    this.trace.push({ event, at: new Date().toISOString(), detail });
  }

  /** Records an event with the duration of an async step. */
  async timed<T>(event: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.trace.push({ event, at: new Date().toISOString(), durationMs: Date.now() - start });
      return result;
    } catch (error) {
      this.trace.push({
        event: `${event}_failed`,
        at: new Date().toISOString(),
        durationMs: Date.now() - start,
        detail: { error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  flushTrace(): string {
    return this.writeJson("trace.json", this.trace);
  }

  get elapsedMs(): number {
    return Date.now() - this.startedAtMs;
  }
}
