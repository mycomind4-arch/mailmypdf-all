import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPEAL_CATALOG, type AppealCategory } from "@/domain/appeal-catalog";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

const categoryMap: Record<string, AppealCategory> = {
  "disability": "Disability & Social Security",
  "unemployment": "Unemployment",
  "medicaid": "Medicaid & Health Benefits",
  "public-assistance": "Public Assistance",
  "veterans": "Veterans",
  "administrative": "Administrative",
};

const category = categoryMap["medicaid"];
const entries = APPEAL_CATALOG.filter((e) => e.category === category);

export const Route = createFileRoute("/appeal/medicaid")({
  head: () => ({
    meta: [
      { title: "Medicaid & Health Benefit Appeals | Benefits Appeal" },
      { name: "description", content: "Medicaid denials, terminations, and fair hearing requests." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Medicaid & Health Benefit Appeals | Benefits Appeal" },
      { property: "og:description", content: "Medicaid denials, terminations, and fair hearing requests." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Benefits Appeal" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/appeal/' + slug + '" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Benefits Appeal", item: SITE_ORIGIN + "/" }, { "@type": "ListItem", position: 2, name: "Workflows", item: SITE_ORIGIN + "/workflows" }, { "@type": "ListItem", position: 3, name: "Medicaid & Health Benefit Appeals", item: SITE_ORIGIN + "/appeal/' + slug + '" }] }) },
    ],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="eyebrow">{category}</div>
        <h1 className="mt-3 font-serif text-4xl">Medicaid & Health Benefit Appeals</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Medicaid denials, terminations, and fair hearing requests.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Link key={entry.slug} to={entry.workflowRoute} className="block rounded-2xl border border-rule bg-paper-deep/30 p-6 transition-colors hover:bg-muted/40">
              <h2 className="font-serif text-xl">{entry.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.shortDescription}</p>
              <span className="mt-4 inline-block text-sm font-medium text-ink">{entry.cta} &rarr;</span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  ),
});
