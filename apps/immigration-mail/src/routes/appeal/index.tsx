import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPEAL_CONTENT_PAGES } from "@/domain/appeal-content";

export const Route = createFileRoute('/appeal/')({
  head: () => ({
    meta: [
      { title: 'Immigration Appeal Letter — I-290B, BIA Appeal | Immigration Mail' },
      { name: 'description', content: 'Appeal a USCIS denial or immigration court decision. We help with I-290B appeals, BIA appeals, and motions to reopen.' },
    ],
    links: [{ rel: 'canonical', href: 'https://immigrationmail.com/appeal' }],
  }),
  component: AppealLandingPage,
});

function AppealLandingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · Appeals</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Immigration Appeal Letter
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              USCIS denied your case? An immigration judge ruled against you? We help you understand the decision, build your argument, and file your appeal.
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
              Appeal Types
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {APPEAL_CONTENT_PAGES.map(page => (
                <Link
                  key={page.slug}
                  to="/appeal/$slug"
                  params={{ slug: page.slug }}
                  className="envelope-card p-6 hover:border-stamp transition-colors"
                >
                  <h3 className="font-medium text-lg">{page.h1}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{page.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
