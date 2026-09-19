import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-tax-documents-online";
const TITLE = "Mail Tax Documents Online | Print and Mail Your PDF";
const DESC = "Mail tax documents online without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/mail-tax-documents-online")({
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
      eyebrow={"Tax documents"}
      h1={"Mail tax documents online"}
      intro={"MailMyPDF helps you mail prepared tax documents from your browser. Upload your PDF, enter the mailing address, and send it as a physical letter."}
      whatYouCanSend={{
        heading: "Tax documents people commonly mail",
        items: ["Prepared tax correspondence", "Signed forms", "Response letters to notices", "Cover letters", "Supporting documentation", "Payment vouchers (already prepared)"],
      }}
      disclaimer="MailMyPDF is not a tax service and does not provide tax advice. Users are responsible for confirming the correct address, deadline, and document requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
