import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-company";
const TITLE = "Send a Letter to a Company Online | MailMyPDF";
const DESC = "Mail a physical letter to a company online. Upload your PDF, enter the company address, and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-company")({
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
      eyebrow={"Letter to a company"}
      h1={"Send a letter to a company online"}
      intro={"If you need to send a physical letter to a company, MailMyPDF helps you upload your document and mail it online."}
      whatYouCanSend={{
        heading: "Letters people commonly mail to companies",
        items: ["Cancellation letters", "Complaint letters", "Refund requests", "Formal notices", "Correspondence with service providers", "Supporting documentation"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
