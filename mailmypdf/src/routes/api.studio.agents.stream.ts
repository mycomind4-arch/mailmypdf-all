import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";
import { runEventsLogPath } from "@mailmypdf/dev-agent-swarm";

const TERMINAL_STATUSES = new Set(["merged", "needs_human", "failed", "cancelled"]);

function sse(data: string): string {
  return `data: ${data}\n\n`;
}

export const Route = createFileRoute("/api/studio/agents/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;

        const runId = new URL(request.url).searchParams.get("runId");
        if (!runId || !/^[A-Za-z0-9_.-]+$/.test(runId)) {
          return Response.json({ error: "A valid runId is required." }, { status: 400 });
        }

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);
        const logPath = runEventsLogPath(repoRoot, runId);
        const runJsonPath = logPath.replace(/events\.jsonl$/, "run.json");

        const { promises: fs } = await import("node:fs");
        const encoder = new TextEncoder();
        let offset = 0;
        let closed = false;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const tick = async () => {
              if (closed) return;
              try {
                const stat = await fs.stat(logPath);
                if (stat.size > offset) {
                  const handle = await fs.open(logPath, "r");
                  const length = stat.size - offset;
                  const buffer = Buffer.alloc(length);
                  await handle.read(buffer, 0, length, offset);
                  await handle.close();
                  offset = stat.size;
                  for (const line of buffer.toString("utf8").split("\n")) {
                    if (line.trim()) controller.enqueue(encoder.encode(sse(line)));
                  }
                }
              } catch {
                // Log file not written yet — retry on the next tick.
              }

              try {
                const runState = JSON.parse(await fs.readFile(runJsonPath, "utf8"));
                if (TERMINAL_STATUSES.has(runState.status)) {
                  controller.enqueue(encoder.encode(sse(JSON.stringify({ role: "orchestrator", type: "stream.closed" }))));
                  controller.close();
                  closed = true;
                  return;
                }
              } catch {
                // Not written yet either — keep polling.
              }
            };

            await tick();
            const interval = setInterval(() => void tick(), 1000);
            request.signal.addEventListener("abort", () => {
              closed = true;
              clearInterval(interval);
              try { controller.close(); } catch { /* already closed */ }
            });
          },
        });

        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
        });
      },
    },
  },
});
