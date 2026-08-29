import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-a-pdf";
const TITLE = "Mail a PDF Online Without a Printer | MailMyPDF";
const DESC = "Upload a PDF, enter a mailing address, and send it as a real physical letter. No printer, envelope, stamp, or post office needed.";

export const Route = createFileRoute("/mail-a-pdf")({
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
      eyebrow="Mail a PDF"
      h1="Mail a PDF online without a printer"
      intro="Need to mail a PDF but don't have a printer, envelope, or stamp? MailMyPDF lets you upload your document, enter the recipient's address, pay online, and have it printed and mailed for you."
      whatYouCanSend={{
        items: [
          "Cover letters and job applications",
          "IRS or state tax correspondence",
          "Cancellation letters",
          "Notice to a landlord or tenant",
          "Insurance claims and appeals",
          "Signed contracts and agreements",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
