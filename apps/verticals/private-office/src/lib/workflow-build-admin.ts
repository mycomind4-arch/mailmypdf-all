export interface WorkflowBuildAdminIdentity {
  readonly id: string;
  readonly app_metadata?: Record<string, unknown>;
}

function configuredAdminIds(environment: Record<string, string | undefined>): Set<string> {
  return new Set(
    (environment.PRIVATE_OFFICE_WORKFLOW_BUILD_ADMIN_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function hasAdminRole(metadata: Record<string, unknown> | undefined): boolean {
  const role = metadata?.role;
  const roles = metadata?.roles;
  return role === "admin" || role === "super_admin"
    || (Array.isArray(roles) && roles.some((item) => item === "admin" || item === "super_admin"));
}

/**
 * Authorization for consequential workflow-factory actions.
 *
 * This intentionally reads only app_metadata and server configuration. Supabase
 * user_metadata is user-editable and must never grant an administrative role.
 */
export function isWorkflowBuildAdmin(
  user: WorkflowBuildAdminIdentity,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return configuredAdminIds(environment).has(user.id) || hasAdminRole(user.app_metadata);
}

export function requireWorkflowBuildAdmin(
  user: WorkflowBuildAdminIdentity,
  environment: Record<string, string | undefined> = process.env,
): void {
  if (!isWorkflowBuildAdmin(user, environment))
    throw new Error("Workflow Builder administrator access is required.");
}
