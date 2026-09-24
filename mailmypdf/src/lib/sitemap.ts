// Route set behind /sitemap.xml, kept out of the route file so it can be
// asserted directly in tests. The route itself only supplies the origin and
// wraps this in a Response.
import { SEO_PAGES } from "./seo-pages";
import { PUBLIC_VERTICALS } from "./public-verticals";
import { workflowAuthorityPages } from "./workflow-authority-registry";
// The new root-level workflow packages (notice-respond/, appeal-mail/, ...)
// are not yet enumerated anywhere the sitemap can discover automatically —
// each new-architecture workflow page needs an explicit entry here, gated on
// its own config's `indexable` flag, until that registry exists.
import cp14ResponseConfig from "../../../notice-respond/workflows/cp14-response/config";
import cp2000ResponseConfig from "../../../notice-respond/workflows/cp2000-response/config";
import cp504ResponseConfig from "../../../notice-respond/workflows/cp504-response/config";

export type SitemapRoute = {
  loc: string;
  priority: string;
  changefreq: "daily" | "weekly" | "monthly";
  lastmod?: string | null;
};

const STATIC_ROUTES: SitemapRoute[] = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/mail-a-pdf", priority: "0.9", changefreq: "weekly" },
  { loc: "/write", priority: "0.9", changefreq: "weekly" },
  { loc: "/bulk", priority: "0.8", changefreq: "weekly" },
  { loc: "/templates", priority: "0.8", changefreq: "weekly" },
  { loc: "/solutions", priority: "0.8", changefreq: "weekly" },
  { loc: "/ecosystem", priority: "0.9", changefreq: "weekly" },
  { loc: "/fair-process", priority: "0.7", changefreq: "monthly" },
  { loc: "/future-self", priority: "0.7", changefreq: "monthly" },
  { loc: "/proof-of-service", priority: "0.7", changefreq: "monthly" },
  { loc: "/certified-mail-guide", priority: "0.7", changefreq: "monthly" },
  { loc: "/pro", priority: "0.7", changefreq: "monthly" },
];

function dedupeRoutes(routes: SitemapRoute[]): SitemapRoute[] {
  const byPath = new Map<string, SitemapRoute>();
  for (const route of routes) {
    if (!byPath.has(route.loc)) byPath.set(route.loc, route);
  }
  return [...byPath.values()];
}

/** Every path the sitemap advertises, deduplicated, first entry winning. */
export function sitemapRoutes(): SitemapRoute[] {
  const verticalRoutes: SitemapRoute[] = PUBLIC_VERTICALS.flatMap((vertical) => [
    { loc: vertical.path, priority: "0.9", changefreq: "weekly" as const },
    { loc: `${vertical.path}/workflows`, priority: "0.8", changefreq: "weekly" as const },
  ]);

  const workflowRoutes: SitemapRoute[] = workflowAuthorityPages()
    .filter((page) => page.indexable)
    .map((page) => ({
      loc: page.path,
      priority: page.executionHref ? "0.9" : "0.8",
      changefreq: "monthly" as const,
      lastmod: page.reviewedAt,
    }));

  const seoRoutes: SitemapRoute[] = SEO_PAGES.map((page) => ({
    loc: page.to,
    priority: "0.6",
    changefreq: "monthly" as const,
  }));

  const newArchitectureWorkflowRoutes: SitemapRoute[] = [cp14ResponseConfig, cp2000ResponseConfig, cp504ResponseConfig]
    .filter((page) => page.indexable)
    .map((page) => ({ loc: page.path, priority: "0.9", changefreq: "monthly" as const }));

  return dedupeRoutes([
    ...STATIC_ROUTES,
    ...verticalRoutes,
    ...workflowRoutes,
    ...seoRoutes,
    ...newArchitectureWorkflowRoutes,
  ]);
}

function toUrlXml(baseUrl: string, route: SitemapRoute): string {
  const lastmod = route.lastmod ? `\n    <lastmod>${route.lastmod}</lastmod>` : "";
  return `  <url>\n    <loc>${baseUrl}${route.loc}</loc>${lastmod}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
}

export function renderSitemapXml(baseUrl: string): string {
  const urls = sitemapRoutes()
    .map((route) => toUrlXml(baseUrl, route))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
