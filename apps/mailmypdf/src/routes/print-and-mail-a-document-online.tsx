import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/print-and-mail-a-document-online";
const TITLE = "Print and Mail a Document Online | MailMyPDF";
const DESC = "Upload any PDF document, enter an address, and MailMyPDF will print and mail it as a physical letter.";

export const Route = createFileRoute("/print-and-mail-a-document-online")({
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
      eyebrow="Print and mail a document"
      h1="Print and mail a document online"
      intro="MailMyPDF turns any PDF document into a physical letter. Upload the file, enter the mailing address, and we'll print and mail it for you."
      whatYouCanSend={{
        heading: "What people send",
        items: [
          "Signed forms and applications",
          "Personal and business letters",
          "Government correspondence",
          "Insurance and financial documents",
          "Cancellation and notice letters",
          "Supporting documentation",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
