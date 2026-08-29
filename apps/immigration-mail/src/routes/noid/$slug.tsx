import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllFormProfiles, generateFormSpecificNOIDContent } from "@/domain/form-adapters";

export const Route = createFileRoute('/noid/$slug')({
  head: ({ params }) => {
    const forms = getAllFormProfiles();
    const form = forms.find(f => {
      const content = generateFormSpecificNOIDContent(f.formType);
      return content?.slug === params.slug;
    });
    const content = form ? generateFormSpecificNOIDContent(form.formType) : undefined;
    if (!content) return { meta: [{ title: 'Page Not Found — Immigration Mail' }] };
    return {
      meta: [
        { title: content.title },
        { name: 'description', content: content.description },
      ],
      links: [{ rel: 'canonical', href: content.canonical }],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: content.faqSchema.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          }),
        },
      ],
    };
  },
  component: NOIDFormSpecificPage,
});

function NOIDFormSpecificPage() {
  const { slug } = Route.useParams();
  const forms = getAllFormProfiles();
  const form = forms.find(f => {
    const content = generateFormSpecificNOIDContent(f.formType);
    return content?.slug === slug;
  });
  const content = form ? generateFormSpecificNOIDContent(form.formType) : undefined;

  if (!content || !form) {
    return (
      <div className="min-h-screen page-fade">
        <SiteHeader />
        <main>
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>Page not found</h1>
            <Link to="/noid" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-primary-foreground">
              Back to NOID hub
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const sections = content.content.split('\n## ');

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <nav className="border-b border-rule/40 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Link to="/" className="hover:text-ink">Home</Link>
              <span className="text-rule">/</span>
              <Link to="/noid" className="hover:text-ink">NOID</Link>
              <span className="text-rule">/</span>
              <span className="text-ink">{form.formType}</span>
            </div>
          </div>
        </nav>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
            <h1 className="text-3xl leading-tight md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              {content.h1}
            </h1>
            <p className="mt-4 text-lg text-ink-soft max-w-2xl">{content.description}</p>
          </div>
        </section>

        {content.faqSchema.length > 0 && (
          <section className="bg-paper-deep/40 border-b border-rule/60">
            <div className="mx-auto max-w-4xl px-6 py-12">
              <h2 className="text-xl md:text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Common Questions</h2>
              <div className="space-y-4">
                {content.faqSchema.map((faq, idx) => (
                  <div key={idx} className="envelope-card p-5">
                    <h3 className="font-medium">{faq.question}</h3>
                    <p className="mt-2 text-sm text-ink-soft">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="space-y-6">
              {sections.slice(1).map((section, idx) => {
                const [heading, ...body] = section.split('\n');
                return (
                  <div key={idx}>
                    <h2 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>{heading}</h2>
                    <div className="text-ink-soft space-y-2">
                      {body.join('\n').trim().split('\n').map((line, i) =>
                        line.trim() && <p key={i}>{line.trim()}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-paper-deep/40 border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="envelope-card p-8 text-center">
              <h2 className="text-xl md:text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
                Upload your {form.formType} NOID to get started
              </h2>
              <p className="mt-3 text-ink-soft">
                We'll read your NOID, identify the denial grounds, and help you prepare your response.
              </p>
              <Link
                to="/respond-to-a-uscis-notice"
                className="mt-6 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
              >
                Upload your NOID →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
