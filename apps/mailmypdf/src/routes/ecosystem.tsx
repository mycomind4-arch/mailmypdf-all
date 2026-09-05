import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Mail, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PUBLIC_VERTICALS } from "@/lib/public-verticals";
import { workflowAuthorityPages } from "@/lib/workflow-authority-registry";

export const Route = createFileRoute("/ecosystem")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Workflows | 13 Specialized Product Verticals" },
      {
        name: "description",
        content:
          "Explore MailMyPDF workflow products for notices, appeals, immigration, disputes, records requests, code enforcement, insurance claims, business correspondence, tenant matters, permits, claims, benefits, and private correspondence.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "MailMyPDF Workflows" },
      {
        property: "og:description",
        content: "Thirteen specialized workflow verticals built on one shared document, review, mailing, tracking, and proof platform.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/ecosystem" }],
  }),
  component: EcosystemPage,
});

function EcosystemPage() {
  // Resolve the authority registry at render time rather than module init. This
  // keeps the Cloudflare SSR chunk graph safe from the live-binding cycle that
  // previously caused an all-route 500.
  const authorityPages = workflowAuthorityPages();

  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-rule/60">
          <div
            className="absolute inset-0 opacity-70"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 78% 22%, color-mix(in oklab, var(--cobalt) 8%, transparent), transparent 32%), linear-gradient(180deg, color-mix(in oklab, var(--card) 68%, transparent), transparent 68%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt">
              MailMyPDF workflow ecosystem
            </div>
            <h1 className="mt-5 max-w-5xl font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
              Find the workflow built around the document problem you actually have.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-soft">
              MailMyPDF is one platform with specialized public product layers. Each vertical owns a distinct problem family, while document handling, review, mailing, tracking, and proof remain shared underneath.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#products" className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3.5 text-sm font-semibold text-white shadow-stamp">
                Browse all products <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/mail-a-pdf" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-semibold">
                Mail a PDF
              </a>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60 bg-paper-deep/25">
          <div className="mx-auto grid max-w-6xl gap-px px-4 py-1 sm:px-6 md:grid-cols-4">
            <TrustItem icon={<FileSearch className="h-4 w-4" />} title="Problem-specific" text="Start from the notice, decision, request, claim, or correspondence." />
            <TrustItem icon={<ShieldCheck className="h-4 w-4" />} title="Authority gated" text="Draft SEO pages stay non-indexable until individually reviewed." />
            <TrustItem icon={<Mail className="h-4 w-4" />} title="Shared fulfillment" text="Mail a finished packet when physical delivery is appropriate." />
            <TrustItem icon={<ArrowRight className="h-4 w-4" />} title="Expandable" text="SEO-ready guides can later gain full executable workflow engines." />
          </div>
        </section>

        <section id="products" className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt">13 specialized verticals</div>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">One system. Distinct areas of authority.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The public experience changes with the problem. The platform foundation does not need to be rebuilt for every vertical.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PUBLIC_VERTICALS.map((vertical) => {
                const pages = authorityPages.filter((page) => vertical.verticalKeys.includes(page.vertical));
                const indexable = pages.filter((page) => page.indexable).length;
                const executable = pages.filter((page) => Boolean(page.executionHref)).length;
                return (
                  <a
                    key={vertical.id}
                    href={vertical.path}
                    className="group flex min-h-72 flex-col overflow-hidden rounded-xl border border-rule bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-premium"
                  >
                    <div className="relative h-20 overflow-hidden border-b border-rule bg-gradient-to-br from-paper-deep to-card">
                      <div className="absolute -right-6 -top-10 h-32 w-32 rotate-12 rounded border border-rule bg-white/55" aria-hidden />
                      <span className="absolute bottom-3 left-4 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt">
                        {vertical.eyebrow}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-serif text-3xl leading-tight">{vertical.product}</h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{vertical.description}</p>
                      <div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="rounded-full bg-paper-deep px-2.5 py-1">{pages.length} modeled guides</span>
                        {indexable > 0 && <span className="rounded-full bg-paper-deep px-2.5 py-1">{indexable} SEO ready</span>}
                        {executable > 0 && <span className="rounded-full bg-paper-deep px-2.5 py-1">{executable} executable</span>}
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-6 text-sm font-semibold">
                        <span>Explore {vertical.product}</span>
                        <ArrowRight className="h-4 w-4 text-cobalt transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-rule bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Publication model</div>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Useful information first. Execution when it is genuinely ready.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StateCard state="DRAFT" title="Review first" text="A planned workflow can exist in the catalog without becoming indexable or pretending to be complete." />
              <StateCard state="SEO READY" title="Compete on usefulness" text="A page becomes indexable only after it has enough unique, sourced, problem-specific value to pass the Authority Gate." />
              <StateCard state="EXECUTABLE" title="Add the product" text="The same authority page can later open the real workflow engine without sacrificing its informational value." />
            </div>
          </div>
        </section>

        <section className="bg-cobalt text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl">Already have the finished document?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Skip the specialized preparation layer and use the core MailMyPDF mailing workflow.</p>
            </div>
            <a href="/mail-a-pdf" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-cobalt">
              Mail a PDF <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-5 md:px-5">
      <div className="mt-0.5 text-cobalt">{icon}</div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}

function StateCard({ state, title, text }: { state: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rule bg-paper p-5">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-cobalt">{state}</div>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
