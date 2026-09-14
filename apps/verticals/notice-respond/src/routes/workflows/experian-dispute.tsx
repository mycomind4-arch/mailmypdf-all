import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FAQSection } from "@/components/faq-section";
import { useAuth } from "@/lib/auth";
import { createStepMatter } from "@/lib/fns/step-matter";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { getWorkflowSEO } from "@/domain/workflow-seo";
import { DISPUTE_CATEGORY_OPTIONS, EXPERIAN_DISPUTE_PRICING } from "@/domain/step-workflows/experian-dispute";

const WORKFLOW_ID = "experian-dispute";

/**
 * SEO landing page + CTA for Experian Dispute, on the step-matter engine
 * (`/matters/$matterId/$step`) — the same engine transunion-dispute runs on
 * — instead of the old ephemeral single-page wizard this route used to
 * render (see git history). That old wizard had the exact same class of bug
 * transunion-dispute's original file had: a stray
 * `const llmAnalysis = useCombinedAnalysis("experian-dispute");` call sitting
 * at module scope between two import statements, outside any component
 * (`useCombinedAnalysis` is a React hook — calling it outside a component
 * violates the rules of hooks). It also had a second, independent bug this
 * rewrite also removes: its `handlePasteText` callback referenced a `file`
 * variable that was never defined in that closure (only `handleFileUpload`
 * had one), so pasting report text into that step would have thrown a
 * ReferenceError at runtime — a real crash the "testStatus: passing" claim
 * in workflow-master-registry.ts did not catch, because no test exercised
 * that code path.
 *
 * "Experian dispute" is an 8,100/mo search term — the second-highest-volume
 * keyword in this app's registry — so this page is written to stand on its
 * own against Experian's own dispute page, Credit Karma, and NerdWallet-style
 * guides: an accurate explanation of the FCRA process, the real investigation
 * timeline, and content those competitors don't emphasize — that Credit
 * Karma's direct-dispute feature does not cover Experian at all, and that
 * Experian's online tool is a separate system from TransUnion's or
 * Equifax's. See the FAQPage entries in `domain/workflow-seo.ts` for the
 * full 8-item FAQ, verified against experian.com and independent sources
 * rather than copied from the TransUnion page.
 */
export const Route = createFileRoute("/workflows/experian-dispute")({
  head: () => createWorkflowHead(WORKFLOW_ID),
  component: ExperianDisputeLanding,
});

const PROCESS_STEPS = [
  "Enter your name and address, and add every account or item you're disputing — each gets its own FCRA category.",
  "Upload your Experian credit report and any proof you have (identity, statements, payment records, an FTC report for identity theft).",
  "We check each disputed item against what its category actually needs to hold up in a reinvestigation, and flag what's missing.",
  "Review your generated FCRA dispute letter, referencing the exact accounts, amounts, and rights that apply to your dispute.",
  "Approve and mail it — certified mail with proof of delivery starts the 30-day investigation clock and documents when Experian received it.",
];

const DISPUTE_REASON_LABELS = DISPUTE_CATEGORY_OPTIONS.map((option) => option.label);

