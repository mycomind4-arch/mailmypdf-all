import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NOTICE_WORKFLOWS, WorkflowCard, workflowCategories } from "@/components/notice-workflow-directory";
import { SectionHeader } from "@/components/ui-primitives";

const SITE_ORIGIN = "https://notice-respond.pages.dev";

const HERO_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png";
const WORKSPACE_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/6263d0344_generated_image.png";
const DOCUMENT_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/6e68c3354_generated_image.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notice Respond — Government Notice Response Workflows" },
      { name: "description", content: "Find the right workflow for an IRS notice, government letter, code enforcement notice, permit correction, DMV notice, SSA notice, USCIS notice, benefits notice, court summons, or agency action." },
      { property: "og:title", content: "Notice Respond — Government Notice Response Workflows" },
      { property: "og:description", content: "A specialized MailMyPDF product for understanding, preparing, and documenting responses to official notices." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Notice Respond · MailMyPDF" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Notice Respond — Government Notice Response Workflows" },
      { name: "twitter:description", content: "Understand the notice. Prepare the response. Send it properly. Keep the proof." },
      { name: "twitter:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Notice Respond", description: "Specialized workflows for responding to official notices and government correspondence.", url: SITE_ORIGIN, brand: { "@type": "Brand", name: "MailMyPDF" }, hasPart: NOTICE_WORKFLOWS.map((workflow) => ({ "@type": "WebPage", name: workflow.title, url: SITE_ORIGIN + workflow.route, about: workflow.searchIntent })) }) }],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const groups = workflowCategories();

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0">
            <img
              src={HERO_IMAGE}
              alt="Professional correspondence desk with organized documents"
              className="h-full w-full object-cover"
              loading="eager"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/85 to-paper/30" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 md:py-36">
            <div className="max-w-2xl">
              <div className="postmark w-fit">Notice Respond · MailMyPDF</div>
              <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
                Understand the notice.<br />
                Build the response.<br />
                <span className="italic text-stamp">Send it with proof.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
                Upload or provide the notice. Identify the facts, dates, and evidence that matter. Review and approve the exact response. Send through MailMyPDF with tracking and proof of delivery.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/workflows/analyze"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
                >
                  Start a Response
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/workflows"
                  className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30"
                >
                  Explore Notice Types
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PROCESS OVERVIEW ═══ */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-6 md:grid-cols-3">
              <ProcessStep
                number="01"
                title="Understand"
                text="Upload or provide the notice. The system extracts facts, dates, reference numbers, and the requested action — clearly distinguishing what came from the document, what you provided, and what needs review."
              />
              <ProcessStep
                number="02"
                title="Prepare"
                text="Organize supporting evidence, review findings, consider response paths, and prepare professional correspondence. You review every detail before approval."
              />
              <ProcessStep
                number="03"
                title="Send & Prove"
                text="Approve the exact draft, complete payment for mailing, and send through MailMyPDF. Track delivery and keep proof of the documented correspondence event."
              />
            </div>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="grid gap-4 md:grid-cols-3">
              <DirectoryStat value={`${NOTICE_WORKFLOWS.length}`} label="specialized workflows" detail="Organized by notice type and user intent." />
              <DirectoryStat value="1" label="master workspace" detail="Documents, deadlines, drafting, and response history." />
              <DirectoryStat value="US" label="initial focus" detail="Built first around U.S. notices and correspondence." />
            </div>
          </div>
        </section>

        {/* ═══ WORKFLOW DIRECTORY ═══ */}
        <section id="workflows">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
            <SectionHeader
              eyebrow="Workflow directory"
              title="Start with the problem, not the product name."
              subtitle="Each page below is built around a distinct search intent and notice situation. The links open a focused explanation and then hand off into the actual Notice Respond workflow."
            />
            <div className="mt-10 space-y-12">
              {groups.map((group) => (
                <section key={group.category}>
                  <div className="mb-5 flex items-center gap-3">
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.category}</h3>
                    <span className="h-px flex-1 bg-rule/60" />
                    <span className="font-mono text-xs text-muted-foreground">{group.workflows.length}</span>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {group.workflows.map((workflow) => (
                      <WorkflowCard key={workflow.slug} workflow={workflow} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TRUST ARCHITECTURE ═══ */}
        <section className="relative overflow-hidden border-y border-rule/60 bg-ink text-paper">
          <div className="absolute inset-0 opacity-10">
            <img
              src={WORKSPACE_IMAGE}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              aria-hidden="true"
            />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">
                Trust architecture
              </div>
              <h2 className="mt-5 font-serif text-3xl text-paper sm:text-4xl">
                You stay in control of every step.
              </h2>
              <p className="mt-4 text-base leading-7 text-paper/70">
                The notice is the source material. Your facts remain under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft. Payment is distinct from authorization. Mailing creates a documented record.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TrustItem text="The notice is the source material." />
              <TrustItem text="Your facts remain under your control." />
              <TrustItem text="AI assists; it does not decide." />
              <TrustItem text="You review the response before approval." />
              <TrustItem text="Approval applies to the exact draft." />
              <TrustItem text="Payment is distinct from authorization." />
              <TrustItem text="Mailing creates a documented record." />
              <TrustItem text="Proof remains available after mailing." />
              <TrustItem text="Evidence supports the response." />
            </div>
          </div>
        </section>

        {/* ═══ PRINCIPLES ═══ */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-3">
            <DirectoryPrinciple title="Understand" text="Start with the actual notice and extract the facts, dates, reference numbers, and requested action." />
            <DirectoryPrinciple title="Prepare" text="Organize the supporting documents and build a response you can review before sending." />
            <DirectoryPrinciple title="Prove" text="When the document is ready, keep the mailing, tracking, and proof record with the workflow." />
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20">
            <div className="postmark mx-auto w-fit">Not sure which workflow</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Upload the notice and start with analysis.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Notice Respond can help you identify the notice type and organize the next response step from the document itself.
            </p>
            <Link
              to="/workflows/analyze"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
            >
              Analyze my notice
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rule bg-card p-6">
      <div className="font-mono text-2xl text-stamp">{number}</div>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function DirectoryStat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-rule bg-card p-5">
      <div className="font-serif text-3xl text-stamp">{value}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function DirectoryPrinciple({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rule bg-card p-6">
      <div className="font-mono text-xs text-stamp">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm leading-6 text-paper/80">{text}</span>
    </div>
  );
}
