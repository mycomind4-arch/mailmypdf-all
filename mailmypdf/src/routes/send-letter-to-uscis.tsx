import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-uscis";
const TITLE = "Send a Letter to USCIS Online | Print and Mail a PDF";
const DESC = "Mail a letter or supporting document to USCIS. Upload your PDF, enter the USCIS mailing address, and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-uscis")({
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
      eyebrow="Mail to USCIS"
      h1="Send a letter to USCIS online"
      intro="If you already have a letter or supporting document prepared as a PDF, MailMyPDF can print and mail it to USCIS on your behalf."
      whatYouCanSend={{
        heading: "Common USCIS correspondence",
        items: [
          "Responses to Requests for Evidence (RFEs)",
          "Address change letters",
          "Supporting documentation for a pending case",
          "Signed forms and attachments",
          "Correspondence about case status",
          "General inquiries",
        ],
      }}
      disclaimer="MailMyPDF is not affiliated with USCIS or any U.S. government agency and does not provide immigration or legal advice. USCIS has specific filing addresses and delivery requirements — you are responsible for confirming the correct address and using an appropriate delivery method for time-sensitive submissions."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
