import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-invoice-by-mail";
const TITLE = "Send an Invoice by Mail | Print and Mail a PDF Invoice";
const DESC = "Send invoices by physical mail online. Upload your invoice PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-invoice-by-mail")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PATH },
    ],
    links: [{ rel: "canonical", href: PATH }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(DEFAULT_FAQ_LIST)) }],
  }),
  component: () => (
    <SeoLandingPage
      eyebrow={"Invoice by mail"}
      h1={"Send an invoice by mail"}
      intro={"Some customers still need invoices by physical mail. MailMyPDF helps you upload an invoice PDF, enter the mailing address, and send it without printing or stamping it yourself."}
      whatYouCanSend={{
        heading: "Invoices freelancers and businesses mail",
        items: ["Freelancer invoices", "Small business invoices", "Contractor invoices", "Recurring client invoices", "Past-due invoice notices", "Statement of account letters"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
