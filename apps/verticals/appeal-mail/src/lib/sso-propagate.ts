/* ═══════════════════════════════════════════════════════════
   SSO Propagation — Cross-domain session syncing
   ═══════════════════════════════════════════════════════════

   After a user logs in on any vertical, we propagate the Supabase
   session to all other MailMyPDF product domains using hidden iframes.

   Each iframe points to the target domain's /auth/sso-callback route
   with tokens in the URL hash. The callback calls supabase.auth.setSession()
   to establish a local session in that domain's localStorage.

   This is the standard "silent SSO" pattern — no redirects, no popups.
   The user stays on the current page while sessions are set across all
   products in the background.
   ═══════════════════════════════════════════════════════════ */

const HUB_URL = "https://mailmypdf-etc.pages.dev";

// All vertical domains in the ecosystem
const ALL_DOMAINS = [
  "https://mailmypdf-etc.pages.dev",
  "https://appeal-mail.pages.dev",
  "https://insurance-claims.pages.dev",
  "https://benefits-appeal.pages.dev",
  "https://debt-defense.pages.dev",
  "https://notice-respond.pages.dev",
  "https://dispute-mail.pages.dev",
  "https://immigration-mail.pages.dev",
  "https://govreply.pages.dev",
  "https://code-enforcement.pages.dev",
  "https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev",
  "https://mycomind4-arch-mailmypdf-private-office.pages.dev",
];

export function propagateSSOSession(accessToken: string, refreshToken: string, expiresIn: number): void {
  if (typeof window === "undefined") return;
  const currentOrigin = window.location.origin;
  const otherDomains = ALL_DOMAINS.filter(d => d !== currentOrigin);
  for (const domain of otherDomains) {
    const url = new URL("/auth/sso-callback", domain);
    url.hash = new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken, expires_in: String(expiresIn) }).toString();
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.position = "absolute";
    iframe.src = url.toString();
    iframe.setAttribute("aria-hidden", "true");
    iframe.addEventListener("load", () => setTimeout(() => iframe.remove(), 1000));
    setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 5000);
    document.body.appendChild(iframe);
  }
}

export function checkHubForSession(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    const currentOrigin = window.location.origin;
    const relayUrl = new URL("/auth/sso-silent", HUB_URL);
    relayUrl.searchParams.set("origin", currentOrigin);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.position = "absolute";
    iframe.src = relayUrl.toString();
    iframe.setAttribute("aria-hidden", "true");
    let resolved = false;
    const handler = (event: MessageEvent) => {
      if (event.origin !== HUB_URL && event.origin !== currentOrigin) return;
      if (event.data?.type === "sso-session") {
        resolved = true;
        window.removeEventListener("message", handler);
        iframe.remove();
        resolve(event.data.hasSession === true);
      }
    };
    window.addEventListener("message", handler);
    iframe.addEventListener("load", () => setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener("message", handler);
        if (iframe.parentNode) iframe.remove();
        resolve(false);
      }
    }, 2000));
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener("message", handler);
        if (iframe.parentNode) iframe.remove();
        resolve(false);
      }
    }, 5000);
    document.body.appendChild(iframe);
  });
}

export function redirectToHubSSO(returnTo?: string): void {
  if (typeof window === "undefined") return;
  const returnUrl = returnTo || window.location.origin + window.location.pathname;
  const ssoUrl = new URL("/auth/sso", HUB_URL);
  ssoUrl.searchParams.set("return_to", returnUrl);
  window.location.href = ssoUrl.toString();
}
