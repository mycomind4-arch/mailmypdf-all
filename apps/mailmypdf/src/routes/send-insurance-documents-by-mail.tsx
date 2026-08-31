import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-insurance-documents-by-mail";
const TITLE = "Send Insurance Documents by Mail Online | MailMyPDF";
const DESC = "Mail insurance documents online without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-insurance-documents-by-mail")({
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
      eyebrow={"Insurance documents"}
      h1={"Send insurance documents by mail online"}
      intro={"MailMyPDF helps you send prepared insurance documents by physical mail. Upload your PDF, enter the recipient address, and send it online."}
      whatYouCanSend={{
        heading: "Insurance documents people mail",
        items: ["Prepared insurance forms", "Claim documentation", "Appeal letters", "Cancellation letters", "Cover letters", "Supporting paperwork"],
      }}
      disclaimer="MailMyPDF is not affiliated with any insurance company and does not provide insurance, legal, or claims advice."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
