import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-court-clerk";
const TITLE = "Send a Letter to a Court Clerk Online | MailMyPDF";
const DESC = "Upload a PDF and mail it to a court clerk's office. MailMyPDF prints and mails documents online.";

export const Route = createFileRoute("/send-letter-to-court-clerk")({
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
      eyebrow={"Letter to a court clerk"}
      h1={"Send a letter to a court clerk online"}
      intro={"If you already have a prepared PDF that needs to be mailed to a court clerk's office, MailMyPDF can help you print and mail it online."}
      whatYouCanSend={{
        heading: "Documents people commonly mail",
        items: ["Letters to a court clerk", "Signed forms", "Responses to court notices", "Continuance requests (prepared)", "Cover letters", "Supporting documentation"],
      }}
      disclaimer="MailMyPDF is not affiliated with any court and does not provide legal advice, filing advice, or deadline advice. We do not guarantee that any court will accept a document. Users are responsible for confirming the correct address, filing method, deadline, and requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
