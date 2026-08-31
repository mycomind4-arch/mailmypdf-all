import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPEAL_CATALOG, CATEGORY_ORDER, CATEGORY_DESCRIPTIONS } from "@/domain/appeal-catalog";
import { workflows } from "@/domain/workflows";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "All Appeal Workflows — Benefits Appeal" },
      { name: "description", content: "Find the benefits appeal workflow for your situation: SSDI, SSI, unemployment, Medicaid, SNAP, VA, housing, disability, overpayment, reconsideration, and hearing preparation." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "All Appeal Workflows — Benefits Appeal" },
      { property: "og:description", content: "Find the benefits appeal workflow for your situation." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Benefits Appeal" },
      { property: "og:url", content: SITE_ORIGIN + "/workflows" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "All Appeal Workflows — Benefits Appeal" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/workflows" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Benefits Appeal", item: SITE_ORIGIN + "/" },
          { "@type": "ListItem", position: 2, name: "Workflows", item: SITE_ORIGIN + "/workflows" },
        ],
      })},
    ],
  }),
  component: WorkflowsHub,
});

function WorkflowsHub() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="eyebrow">Workflows</div>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Find your benefits appeal workflow.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Each workflow is purpose-built for a specific benefits decision. Find the one that matches your situation.
        </p>
        <div className="mt-12 space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const entries = APPEAL_CATALOG.filter((e) => e.category === cat);
            if (entries.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="font-serif text-2xl">{cat}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{CATEGORY_DESCRIPTIONS[cat]}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => (
                    <Link
                      key={entry.slug}
                      to={entry.workflowRoute}
                      className="block rounded-2xl border border-rule bg-paper-deep/30 p-6 transition-colors hover:bg-muted/40"
                    >
                      <h3 className="font-serif text-lg">{entry.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.shortDescription}</p>
                      <span className="mt-4 inline-block text-sm font-medium text-ink">{entry.cta} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
