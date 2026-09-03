/* SSO Propagation — Cross-domain session syncing for MailMyPDF products */

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

export function propagateSSOSession(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): void {
  if (typeof window === "undefined") return;

  const currentOrigin = window.location.origin;
  const otherDomains = ALL_DOMAINS.filter(d => d !== currentOrigin);

  for (const domain of otherDomains) {
    const url = new URL("/auth/sso-callback", domain);
    url.hash = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: String(expiresIn),
    }).toString();

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.position = "absolute";
    iframe.src = url.toString();
    iframe.setAttribute("aria-hidden", "true");

    iframe.addEventListener("load", () => {
      setTimeout(() => { iframe.remove(); }, 1000);
    });

    setTimeout(() => {
      if (iframe.parentNode) iframe.remove();
    }, 5000);

    document.body.appendChild(iframe);
  }
}

const HUB_URL = "https://mailmypdf-etc.pages.dev";

export function redirectToHubSSO(returnTo?: string): void {
  if (typeof window === "undefined") return;
  const returnUrl = returnTo || window.location.origin + window.location.pathname;
  const ssoUrl = new URL("/auth/sso", HUB_URL);
  ssoUrl.searchParams.set("return_to", returnUrl);
  window.location.href = ssoUrl.toString();
}
