// build: redeploy with live stripe + lob config
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// ── Scheduled (Cron) Handler ───────────────────────────────────────────────────
//
// Cloudflare Workers fires the `scheduled` event when a cron trigger fires.
// We route it to our internal proof-processor endpoint, which handles:
// 1. Pending webhook retries (proof-of-service webhook delivery)
// 2. Expired response windows (legal notice cure periods)
// 3. (Future) Reconciliation of stale communications with Lob
//
// The endpoint requires Bearer auth via MAILMYPDF_CLEANUP_SECRET.
// We read the secret from the Worker environment (env object).

interface ScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry?: boolean;
}

interface WorkerEnv {
  MAILMYPDF_CLEANUP_SECRET?: string;
  MAILMYPDF_BASE_URL?: string;
  [key: string]: unknown;
}

async function handleScheduled(
  controller: ScheduledController,
  env: WorkerEnv,
  ctx: { waitUntil: (promise: Promise<unknown>) => void },
): Promise<void> {
  const cleanupSecret = env.MAILMYPDF_CLEANUP_SECRET;
  if (!cleanupSecret) {
    console.error("[scheduled] MAILMYPDF_CLEANUP_SECRET not set — skipping cron tasks");
    return;
  }

  // Determine the base URL — use the env var or fall back to the deployed URL
  const baseUrl = env.MAILMYPDF_BASE_URL || "https://mailmypdf.mailmypdf.workers.dev";

  console.log(`[scheduled] cron "${controller.cron}" fired — calling proof-processor`);

  try {
    const response = await fetch(`${baseUrl}/api/internal/proof-processor`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanupSecret}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[scheduled] proof-processor returned ${response.status}: ${body}`);
    } else {
      const result = await response.json().catch(() => ({}));
      console.log(`[scheduled] proof-processor completed:`, result);
    }
  } catch (error) {
    console.error(`[scheduled] failed to call proof-processor:`, error);
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  // Cloudflare Workers scheduled event handler (cron triggers)
  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ) {
    await handleScheduled(controller, env, ctx);
  },
};
