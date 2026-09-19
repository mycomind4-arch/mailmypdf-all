import { createFileRoute } from "@tanstack/react-router";
import { requireSiteOrigin } from "@/lib/site-url";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = requireSiteOrigin();
        const robots = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /orders/\nDisallow: /auth\nDisallow: /verify\n\nSitemap: ${baseUrl}/sitemap.xml`;

        return new Response(robots, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
