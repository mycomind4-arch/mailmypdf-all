import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy SEO landing page retired.
 * Preserve the old URL as a permanent redirect so existing links/bookmarks
 * land on the canonical MailMyPDF entry point instead of 404ing.
 */
export const Route = createFileRoute("/send-a-letter-without-a-printer")({
  beforeLoad: () => {
    throw redirect({
      to: "/mail-a-pdf",
      statusCode: 301,
    });
  },
});
