import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-forms-online";
const TITLE = "Mail Forms Online | Upload, Print, and Mail a PDF";
const DESC = "Mail forms online without printing them yourself. Upload your PDF and MailMyPDF will send it as a physical letter.";

export const Route = createFileRoute("/mail-forms-online")({
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
      eyebrow={"Forms by mail"}
      h1={"Mail forms online"}
      intro={"MailMyPDF helps you send forms by physical mail without handling printing, envelopes, or postage yourself."}
      whatYouCanSend={{
        heading: "Forms people commonly mail",
        items: ["Signed application forms", "Government forms (prepared as PDF)", "Business forms", "Enrollment forms", "Registration forms", "Supporting paperwork"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
