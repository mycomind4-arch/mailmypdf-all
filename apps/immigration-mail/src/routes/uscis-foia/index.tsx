import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FOIA_CONTENT_PAGES } from "@/domain/foia-content";

export const Route = createFileRoute('/uscis-foia/')({
  head: () => ({
    meta: [
      { title: 'Request USCIS Records by FOIA — A-File, Immigration History | Immigration Mail' },
      { name: 'description', content: 'Request your USCIS A-File, EOIR court records, or ICE enforcement records through FOIA. We prepare and mail your request with tracking and proof.' },
    ],
    links: [{ rel: 'canonical', href: 'https://immigrationmail.com/uscis-foia' }],
  }),
  component: FoiaLandingPage,
});

function FoiaLandingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · FOIA</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Request Your Immigration Records
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              Need your A-File, court records, or enforcement records? We help you prepare a proper FOIA request, include the right identity verification, and mail it to the correct agency.
            </p>
            <Link
              to="/respond-to-a-uscis-notice"
              className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
            >
              Start your records request
            </Link>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl md:text-3xl mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
              Which Records Do You Need?
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">USCIS Records</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  A-File, applications, petitions, decisions, RFE/NOID records, interview transcripts.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">EOIR Records</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Court records, Notice to Appear, hearing transcripts, court decisions, BIA appeals.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">ICE Records</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Detention records, enforcement actions, removal proceedings, bond proceedings.
                </p>
              </div>
              <div className="envelope-card p-6">
                <h3 className="font-medium text-lg">Form G-639</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  The official USCIS form for FOIA/PA record requests. We help you complete it correctly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-paper-deep/40 border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <h2 className="text-xl md:text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Important: Request Preparation, Not Instant Records
            </h2>
            <p className="text-ink-soft">
              We prepare and mail your FOIA request to the correct agency with proper identity verification. Government processing times are typically months — we do not control how long the agency takes to respond. We help you submit the best possible request and prove it was mailed.
            </p>
          </div>
        </section>

        {FOIA_CONTENT_PAGES.map(page => (
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
