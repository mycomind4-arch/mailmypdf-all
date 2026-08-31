import { createFileRoute } from "@tanstack/react-router";
import { SEO_PAGES } from "@/lib/seo-pages";
import { getLiveVerticals } from "@/verticals";

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://mailmypdf-etc.pages.dev";
        const now = new Date().toISOString();

        const staticRoutes = [
          { loc: "/", priority: "1.0", changefreq: "daily" },
          { loc: "/send", priority: "0.9", changefreq: "weekly" },
          { loc: "/write", priority: "0.9", changefreq: "weekly" },
          { loc: "/bulk", priority: "0.8", changefreq: "weekly" },
          { loc: "/templates", priority: "0.8", changefreq: "weekly" },
          { loc: "/solutions", priority: "0.8", changefreq: "weekly" },
          { loc: "/ecosystem", priority: "0.7", changefreq: "monthly" },
          { loc: "/fair-process", priority: "0.7", changefreq: "monthly" },
          { loc: "/future-self", priority: "0.7", changefreq: "monthly" },
          { loc: "/proof-of-service", priority: "0.7", changefreq: "monthly" },
          { loc: "/certified-mail-guide", priority: "0.6", changefreq: "monthly" },
          { loc: "/pro", priority: "0.7", changefreq: "monthly" },
        ];

        const verticals = getLiveVerticals();
        const verticalRoutes = verticals.map((v) => ({
          loc: v.route,
          priority: "0.9",
          changefreq: "weekly",
        }));

        const seoRoutes = SEO_PAGES.map((p) => ({
          loc: p.to,
          priority: "0.6",
          changefreq: "monthly",
        }));

        const allRoutes = [...staticRoutes, ...verticalRoutes, ...seoRoutes];

        const urls = allRoutes
          .map(
            (r) => `  <url>
    <loc>${baseUrl}${r.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

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
