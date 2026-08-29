import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NOTICE_WORKFLOWS, workflowCategories } from "@/components/notice-workflow-directory-fixed";
import { SectionHeader } from "@/components/ui-primitives";

const SITE_ORIGIN = "https://notice-respond.pages.dev";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Notice Response Workflows | Notice Respond" },
      { name: "description", content: "Browse all Notice Respond workflows for government notices, agency actions, and formal responses — IRS, USCIS, DMV, SSA, court, code enforcement, and more." },
      { property: "og:title", content: "Notice Response Workflows | Notice Respond" },
      { property: "og:description", content: "Browse all Notice Respond workflows for government notices, agency actions, and formal responses." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Notice Respond" },
      { property: "og:url", content: SITE_ORIGIN + "/workflows" },
      { property: "og:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Notice Response Workflows | Notice Respond" },
      { name: "twitter:description", content: "Browse all Notice Respond workflows for government notices, agency actions, and formal responses." },
      { name: "twitter:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/workflows" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Notice Respond Workflows",
          itemListElement: NOTICE_WORKFLOWS.map((w, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: w.title,
            url: SITE_ORIGIN + w.route,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN + "/" },
            { "@type": "ListItem", position: 2, name: "Workflows", item: SITE_ORIGIN + "/workflows" },
          ],
        }),
      },
    ],
  }),
  component: WorkflowsDirectory,
});

function WorkflowsDirectory() {
  const groups = workflowCategories();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
            <div className="postmark w-fit">Workflow Directory</div>
            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              Find your response workflow.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Each workflow is built around a distinct notice type and search intent. Select the situation you are dealing with to see what information matters, what documents to bring, and how the response process works.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="space-y-12">
              {groups.map((group) => (
                <div key={group.category}>
                  <div className="mb-5 flex items-center gap-3">
                    <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.category}
                    </h2>
                    <span className="h-px flex-1 bg-rule/60" />
                    <span className="font-mono text-xs text-muted-foreground">{group.workflows.length}</span>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {group.workflows.map((w) => (
                      <Link
                        key={w.slug}
                        to={w.route}
                        className="group flex h-full flex-col rounded-xl border border-rule bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-premium"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {w.category}
                          </span>
                          <span className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </div>
                        <h3 className="mt-4 font-serif text-xl leading-tight">{w.title}</h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{w.description}</p>
                        <div className="mt-4 border-t border-rule/60 pt-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Best for</div>
                          <p className="mt-1.5 text-xs leading-5 text-ink-soft">{w.bestFor}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <div className="postmark mx-auto w-fit">Not sure which one?</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Upload the notice and let the system identify it.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Start with analysis and the system will help identify the notice type and organize the next step.
            </p>
            <Link
              to="/workflows/analyze"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
            >
              Analyze my notice →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
