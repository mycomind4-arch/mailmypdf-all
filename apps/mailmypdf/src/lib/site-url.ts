const SITE_URL_ENV_KEYS = ["PUBLIC_APP_URL", "APP_URL"] as const;

function configuredSiteOrigin(): string | null {
  const raw = process.env.PUBLIC_APP_URL || process.env.APP_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Returns the configured canonical site origin, or null when the deployment
 * has not provided one. We intentionally do not fall back to a preview host.
 */
export function getSiteOrigin(): string | null {
  return configuredSiteOrigin();
}

/**
 * Use for crawler-facing endpoints where emitting the wrong host is worse
 * than failing loudly. Production must set PUBLIC_APP_URL or APP_URL.
 */
export function requireSiteOrigin(): string {
  const origin = configuredSiteOrigin();
  if (!origin) {
    throw new Error(`Missing canonical site origin. Set ${SITE_URL_ENV_KEYS.join(" or ")}.`);
  }
  return origin;
}

/**
 * Converts an internal path to an absolute canonical URL when the site origin
 * is configured. During local/env-less builds it leaves the path relative so
 * builds remain inspectable without inventing a production hostname.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = configuredSiteOrigin();
  if (!origin) return path.startsWith("/") ? path : `/${path}`;
  return new URL(path.startsWith("/") ? path : `/${path}`, `${origin}/`).toString();
}
