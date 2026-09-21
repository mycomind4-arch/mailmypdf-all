import { createFileRoute } from "@tanstack/react-router";
import { renderSitemapXml } from "@/lib/sitemap";
import { requireSiteOrigin } from "@/lib/site-url";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        return new Response(renderSitemapXml(requireSiteOrigin()), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
