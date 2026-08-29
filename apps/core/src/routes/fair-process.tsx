import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /fair-process — Redirected to /ecosystem.
 *
 * FairProcessMaps is a separate product. The ecosystem page explains
 * the product family relationship. This route is kept as a redirect
 * to avoid breaking any existing inbound links.
 */
export const Route = createFileRoute("/fair-process")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "/ecosystem" }],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/ecosystem" });
  },
  component: () => null,
});
