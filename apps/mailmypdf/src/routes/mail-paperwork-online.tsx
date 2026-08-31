import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-paperwork-online";
const TITLE = "Mail Paperwork Online | Print and Mail Your PDF";
const DESC = "Mail paperwork online without a printer or post office. Upload a PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/mail-paperwork-online")({
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
      eyebrow={"Paperwork by mail"}
      h1={"Mail paperwork online"}
      intro={"When paperwork needs to be sent as physical mail, MailMyPDF helps you upload your PDF, enter a recipient address, and send it without handling printing or postage yourself."}
      whatYouCanSend={{
        heading: "Paperwork people commonly mail",
        items: ["Signed forms", "Applications", "Business documents", "Correspondence", "Supporting paperwork", "Prepared PDF letters"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
