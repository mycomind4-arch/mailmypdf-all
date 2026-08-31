/* ═══════════════════════════════════════════════════════════
   MailMyPDF Control Plane — AI Configuration Resolver (logic)

   Pure logic extracted for testing.  The route file in ai.ts
   wraps this with createFileRoute + server.handlers.

   Default model: gemini-3.6-flash (current stable Gemini flash)
   Per-task model overrides via GEMINI_MODEL_DRAFT, etc.
   ═══════════════════════════════════════════════════════════ */

export interface ControlPlaneRequest {
  verticalSlug?: string;
  workflowSlug?: string;
  task?: string;
}

export interface AIConfigResponse {
  provider: "gemini";
  apiKey: string;
  model: string;
  promptOverride: string | null;
}

export function resolveControlPlaneConfig(
  body: ControlPlaneRequest,
): AIConfigResponse {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new ControlPlaneError(
      "Gemini API key is not configured. Set GEMINI_API_KEY in the control plane environment.",
      503,
    );
  }

  const defaultModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const task = body.task || "analysis";

  // Per-task model overrides (optional, falls back to GEMINI_MODEL)
  const taskModel =
    task === "draft" || task === "revision"
      ? process.env.GEMINI_MODEL_DRAFT || defaultModel
      : task === "validation"
        ? process.env.GEMINI_MODEL_VALIDATION || defaultModel
        : process.env.GEMINI_MODEL_ANALYSIS || defaultModel;

  return {
    provider: "gemini",
    apiKey: geminiKey,
    model: taskModel,
    promptOverride: null,
  };
}

export function validateControlPlaneToken(authHeader: string): boolean {
  const expectedToken = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
  if (!expectedToken) return false;
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  return !!bearer && bearer === expectedToken;
}

export class ControlPlaneError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function handleControlPlaneRequest(
  request: Request,
): Promise<Response> {
  try {
    // ── Authentication ──────────────────────────────────
    const expectedToken = process.env.MAILMYPDF_CONTROL_PLANE_TOKEN;
    if (!expectedToken) {
      return Response.json(
        { error: "Control plane is not configured (missing token)." },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!validateControlPlaneToken(authHeader)) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    // ── Parse request ───────────────────────────────────
    let body: ControlPlaneRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    // ── Resolve AI provider ────────────────────────────
    const config = resolveControlPlaneConfig(body);
    return Response.json(config);
  } catch (error) {
    if (error instanceof ControlPlaneError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Control plane resolver error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
