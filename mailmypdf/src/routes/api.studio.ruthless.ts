import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminFactoryAccessError } from "@/studio/access";
import { ruthlessRequest, RuthlessUnavailableError, type RuthlessReadAction } from "@/studio/platform/ruthless-client.server";

const idSchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{3,150}$/);
const startSchema = z.object({
  action: z.literal("start"),
  question: z.string().trim().min(8).max(4000),
  budgetUSD: z.number().min(1).max(50),
  mode: z.enum(["QUICK", "STANDARD", "DEEP", "FORENSIC"]),
}).strict();
const interveneSchema = z.object({
  action: z.literal("intervene"),
  id: idSchema,
  instruction: z.string().trim().min(2).max(4000),
}).strict();
const simpleSchema = z.object({
  action: z.enum(["pause", "resume", "refresh", "reopen"]),
  id: idSchema,
}).strict();
const cacheHeaders = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

function unavailable(error: unknown): Response {
  return Response.json({
    error: error instanceof RuthlessUnavailableError ? error.message : "Investigation service unavailable.",
  }, { status: 503, headers: cacheHeaders });
}

export const Route = createFileRoute("/api/studio/ruthless")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await adminFactoryAccessError(request);
        if (denied) return denied;
        const url = new URL(request.url);
        const action = url.searchParams.get("action");
        const id = url.searchParams.get("id");
        if (!["health", "list", "state", "events", "runs", "cost"].includes(action ?? "")) {
          return Response.json({ error: "Invalid investigation read action." }, { status: 400, headers: cacheHeaders });
        }
        if (!["health", "list"].includes(action!) && !idSchema.safeParse(id).success) {
          return Response.json({ error: "Invalid investigation ID." }, { status: 400, headers: cacheHeaders });
        }
        try {
          const result = await ruthlessRequest(action as RuthlessReadAction, {}, id ?? undefined);
          return Response.json(result, { headers: cacheHeaders });
        } catch (error) { return unavailable(error); }
      },
      POST: async ({ request }) => {
        const denied = await adminFactoryAccessError(request);
        if (denied) return denied;
        if (Number(request.headers.get("content-length") ?? 0) > 9000) {
          return Response.json({ error: "Request too large." }, { status: 413, headers: cacheHeaders });
        }
        const raw = await request.text();
        if (raw.length > 9000) return Response.json({ error: "Request too large." }, { status: 413, headers: cacheHeaders });
        let value: unknown;
        try { value = JSON.parse(raw); } catch {
          return Response.json({ error: "Expected valid JSON." }, { status: 400, headers: cacheHeaders });
        }
        const parsed = z.union([startSchema, interveneSchema, simpleSchema]).safeParse(value);
        if (!parsed.success) return Response.json({ error: "Invalid or unsafe investigation action or parameters." }, { status: 400, headers: cacheHeaders });
        const body = parsed.data;
        try {
          const result = body.action === "start"
            ? await ruthlessRequest("start", { question: body.question, mode: body.mode, budgetUSD: body.budgetUSD })
            : body.action === "intervene"
              ? await ruthlessRequest("intervene", { instruction: body.instruction }, body.id)
              : await ruthlessRequest(body.action, body.action === "reopen" ? { trigger: "Studio administrator requested reopening" } : {}, body.id);
          return Response.json(result, { headers: cacheHeaders });
        } catch (error) { return unavailable(error); }
      },
    },
  },
});
