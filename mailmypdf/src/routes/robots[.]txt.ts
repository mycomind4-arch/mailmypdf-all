import { createFileRoute } from "@tanstack/react-router";
import { renderRobotsTxt } from "@/lib/robots";
import { requireSiteOrigin } from "@/lib/site-url";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        return new Response(renderRobotsTxt(requireSiteOrigin()), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
