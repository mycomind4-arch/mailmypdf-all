import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ECOSYSTEM_VERTICALS } from "@/lib/ecosystem";

export const Route = createFileRoute("/ecosystem")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Ecosystem | Specialized Document Workflows" },
      {
        name: "description",
        content: "Explore specialized document workflows for appeals, government notices, public records, and mailing. Each master vertical organizes the specific problems and searches it is built to solve.",
      },
      { property: "og:title", content: "MailMyPDF Ecosystem" },
      { property: "og:description", content: "Master verticals and specialized workflows built on shared MailMyPDF infrastructure." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/ecosystem" }],
  }),
  component: EcosystemPage,
});

// Verticals whose external sites have a /workflows index page
const VERTICALS_WITH_WORKFLOWS_PAGE = new Set([
  "appeal-reply",
  "immigration-mail",
  "dispute-mail",
  "private-office",
  "small-business-mail",
]);

function workflowHref(vertical: { slug: string; href: string }, workflowSlug: string) {
  // Internal route — use query param
  if (vertical.slug === "records-request") return `${vertical.href}?workflow=${encodeURIComponent(workflowSlug)}`;
  // External sites with a /workflows index → send users there
  if (VERTICALS_WITH_WORKFLOWS_PAGE.has(vertical.slug)) {
    const base = vertical.href.replace(/\/$/, "");
    return `${base}/workflows`;
  }
  // External sites without /workflows → root
  return vertical.href;
}

function EcosystemPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="postmark w-fit">MailMyPDF ecosystem</div>
            <h1 className="mt-6 max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl">Master products for real-world document problems.</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg">
              Each next-generation vertical is a master product for a family of related problems and search intents. Its sub-workflows live with it; MailMyPDF provides the shared document, account, payment, mailing, tracking, proof, and design infrastructure underneath.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/solutions" className="rounded-full border border-rule px-6 py-3 text-sm font-medium">Browse existing solutions</Link>
              <Link to="/send" className="rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white">Mail a document →</Link>
            </div>
          </div>
        </section>

        {ECOSYSTEM_VERTICALS.map((vertical) => (
          <section key={vertical.slug} className="border-b border-rule/60">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.18em] text-cobalt">{vertical.label}</div>
                  <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{vertical.title}</h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{vertical.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {vertical.capabilities.map((capability) => (
                      <span key={capability} className="rounded-full bg-paper-deep px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">{capability}</span>
                    ))}
                  </div>
                  <a href={vertical.href} className="mt-6 inline-flex rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white">Open {vertical.title} →</a>
                </div>

                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Master workflow directory</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {vertical.workflows.map((workflow) => (
                      <a key={workflow.slug} href={workflowHref(vertical, workflow.slug)} className="envelope-card block p-5 transition-all hover:-translate-y-0.5 hover:border-cobalt/30 hover:shadow-hover">
                        <div className="text-sm font-semibold text-foreground">{workflow.title}</div>
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-cobalt">Search intent: {workflow.searchIntent}</div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
                      </a>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">The master vertical owns these workflows even when each workflow later gets its own canonical page, route, or domain.</p>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="border-t border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
            <div className="grid gap-5 md:grid-cols-3">
              <ProductCard number="01" title="Own the intent" text="Each vertical is the authoritative home for a defined problem category instead of a thin keyword page." />
              <ProductCard number="02" title="Own the workflows" text="Specific notices, appeals, disputes, requests, and document tasks live under their relevant master product." />
              <ProductCard number="03" title="Share the foundation" text="Identity, documents, billing, mailing, tracking, proof, and the visual system stay reusable across products." />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="envelope-card p-6 sm:p-7">
      <div className="font-mono text-xs text-cobalt">{number}</div>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
