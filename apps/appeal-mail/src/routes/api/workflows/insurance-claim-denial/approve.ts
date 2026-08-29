import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser, getSupabaseServer } from "@/platform/supabase";
import { runReadinessReview } from "@/domain/review";
import { assemblePacket } from "@/domain/packet";

export const Route = createFileRoute("/api/workflows/insurance-claim-denial/approve")({
  server: {
    handlers: {
        POST: async ({ request }) => {
    try {
      const user = await requireAuthenticatedUser(request);
      const input = await request.json() as {
        appealId?: string;
        draft?: string;
        recipient?: { name?: string; address1?: string; address2?: string; city?: string; state?: string; zip?: string };
        mailingMethod?: "standard" | "certified" | "registered";
      };
      const appealId = input.appealId?.trim();
      if (!appealId) return Response.json({ error: "Appeal id is required." }, { status: 400 });
      const recipient = input.recipient;
      if (!recipient?.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) return Response.json({ error: "A complete mailing recipient is required." }, { status: 400 });
      if (!input.mailingMethod) return Response.json({ error: "Mailing method is required." }, { status: 400 });

      const supabase = await getSupabaseServer();
      const { data: appeal, error } = await supabase.from("appeals").select("*").eq("id", appealId).single();
      if (error || !appeal) return Response.json({ error: "Appeal case not found." }, { status: 404 });
      if (appeal.user_id !== user.id) return Response.json({ error: "You do not own this appeal case." }, { status: 403 });
      if (appeal.workflow_id !== "insurance-claim-denial") return Response.json({ error: "Appeal workflow mismatch." }, { status: 409 });

      const draft = input.draft?.trim() || appeal.draft?.trim();
      if (!draft) return Response.json({ error: "The appeal draft must be created before approval." }, { status: 409 });
      if (input.draft?.trim() && input.draft.trim() !== appeal.draft) {
        await supabase.from("appeals").update({ draft: input.draft.trim(), updated_at: new Date().toISOString(), version: (appeal.version ?? 1) + 1 }).eq("id", appealId).eq("user_id", user.id).eq("version", appeal.version ?? 1);
        appeal.draft = input.draft.trim();
        appeal.version = (appeal.version ?? 1) + 1;
      }

      const evidence = Array.isArray(appeal.evidence) ? appeal.evidence : [];
      const grounds = Array.isArray(appeal.grounds) ? appeal.grounds : [];
      const review = runReadinessReview({
        decision: appeal.decision,
        grounds,
        evidence,
        draft,
        recipient: { name: recipient.name, address1: recipient.address1, address2: recipient.address2, city: recipient.city, state: recipient.state, zip: recipient.zip },
        exhibitCount: evidence.length,
        hasSignature: /sincerely[,\s]*$/im.test(draft) || /\[your name\]/i.test(draft),
      });

      if (review.score < 80 || review.issuesRequiringAttention > 2 || review.checks.some((check) => check.status === "fail")) return Response.json({ error: "Appeal is not ready for approval.", review }, { status: 409 });

      const packet = assemblePacket({ appealId, finalLetter: draft, evidence, recipient: { name: recipient.name, address1: recipient.address1, address2: recipient.address2, city: recipient.city, state: recipient.state, zip: recipient.zip }, mailingMethod: input.mailingMethod });
      const currentVersion = appeal.version ?? 1;
      const { error: updateError } = await supabase.from("appeals").update({ status: "ready", draft, review, packet, version: currentVersion + 1, updated_at: new Date().toISOString() }).eq("id", appealId).eq("user_id", user.id).eq("version", currentVersion);
      if (updateError) throw new Error(`Unable to approve appeal: ${updateError.message}`);
      return Response.json({ ok: true, appealId, status: "ready", review, packet });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to approve appeal.";
      return Response.json({ error: message }, { status: /authentication|required|token/i.test(message) ? 401 : 502 });
    }
      },
    },
  },
});