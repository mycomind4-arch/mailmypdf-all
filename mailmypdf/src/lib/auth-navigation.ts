/** Keep post-login navigation on this application and out of auth loops. */
/** Public entry point used by all shared unauthenticated navigation. */
export const AUTH_ENTRY_HREF = "/auth?redirect=%2Fdashboard";

export function safeAuthDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://mailmypdf.invalid");
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== "https://mailmypdf.invalid" || /[\\\s]/.test(pathname) || pathname.startsWith("//") || /^\/auth(?:\/|$)/i.test(pathname)) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}
