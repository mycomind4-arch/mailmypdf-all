import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-pdf-by-post";
const TITLE = "Send a PDF by Post | Upload and Mail Online";
const DESC = "Send a PDF by physical mail without printing it yourself. Upload your file and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-pdf-by-post")({
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
      eyebrow={"PDF by post"}
      h1={"Send a PDF by post"}
      intro={"Need to send a PDF by physical mail? MailMyPDF makes it easy to upload your document and have it printed and mailed from your browser."}
      whatYouCanSend={{
        heading: "PDFs people commonly post",
        items: ["Signed contracts and agreements", "Business letters", "Application PDFs", "Prepared forms", "Formal correspondence", "Supporting documentation"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
