import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Benefits Appeal" },
      { name: "description", content: "Common questions about Benefits Appeal: what it does, what it doesn't do, pricing, deadlines, and mailing." },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/faq" }],
  }),
  component: () => {
    const faqs = [
      { q: "Is Benefits Appeal a law firm?", a: "No. Benefits Appeal provides document preparation and mailing assistance. It is not a law firm and does not provide legal advice." },
      { q: "Can Benefits Appeal guarantee my appeal will win?", a: "No. We never promise an outcome. We help you organize your evidence and build a factual, source-grounded appeal. The decision is made by the agency or hearing officer." },
      { q: "What types of benefits denials can I appeal?", a: "SSDI, SSI, Social Security, unemployment, EDD, Medicaid, SNAP/food stamps, VA benefits, housing benefits, disability benefits, overpayment notices, and general reconsideration requests." },
      { q: "How much does it cost?", a: "Mailing starts at $4.99 for Standard mail ($14.94 Certified, $32.49 Registered). Workflow preparation is separate and starts at $14.99. No subscription required." },
      { q: "How do I know my deadline?", a: "Upload your denial letter. The system extracts the decision date and deadline. Always verify against the source document — deadlines are strict and vary by program." },
      { q: "Does the AI invent facts or medical evidence?", a: "No. AI never invents facts, eligibility, diagnoses, or outcomes. Every claim in your appeal is traced to a source document you provide." },
      { q: "Can I review the draft before it's mailed?", a: "Yes. You review and approve the appeal letter word by word. Nothing is mailed until you explicitly approve it." },
    ];
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="eyebrow">FAQ</div>
          <h1 className="mt-3 font-serif text-4xl">Frequently asked questions.</h1>
          <div className="mt-10 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-rule bg-paper-deep/30 p-6">
                <h2 className="font-serif text-lg">{faq.q}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </main>
        <SiteFooter />
      </>
    );
  },
});
