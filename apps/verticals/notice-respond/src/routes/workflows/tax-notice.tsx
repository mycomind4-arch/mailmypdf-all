import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FAQSection } from "@/components/faq-section";
import { useAuth } from "@/lib/auth";
import { createStepMatter } from "@/lib/fns/step-matter";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { getWorkflowSEO } from "@/domain/workflow-seo";
import { KNOWN_NOTICE_OPTIONS, TAX_NOTICE_PRICING } from "@/domain/step-workflows/tax-notice";

const WORKFLOW_ID = "tax-notice";

/**
 * SEO landing page + CTA for Tax Notice, on the step-matter engine
 * (`/matters/$matterId/$step`) instead of the old ephemeral single-page
 * wizard this route used to render (see git history).
 *
 * That old wizard's copy described this workflow as being only for
 * "a state or local tax authority" notice, while the catalog entry that
 * drives its SEO (`workflow-catalog.ts`) has always described it as
 * covering "Federal, state, or local tax notices" — a real scope mismatch
 * for a page targeting "respond to tax notice" (2,900/mo, $14 CPC), since
 * IRS notices are the single largest share of that search intent. This
 * rewrite corrects the copy to match the actual (and now much deeper)
 * scope: it explains that specific, high-volume IRS notices (CP2000, CP14,
 * CP504, CP523) have their own dedicated, more thorough workflows, and this
 * generic workflow is for every other federal, state, or local notice —
 * with the "Identify" step in the workflow itself detecting and
 * recommending the dedicated tool when your notice matches one of those
 * four.
 */
export const Route = createFileRoute("/workflows/tax-notice")({
  head: () => createWorkflowHead(WORKFLOW_ID),
  component: TaxNoticeLanding,
});

const PROCESS_STEPS = [
  "Tell us what your notice says (or paste its text) — we identify the notice type, confirm which deadline applies, and recommend a dedicated workflow instead if your notice is a CP2000, CP14, CP504, or CP523.",
  "Enter your name and address and the agency's mailing address exactly as printed on the notice, along with the facts of your situation.",
  "Upload the notice and any supporting records — returns, statements, prior correspondence, proof of payment.",
  "Choose the response path that matches what you want: dispute with evidence, request a payment plan, request a Collection Due Process hearing, petition Tax Court, or simply pay.",
  "Review your generated response letter, referencing your specific notice, facts, and the legal right behind your chosen response path.",
  "Approve and mail it — certified mail with proof of delivery documents exactly when the agency received your response.",
];

