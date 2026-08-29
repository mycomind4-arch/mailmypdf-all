// Shared registry of SEO landing routes for cross-linking + sitemap.
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
  { to: "/print-and-mail-a-document-online", label: "Print and mail a document online" },
  // Phase 2
  { to: "/mail-documents-without-printer", label: "Mail documents without a printer" },
  { to: "/print-and-post-documents-online", label: "Print and post documents online" },
  { to: "/send-pdf-by-post", label: "Send a PDF by post" },
  { to: "/mail-paperwork-online", label: "Mail paperwork online" },
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
];

function hashPath(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function relatedFor(currentPath: string, count = 6): { to: string; label: string }[] {
  const pool = SEO_PAGES.filter((p) => p.to !== currentPath);
  const start = hashPath(currentPath) % pool.length;
  const out: { to: string; label: string }[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}
