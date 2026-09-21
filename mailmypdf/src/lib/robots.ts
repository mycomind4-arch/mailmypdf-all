// Disallow list behind /robots.txt, kept out of the route file so it can be
// asserted against the indexable route registry in tests.

/**
 * Non-public surfaces. These are prefixes, so anything added here must not be
 * a prefix of an indexable landing route — `/send` alone would silently block
 * the 27 `/send-*` SEO pages the sitemap advertises, which is why the app's
 * own send page is anchored with `$` instead.
 */
export const ROBOTS_DISALLOW = [
  "/api/",
  "/admin",
  "/orders/",
  "/auth",
  "/verify",
  "/send$",
] as const;

export function renderRobotsTxt(baseUrl: string): string {
  const disallow = ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`).join("\n");
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${baseUrl}/sitemap.xml`;
}
