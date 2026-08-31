import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const DOCUMENT_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/6e68c3354_generated_image.png";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Notice Respond" },
      { name: "description", content: "How Notice Respond works: upload your document, prepare your response, and mail it with tracking and proof of delivery." },
    ],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="postmark w-fit">How It Works</div>
            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              Understand the notice. Build the response. Send it with proof.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Notice Respond guides you through preparing, reviewing, and mailing your response — with tracking and proof of delivery through MailMyPDF.
            </p>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { num: "01", title: "Upload your document", desc: "Share the notice, decision, or document you received. The system analyzes it to identify key facts, deadlines, and requirements." },
                { num: "02", title: "Prepare your response", desc: "Answer guided questions about your situation. Review the draft, approve the exact version, and choose your mailing method." },
                { num: "03", title: "Mail with proof", desc: "Choose Standard, Certified, or Registered mail. We print, envelope, and send via USPS with tracking and proof of delivery." },
              ].map((step) => (
                <div key={step.num} className="rounded-xl border border-rule bg-card p-6">
                  <div className="font-mono text-2xl text-stamp">{step.num}</div>
                  <h2 className="mt-3 font-serif text-2xl">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="eyebrow">Trust Architecture</div>
                <h2 className="mt-3 font-serif text-3xl">You stay in control at every step.</h2>
                <ul className="mt-6 space-y-3">
                  {[
                    "The notice is the source material — nothing is fabricated",
                    "Your facts remain under your control",
                    "AI assists; it does not decide or approve",
                    "You review the response before approval",
                    "Approval applies to the exact draft version",
                    "Payment is distinct from authorization",
                    "Mailing creates a documented correspondence event",
                    "Proof remains available after mailing",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-xl border border-rule">
                <img
                  src={DOCUMENT_IMAGE}
                  alt="Layered archival papers and correspondence"
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="font-serif text-3xl sm:text-4xl">Ready to start?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Find your workflow or upload a notice and let the system identify it.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                Explore workflows →
              </Link>
              <Link to="/workflows/analyze" className="rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink/30">
                Analyze a notice
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  ),
});
