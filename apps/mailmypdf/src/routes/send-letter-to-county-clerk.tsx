import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-county-clerk";
const TITLE = "Send a Letter to a County Clerk Online | MailMyPDF";
const DESC = "Mail documents to a county clerk online. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-county-clerk")({
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
      eyebrow={"Letter to a county clerk"}
      h1={"Send a letter to a county clerk online"}
      intro={"MailMyPDF helps you send prepared documents to a county clerk's office by physical mail from your browser."}
      whatYouCanSend={{
        heading: "Documents people commonly mail",
        items: ["Prepared forms", "Signed correspondence", "Records request letters", "Notices", "Cover letters", "Supporting documentation"],
      }}
      disclaimer="MailMyPDF is not affiliated with any county office and does not provide legal, government, or filing advice."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
