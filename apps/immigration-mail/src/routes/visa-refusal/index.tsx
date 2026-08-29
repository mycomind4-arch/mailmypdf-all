import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VISA_LANDING_PAGE } from "@/domain/visa-refusal-content";

export const Route = createFileRoute('/visa-refusal/')({
  head: () => ({
    meta: [
      { title: VISA_LANDING_PAGE.title },
      { name: 'description', content: VISA_LANDING_PAGE.description },
    ],
    links: [{ rel: 'canonical', href: VISA_LANDING_PAGE.canonical }],
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: VISA_LANDING_PAGE.faqSchema!.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }),
      },
    ],
  }),
  component: VisaRefusalLandingPage,
});

function VisaRefusalLandingPage() {
  const page = VISA_LANDING_PAGE;
  const sections = page.content.split('\n## ');

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · Visa Refusal Response</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              {page.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              We'll help you understand the refusal type, identify what the consular officer found, organize evidence, and prepare an appropriate response.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/respond-to-a-uscis-notice"
                className="inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
              >
                Upload your refusal letter
              </Link>
              <Link
                to="/visa-refusal/what-is-221g"
                className="inline-flex rounded-full border border-rule px-7 py-3.5 font-medium"
              >
                Tell me what happened
              </Link>
            </div>
            <p className="mt-6 text-sm text-ink-soft">
              Immigration Mail does not determine eligibility, guarantee visa approval, or replace legal advice.
            </p>
          </div>
        </section>

        <section className="bg-paper-deep/40 border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl md:text-3xl mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {page.faqSchema!.map((faq, idx) => (
                <div key={idx} className="envelope-card p-6">
                  <h3 className="font-medium text-lg">{faq.question}</h3>
                  <p className="mt-2 text-ink-soft">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="space-y-8">
              {sections.slice(1).map((section, idx) => {
                const [heading, ...body] = section.split('\n');
                return (
                  <div key={idx}>
                    <h2 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                      {heading}
                    </h2>
                    <div className="text-ink-soft space-y-2">
                      {body.join('\n').trim().split('\n').map((line, i) => (
                        line.trim() && <p key={i}>{line.trim()}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-paper-deep/40 border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Related Resources</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {page.relatedPages.map(path => {
                const slug = path.replace('/visa-refusal/', '');
                return (
                  <Link
                    key={path}
                    to="/visa-refusal/$slug"
                    params={{ slug }}
                    className="envelope-card p-4 hover:border-stamp transition-colors"
                  >
                    <span className="text-sm font-medium">{slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
