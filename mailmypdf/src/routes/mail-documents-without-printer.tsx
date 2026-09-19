import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-documents-without-printer";
const TITLE = "Mail Documents Without a Printer | MailMyPDF";
const DESC = "Need to mail documents but do not have a printer? Upload your PDF and MailMyPDF will print and mail it for you.";

export const Route = createFileRoute("/mail-documents-without-printer")({
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
      eyebrow={"No printer needed"}
      h1={"Mail documents without a printer"}
      intro={"If you need to mail a document but do not have a printer, envelope, stamp, or time to visit the post office, MailMyPDF lets you upload your PDF and send it as a physical letter online."}
      whatYouCanSend={{
        heading: "What you can send",
        items: ["Prepared PDF documents", "Signed forms saved as PDFs", "Business letters", "Application materials", "Supporting paperwork", "Formal correspondence"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
