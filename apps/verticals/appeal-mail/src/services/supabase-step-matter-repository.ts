import { SupabaseStepMatterRepository } from "@mailmypdf/step-workflow";

function config() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase step-matter persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }
  return { supabaseUrl, serviceRoleKey };
}

/**
 * Appeal Mail's step-matter persistence: the generic Supabase repository
 * from @mailmypdf/step-workflow, pointed at this app's own
 * appeal_mail_step_matters/_step_events tables (see supabase/migrations for
 * the schema).
 */
export const supabaseStepMatterRepository = new SupabaseStepMatterRepository({
  ...config(),
  tablePrefix: "appeal_mail",
});
