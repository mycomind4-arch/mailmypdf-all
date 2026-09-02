/* SSO Propagation — Cross-domain session syncing for MailMyPDF hub */
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
  for (const domain of ALL_DOMAINS.filter((d) => d !== currentOrigin)) {
    const url = new URL("/auth/sso-callback", domain);
    url.hash = new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken, expires_in: String(expiresIn) }).toString();
    const iframe = document.createElement("iframe");
    iframe.style.display = "none"; iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.position = "absolute";
    iframe.src = url.toString(); iframe.setAttribute("aria-hidden", "true");
    iframe.addEventListener("load", () => setTimeout(() => iframe.remove(), 1000));
    setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 5000);
    document.body.appendChild(iframe);
  }
}

export function redirectToHubSSO(redirect?: string): void {
  if (typeof window === "undefined") return;
  const hubUrl = new URL("https://mailmypdf-etc.pages.dev/auth");
  if (redirect) {
    hubUrl.searchParams.set("redirect", redirect);
  }
  window.location.href = hubUrl.toString();
}
