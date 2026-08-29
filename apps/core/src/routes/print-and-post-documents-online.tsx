import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/print-and-post-documents-online";
const TITLE = "Print and Post Documents Online | MailMyPDF";
const DESC = "Upload a PDF and send it by physical mail. MailMyPDF prints and mails documents online for U.S. domestic letters.";

export const Route = createFileRoute("/print-and-post-documents-online")({
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
      eyebrow={"Print and post"}
      h1={"Print and post documents online"}
      intro={"MailMyPDF helps you turn a digital PDF into a physical mailed letter. Upload your document, enter the address, review the price, and send it online."}
      whatYouCanSend={{
        heading: "What you can send",
        items: ["Prepared PDF documents", "Signed forms saved as PDFs", "Business letters", "Formal correspondence", "Application materials", "Supporting paperwork"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
