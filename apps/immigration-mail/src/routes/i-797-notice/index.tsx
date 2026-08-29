import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { I797_CONTENT_PAGES } from "@/domain/i797-content";

export const Route = createFileRoute('/i-797-notice/')({
  head: () => ({
    meta: [
      { title: 'Understand Your USCIS I-797 Notice | Immigration Mail' },
      { name: 'description', content: 'Got a USCIS I-797 Notice of Action? We identify what it means and route you to the right next step.' },
    ],
    links: [{ rel: 'canonical', href: 'https://immigrationmail.com/i-797-notice' }],
  }),
  component: I797LandingPage,
});

function I797LandingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · I-797</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Understand Your USCIS I-797 Notice
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              Got a USCIS Notice of Action? Upload it and we'll tell you what it means and what to do next. You don't need to know which I-797 subtype you received.
            </p>
            <Link
              to="/respond-to-a-uscis-notice"
              className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
            >
              Upload your notice
            </Link>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl md:text-3xl mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
              What We Do
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Classify</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  We identify the I-797 subtype (A, B, C, D, E, F) and the action type — receipt, approval, RFE, NOID, denial, interview, biometrics, or transfer.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Explain</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  We explain what the notice means in plain language and identify your case status.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Route</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  We route you to the right next step — RFE response, NOID response, appeal, or just "attend your interview."
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Act</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  If action is needed, we help you prepare and mail your response with tracking and proof.
                </p>
              </div>
            </div>
          </div>
        </section>

        {I797_CONTENT_PAGES.map(page => (
          <section key={page.slug} className="bg-paper-deep/40 border-t border-rule/60">
            <div className="mx-auto max-w-4xl px-6 py-12">
              <h2 className="text-xl md:text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>{page.h1}</h2>
              <div className="space-y-2 text-ink-soft">
                {page.body.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i}>{line.trim()}</p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