function TaxNoticeLanding() {
  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-stamp transition-colors">Notice Respond</Link>
          {" › "}
          <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
          {" › "}
          <span>Tax Notice</span>
        </div>

        <div className="postmark w-fit">Federal, state, or local tax notice</div>
        <h1 className="mt-4 font-serif text-4xl">Respond to a notice from the IRS or a state tax authority</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Tax notices come in very different shapes — a math-error correction, a proposed change to your return, a
          balance-due reminder, a final notice before levy, or an audit request — and each carries its own deadline
          and rights. This workflow identifies which kind of notice you have, tells you the deadline and rights that
          actually apply to it (not a one-size-fits-all default), and helps you prepare a documented response — mailed
          with proof of delivery. If your notice is a CP2000, CP14, CP504, or CP523, we'll point you to the dedicated,
          more thorough workflow built specifically for it.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-stamp">Deadlines vary by notice</div>
            <p className="mt-2">A math-error correction gives you 60 days to request abatement (IRC § 6213(b)(2)(A)). A formal Notice of Deficiency gives 90 days (150 if abroad) to petition Tax Court — a deadline that cannot be extended. A Final Notice of Intent to Levy or Notice of Federal Tax Lien gives 30 days to request a Collection Due Process hearing. Always confirm the exact date on your own notice.</p>
          </div>
          <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
            <div className="font-mono text-xs uppercase tracking-widest text-stamp">A common mistake</div>
            <p className="mt-2">A CP504 ("final notice before levy") does not by itself start the 30-day Collection Due Process hearing clock — that right is triggered by a later, separate notice (a Final Notice of Intent to Levy, such as Letter 1058 or LT11, or a Notice of Federal Tax Lien). CP504 offers Collection Appeals Program rights instead. We surface this distinction explicitly so you don't lose a right you thought you already had.</p>
          </div>
        </div>

        <StartTaxNoticeSection />

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
          <h2 className="font-serif text-2xl">Notice types this workflow covers</h2>
          <p className="mt-3 text-sm text-muted-foreground">Select the closest match when you start — each has its own deadline and rights guidance:</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {KNOWN_NOTICE_OPTIONS.map((option) => (
              <div key={option.value} className="rounded-lg border border-rule/60 bg-card p-3 text-sm text-muted-foreground">
                {option.label}
                {option.routeToDedicated && <span className="ml-2 text-xs text-stamp">→ dedicated workflow available</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">Already know your notice number?</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">If you already know you have a CP2000, CP14, CP504, or CP523 notice, the dedicated workflow for it will generally serve you better than the generic process here:</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/workflows/cp2000-response" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">CP2000 Response →</Link>
            <Link to="/workflows/cp14-response" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">CP14 Response →</Link>
            <Link to="/workflows/cp504-response" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">CP504 Response →</Link>
            <Link to="/workflows/cp523-response" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">CP523 Response →</Link>
          </div>
        </section>

        <section className="mt-12 border-t border-rule/60 pt-8">
          <h2 className="font-serif text-2xl">Transparent pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              ["Preparation", `$${TAX_NOTICE_PRICING.preparationFee.toFixed(2)}`],
              ["Included response pages", `${TAX_NOTICE_PRICING.includedResponsePages} pages`],
              ["Extra response page", `$${TAX_NOTICE_PRICING.responsePagePrice.toFixed(2)}/sheet`],
              ["Supporting evidence", `$${TAX_NOTICE_PRICING.supportingPagePrice.toFixed(2)}/sheet`],
              ["Standard mail", `$${TAX_NOTICE_PRICING.standardMail.toFixed(2)}`],
              ["Certified mail", `$${TAX_NOTICE_PRICING.certifiedMail.toFixed(2)}`],
              ["Registered mail", `$${TAX_NOTICE_PRICING.registeredMail.toFixed(2)}`],
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
            <Link to="/workflows/irs-notice" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">General IRS Notice →</Link>
            <Link to="/workflows/code-enforcement" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">Code Enforcement →</Link>
            <Link to="/workflows" className="rounded-full border border-rule px-4 py-2 hover:border-stamp/40 transition-colors">All Notice Respond workflows →</Link>
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Notice Respond is a document preparation and mailing tool, not a law firm or tax preparer, and does not provide legal or tax advice. Deadlines and rights described here are general information verified against IRS guidance — always confirm the exact deadline and instructions printed on your own notice. If your situation involves a large balance, an active levy, or a filed lawsuit, consider consulting a CPA, enrolled agent, or tax attorney, or contacting the Taxpayer Advocate Service.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Replaces the old ephemeral single-page wizard with the step-matter engine:
 * the CTA creates a persisted matter and hands off to
 * `/matters/$matterId/identify` (this workflow's first step), gated by auth
 * exactly like this app's other account-gated actions (see `src/lib/auth.tsx`'s
 * `useAuth()`).
 */
function StartTaxNoticeSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function startWorkflow() {
    const { matter } = await createStepMatter({ data: { workflowId: WORKFLOW_ID } });
    navigate({ to: "/matters/$matterId/$step", params: { matterId: matter.id, step: "identify" } });
  }

  return (
    <div id="workflow-start" className="mt-8 rounded-2xl border border-rule bg-card p-7">
      <h2 className="font-serif text-2xl">Start your response</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Starting price: <strong className="text-foreground">${TAX_NOTICE_PRICING.preparationFee.toFixed(2)}</strong> plus mailing, including {TAX_NOTICE_PRICING.includedResponsePages} response pages.
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We'll walk you through identifying your notice, intake, documents, choosing a response strategy, drafting, review, and mailing — one step at a time, with your approval required before anything is sent.
      </p>
      {user ? (
        <button type="button" className="mt-6 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90" onClick={() => void startWorkflow()}>
          Start my tax notice response
        </button>
      ) : (
        <Link
          to={`/auth?returnTo=${encodeURIComponent("/workflows/tax-notice")}` as never}
          className="mt-6 block w-full rounded-xl bg-foreground px-5 py-3 text-center text-sm font-semibold text-background hover:opacity-90"
        >
          Sign in to start your response
        </Link>
      )}
    </div>
  );
}
