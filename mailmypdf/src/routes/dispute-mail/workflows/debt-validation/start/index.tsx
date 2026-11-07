// Thin host mount for the draft-only debt-validation workflow.
// This route does not approve a packet, initiate checkout, or submit mail.
// The canonical UI lives in dispute-mail/workflows/debt-validation/start.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase, ensureSupabase } from "@/integrations/supabase/client";
import { DebtValidationStart } from "../../../../../../../dispute-mail/workflows/debt-validation/start";

export const Route = createFileRoute("/dispute-mail/workflows/debt-validation/start/")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await ensureSupabase();
    if (!supabase.auth) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  component: DebtValidationStart,
});