function ExperianDisputeLanding() {
  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-stamp transition-colors">Notice Respond</Link>
          {" › "}
          <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
          {" › "}
          <span>Experian Dispute</span>
        </div>

        <div className="postmark w-fit">FCRA credit report dispute</div>
        <h1 className="mt-4 font-serif text-4xl">Dispute inaccurate information on your Experian credit report</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Under the Fair Credit Reporting Act (FCRA), you have the right to dispute any information on your Experian
          credit report that is inaccurate, incomplete, or unverifiable — wrong balances, accounts that aren't yours,
          items that should have aged off, and more. Experian must reinvestigate within 30 days (45 days if you
          submit more information during that window) and correct or delete anything it can't verify. This workflow
          helps you identify each disputed item, match it to the right FCRA category, organize your evidence, and
          prepare a specific dispute letter — mailed with proof of delivery.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-stamp">Investigation timeline</div>
            <p className="mt-2">Experian must investigate within 30 days of receiving your dispute (45 days if you send more information during the investigation), under FCRA Section 611(a). If an item can't be verified, it must be corrected or deleted.</p>
          </div>
          <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-stamp">If Experian disagrees</div>
            <p className="mt-2">You can request the method of verification within 15 days, and if you still disagree after reinvestigation, add a personal statement of dispute (up to 100 words) to your file, under Section 611(a)(7) and 611(b)-(c).</p>
          </div>
        </div>

        <StartDisputeSection />

        <section className="mt-14 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">What we help you do</h2>
          <ol className="mt-6 space-y-4">
            {PROCESS_STEPS.map((text, i) => (
              <li key={text} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                <span className="text-sm leading-7 text-muted-foreground">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">What you can dispute</h2>
          <p className="mt-3 text-sm text-muted-foreground">You can dispute anything you believe is inaccurate, incomplete, or unverifiable, including:</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {DISPUTE_REASON_LABELS.map((label) => (
              <div key={label} className="rounded-lg border border-rule/60 bg-card p-3 text-sm text-muted-foreground">{label}</div>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">Where the dispute goes, and how the process works</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Mail is sent to <strong className="text-foreground">Experian's National Consumer Assistance Center, P.O. Box 4500, Allen, TX 75013</strong>. Certified mail with return receipt is recommended — it documents the exact date Experian received your dispute, which is when the 30-day clock starts.</p>
            <p>Experian also runs its own online tool, the <strong className="text-foreground">Experian Dispute Center</strong> (experian.com/disputes) — a separate system and account login from TransUnion's or Equifax's dispute tools. One quirk worth knowing: unlike TransUnion and Equifax, <strong className="text-foreground">Credit Karma's direct-dispute feature does not support Experian at all</strong>, so if you track your credit there, an Experian error has to be disputed with Experian directly — its site, its phone line, or by mail. Behind the scenes, all three bureaus forward disputes to the furnisher (the creditor or collector that reported the item) over the same industry-wide e-OSCAR network, review the furnisher's response, and either verify the information, correct it, or delete it if it can't be verified. You'll get written notice of the results, including the furnisher's name, address, and phone number.</p>
            <p>If an item is corrected or deleted, you can ask Experian to send the corrected report to anyone who received your report in the past six months — or the past two years, if it was pulled for employment purposes.</p>
          </div>
        </section>

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">Transparent pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              ["Preparation", `$${EXPERIAN_DISPUTE_PRICING.preparationFee.toFixed(2)}`],
              ["Included response pages", `${EXPERIAN_DISPUTE_PRICING.includedResponsePages} pages`],
              ["Extra response page", `$${EXPERIAN_DISPUTE_PRICING.responsePagePrice.toFixed(2)}/sheet`],
              ["Supporting evidence", `$${EXPERIAN_DISPUTE_PRICING.supportingPagePrice.toFixed(2)}/sheet`],
              ["Standard mail", `$${EXPERIAN_DISPUTE_PRICING.standardMail.toFixed(2)}`],
              ["Certified mail", `$${EXPERIAN_DISPUTE_PRICING.certifiedMail.toFixed(2)}`],
              ["Registered mail", `$${EXPERIAN_DISPUTE_PRICING.registeredMail.toFixed(2)}`],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-paper-deep p-4">
                <div className="text-xs text-muted-foreground">{a}</div>
                <div className="mt-1 font-semibold">{b}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">The exact price is calculated from your approved letter and exhibits. Supporting-document sheets are billed separately when included.</p>
        </section>

        {(() => {
          const seo = getWorkflowSEO(WORKFLOW_ID);
          return seo ? <FAQSection faq={seo.faq} /> : null;
        })()}

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-xl">Related workflows</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/workflows/transunion-dispute" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">TransUnion Dispute →</Link>
            <Link to="/workflows/equifax-dispute" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">Equifax Dispute →</Link>
            <Link to="/workflows" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">All Notice Respond workflows →</Link>
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Notice Respond is a document preparation and mailing tool, not a law firm or credit repair organization. We do not provide legal advice or guarantee specific credit outcomes. If your situation involves identity theft, active litigation, or a large financial loss, consider consulting a consumer law attorney.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Replaces the old ephemeral single-page wizard with the step-matter engine:
 * the CTA creates a persisted matter and hands off to
 * `/matters/$matterId/intake`, gated by auth exactly like this app's other
 * account-gated actions (see `src/lib/auth.tsx`'s `useAuth()`).
 */
function StartDisputeSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function startWorkflow() {
    const { matter } = await createStepMatter({ data: { workflowId: WORKFLOW_ID } });
    navigate({ to: "/matters/$matterId/$step", params: { matterId: matter.id, step: "intake" } });
  }

  return (
    <div id="workflow-start" className="mt-8 rounded-2xl border border-rule bg-card p-7">
      <h2 className="font-serif text-2xl">Start your dispute</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Starting price: <strong className="text-foreground">${EXPERIAN_DISPUTE_PRICING.preparationFee.toFixed(2)}</strong> plus mailing, including {EXPERIAN_DISPUTE_PRICING.includedResponsePages} response pages.
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We'll walk you through intake, documents, analysis, drafting, review, and mailing — one step at a time, with your approval required before anything is sent.
      </p>
      {user ? (
        <button type="button" className="mt-6 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90" onClick={() => void startWorkflow()}>
          Start my Experian dispute
        </button>
      ) : (
        <Link
          to={`/auth?returnTo=${encodeURIComponent("/workflows/experian-dispute")}` as never}
          className="mt-6 block w-full rounded-xl bg-foreground px-5 py-3 text-center text-sm font-semibold text-background hover:opacity-90"
        >
          Sign in to start your dispute
        </Link>
      )}
    </div>
  );
}
