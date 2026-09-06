import { createFileRoute } from "@tanstack/react-router";
import { SEO_PAGES } from "@/lib/seo-pages";
import { PUBLIC_VERTICALS } from "@/lib/public-verticals";
import { workflowAuthorityPages } from "@/lib/workflow-authority-registry";
import { requireSiteOrigin } from "@/lib/site-url";

type SitemapRoute = {
  loc: string;
  priority: string;
  changefreq: "daily" | "weekly" | "monthly";
  lastmod?: string | null;
};

function dedupeRoutes(routes: SitemapRoute[]): SitemapRoute[] {
  const byPath = new Map<string, SitemapRoute>();
  for (const route of routes) {
    if (!byPath.has(route.loc)) byPath.set(route.loc, route);
  }
  return [...byPath.values()];
}

function toUrlXml(baseUrl: string, route: SitemapRoute): string {
  const lastmod = route.lastmod ? `\n    <lastmod>${route.lastmod}</lastmod>` : "";
  return `  <url>\n    <loc>${baseUrl}${route.loc}</loc>${lastmod}\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = requireSiteOrigin();

        const staticRoutes: SitemapRoute[] = [
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
          changefreq: "monthly",
        }));

        const allRoutes = dedupeRoutes([
          ...staticRoutes,
          ...verticalRoutes,
          ...workflowRoutes,
          ...seoRoutes,
        ]);

        const urls = allRoutes.map((route) => toUrlXml(baseUrl, route)).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
