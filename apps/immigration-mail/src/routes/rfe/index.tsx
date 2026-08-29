import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  getAllFormProfiles,
  generateFormSpecificRFEContent,
} from "@/domain/form-adapters";

export const Route = createFileRoute('/rfe/')({
  head: () => ({
    meta: [
      { title: 'USCIS RFE Response — Form-Specific Help | Immigration Mail' },
      { name: 'description', content: 'Received a Request for Evidence? We help with I-485, I-130, I-140, I-751, N-400, and all other USCIS form RFEs.' },
    ],
    links: [{ rel: 'canonical', href: 'https://immigrationmail.com/rfe' }],
  }),
  component: RFELandingPage,
});

function RFELandingPage() {
  const forms = getAllFormProfiles().filter(f => f.formType !== 'generic');

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="postmark w-fit">Immigration Mail · RFE Response</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight md:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
              USCIS Request for Evidence Response
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
              Received an RFE for any USCIS form? We help you understand what's being asked, gather the right evidence, and prepare your response.
            </p>
            <Link
              to="/respond-to-a-uscis-notice"
              className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground"
            >
              Upload your RFE letter
            </Link>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl md:text-3xl mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
              Select Your Form Type
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {forms.map(form => {
                const content = generateFormSpecificRFEContent(form.formType);
                if (!content) return null;
                return (
                  <Link
                    key={form.formType}
                    to="/rfe/$slug"
                    params={{ slug: content.slug }}
                    className="envelope-card p-6 hover:border-stamp transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{form.formType}</span>
                      <span className="text-sm text-ink-soft">{form.formName}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      {form.commonRFERequests.length} common RFE requests
                    </p>
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
