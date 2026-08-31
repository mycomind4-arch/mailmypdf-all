import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-documents-by-mail-online";
const TITLE = "Send Documents by Mail Online | Upload, Pay, and Mail";
const DESC = "Send documents by physical mail from your browser. Upload a PDF and MailMyPDF will print and mail it for you.";

export const Route = createFileRoute("/send-documents-by-mail-online")({
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
      eyebrow="Documents by mail"
      h1="Send documents by mail online"
      intro="When a document needs to be sent by physical mail, MailMyPDF helps you do it online without a printer, envelope, or trip to the post office."
      whatYouCanSend={{
        heading: "Common documents people send",
        items: [
          "Signed contracts and agreements",
          "Government correspondence",
          "Insurance claims and appeals",
          "Cancellation letters",
          "Notices to a landlord or tenant",
          "Business letters and invoices",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
