import { createClient, type User } from "@supabase/supabase-js";
import { requireWorkflowBuildAdmin } from "./workflow-build-admin";

export class PrivateOfficeAuthError extends Error {
  constructor(
    readonly status: 401 | 403 | 503,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "PrivateOfficeAuthError";
  }
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey)
    throw new PrivateOfficeAuthError(
      503,
      "MailMyPDF Account authentication is not configured.",
      "AUTH_NOT_CONFIGURED",
    );

  const authorization =
    request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new PrivateOfficeAuthError(401, "Authentication required.", "AUTH_REQUIRED");

  const token = authorization.slice(7).trim();
  if (!token)
    throw new PrivateOfficeAuthError(401, "Authentication required.", "AUTH_REQUIRED");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    throw new PrivateOfficeAuthError(401, "Invalid or expired authentication token.", "AUTH_INVALID");

  return data.user;
}

export async function requireWorkflowBuildAdministrator(request: Request): Promise<User> {
  const user = await requireAuthenticatedUser(request);
  try {
    requireWorkflowBuildAdmin(user);
  } catch {
    throw new PrivateOfficeAuthError(
      403,
      "Workflow Builder administrator access is required.",
      "WORKFLOW_BUILD_ADMIN_REQUIRED",
    );
  }
  return user;
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof PrivateOfficeAuthError)
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  return Response.json({ error: "Authentication service unavailable." }, { status: 503 });
}
