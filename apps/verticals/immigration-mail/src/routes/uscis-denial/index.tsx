import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DENIAL_CONTENT_PAGES } from "@/domain/denial-content";

export const Route = createFileRoute('/uscis-denial/')({
  head: () => ({
    meta: [
      { title: 'Respond to a USCIS Denial — Appeal, Motion, or Reapply | Immigration Mail' },
      { name: 'description', content: 'USCIS denied your case? We help you understand the denial, evaluate your options, and prepare and mail your response with tracking and proof.' },
    ],
    links: [{ rel: 'canonical', href: 'https://immigrationmail.com/uscis-denial' }],
  }),
  component: DenialLandingPage,
});

function DenialLandingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · Denial Response</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Respond to a USCIS Denial
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              USCIS denied your case. You may have options — appeal, motion to reopen, motion to reconsider, or reapply. Upload your denial notice and we'll help you figure out the best path.
            </p>
            <Link
              to="/respond-to-a-uscis-notice"
              className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
            >
              Upload your denial notice
            </Link>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl md:text-3xl mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
              Your Options After a Denial
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Appeal</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Ask the AAO or BIA to review the decision. Must be filed within 30 days.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Motion to Reopen</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Ask USCIS to reconsider based on new facts or evidence not previously available.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Motion to Reconsider</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Argue USCIS made an error in law or fact in the original decision.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Reapply</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  File a new application with better evidence if the appeal is weak.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-paper-deep/40 border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <h2 className="text-xl md:text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Deadlines Matter
            </h2>
            <p className="text-ink-soft">
              Most appeals and motions must be filed within 30 days of the denial. Missing the deadline can permanently bar your challenge. Upload your denial notice today and we'll help you meet the deadline.
            </p>
          </div>
        </section>

        {DENIAL_CONTENT_PAGES.map(page => (
          <section key={page.slug} className="border-t border-rule/60">
            <div className="mx-auto max-w-4xl px-6 py-12">
              <h2 className="text-xl md:text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>{page.h1}</h2>
              <div className="space-y-2 text-ink-soft">
                {page.body.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i}>{line.trim()}</p>
                ))}
              </div>
              {page.faq.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-medium mb-4">FAQ</h3>
                  <div className="space-y-4">
                    {page.faq.map((f, i) => (
                      <div key={i}>
                        <p className="font-medium text-sm">{f.question}</p>
                        <p className="text-sm text-ink-soft mt-1">{f.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
