import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-business-documents-by-mail";
const TITLE = "Send Business Documents by Mail Online | MailMyPDF";
const DESC = "Send business documents by physical mail from your browser. Upload a PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-business-documents-by-mail")({
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
      eyebrow={"Business mail"}
      h1={"Send business documents by mail online"}
      intro={"MailMyPDF helps businesses send physical letters and documents online. Upload your PDF, enter the recipient address, review your order, and send it."}
      whatYouCanSend={{
        heading: "Business documents people mail",
        items: ["Signed contracts", "Client letters", "Vendor correspondence", "Business notices", "Formal announcements", "Supporting paperwork"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
