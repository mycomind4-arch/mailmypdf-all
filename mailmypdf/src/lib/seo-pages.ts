// Shared registry of distinct, indexable SEO landing routes for cross-linking + sitemap.
// Pure synonym/duplicate routes should redirect to one of these canonical intents instead.
export const SEO_PAGES = [
  { to: "/certified-mail-guide", label: "Certified mail guide" },
  { to: "/mail-a-pdf", label: "Mail a PDF online" },
  { to: "/send-letter-online", label: "Send a letter online" },
  { to: "/print-and-mail-pdf-online", label: "Print and mail a PDF online" },
  { to: "/send-documents-by-mail-online", label: "Send documents by mail online" },
  { to: "/send-letter-to-irs", label: "Send a letter to the IRS" },
  { to: "/send-letter-to-social-security", label: "Send a letter to Social Security" },
  { to: "/send-letter-to-dmv", label: "Send a letter to the DMV" },
  { to: "/send-letter-to-landlord", label: "Send a letter to a landlord" },
  { to: "/send-business-letter-online", label: "Send a business letter online" },
  { to: "/send-letter-to-tenant", label: "Send a letter to a tenant" },
  { to: "/send-cease-and-desist-letter", label: "Send a cease and desist letter" },
  { to: "/send-demand-letter-online", label: "Send a demand letter online" },
  { to: "/send-resignation-letter-by-mail", label: "Send a resignation letter by mail" },
  { to: "/mail-a-contract-online", label: "Mail a signed contract online" },
  { to: "/send-letter-to-bank", label: "Send a letter to your bank" },
  { to: "/send-letter-to-insurance-company", label: "Send a letter to an insurance company" },
  { to: "/send-letter-to-court", label: "Send a letter to a court" },
  { to: "/send-letter-to-uscis", label: "Send a letter to USCIS" },
  { to: "/mail-documents-without-printer", label: "Mail documents without a printer" },
  { to: "/send-signed-document-online", label: "Send a signed document by mail" },
  { to: "/send-cancellation-letter-online", label: "Send a cancellation letter online" },
  { to: "/send-complaint-letter-online", label: "Send a complaint letter online" },
  { to: "/send-invoice-by-mail", label: "Send an invoice by mail" },
  { to: "/send-business-documents-by-mail", label: "Send business documents by mail" },
  { to: "/send-letter-to-client", label: "Send a letter to a client" },
  { to: "/send-letter-to-company", label: "Send a letter to a company" },
  { to: "/mail-forms-online", label: "Mail forms online" },
  { to: "/send-school-documents-by-mail", label: "Send school documents by mail" },
  { to: "/send-medical-records-request-by-mail", label: "Send a medical records request by mail" },
  { to: "/send-insurance-documents-by-mail", label: "Send insurance documents by mail" },
  { to: "/send-letter-to-court-clerk", label: "Send a letter to a court clerk" },
  { to: "/send-letter-to-county-clerk", label: "Send a letter to a county clerk" },
  { to: "/mail-tax-documents-online", label: "Mail tax documents online" },
  { to: "/dispute-mail", label: "Dispute anything by mail" },
] as const;

type SeoPage = (typeof SEO_PAGES)[number];

const BY_PATH = new Map<string, SeoPage>(SEO_PAGES.map((page) => [page.to, page]));

// Related links are intentionally semantic. They reinforce clear topical clusters
// instead of generating arbitrary cross-links from a path hash.
const RELATED_CLUSTERS: readonly (readonly string[])[] = [
  [
    "/mail-a-pdf",
    "/print-and-mail-pdf-online",
    "/mail-documents-without-printer",
    "/send-documents-by-mail-online",
    "/send-letter-online",
    "/certified-mail-guide",
    "/mail-forms-online",
    "/send-signed-document-online",
  ],
  [
    "/send-letter-to-irs",
    "/mail-tax-documents-online",
    "/send-letter-to-social-security",
    "/send-letter-to-dmv",
    "/send-letter-to-uscis",
    "/send-letter-to-court",
    "/send-letter-to-court-clerk",
    "/send-letter-to-county-clerk",
    "/send-school-documents-by-mail",
  ],
  [
    "/send-business-letter-online",
    "/send-business-documents-by-mail",
    "/send-invoice-by-mail",
    "/send-letter-to-client",
    "/send-letter-to-company",
    "/mail-a-contract-online",
    "/send-resignation-letter-by-mail",
    "/send-signed-document-online",
  ],
  [
    "/send-letter-to-landlord",
    "/send-letter-to-tenant",
    "/send-demand-letter-online",
    "/send-cease-and-desist-letter",
    "/send-complaint-letter-online",
    "/send-cancellation-letter-online",
    "/send-letter-to-bank",
    "/send-letter-to-insurance-company",
    "/send-insurance-documents-by-mail",
    "/send-medical-records-request-by-mail",
    "/dispute-mail",
  ],
];

const CORE_FALLBACKS = [
  "/mail-a-pdf",
  "/print-and-mail-pdf-online",
  "/certified-mail-guide",
  "/send-documents-by-mail-online",
  "/mail-documents-without-printer",
  "/send-letter-online",
] as const;

export function relatedFor(currentPath: string, count = 6): { to: string; label: string }[] {
  const candidates: string[] = [];
  const seen = new Set<string>([currentPath]);

  const add = (path: string) => {
    if (seen.has(path) || !BY_PATH.has(path)) return;
    seen.add(path);
    candidates.push(path);
  };

  for (const cluster of RELATED_CLUSTERS) {
    if (!cluster.includes(currentPath)) continue;
    cluster.forEach(add);
  }

  CORE_FALLBACKS.forEach(add);

  if (candidates.length < count) {
    SEO_PAGES.forEach((page) => add(page.to));
  }

  return candidates
    .slice(0, Math.min(count, candidates.length))
    .map((path) => BY_PATH.get(path)!)
    .map(({ to, label }) => ({ to, label }));
}
