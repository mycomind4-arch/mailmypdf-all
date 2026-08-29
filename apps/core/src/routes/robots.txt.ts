import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots/txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://mailmypdf-etc.pages.dev";

        // Verticals use noindex,nofollow — only index the main site + SEO pages
        const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /orders/
Disallow: /auth
Disallow: /verify

Sitemap: ${baseUrl}/sitemap.xml`;

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
