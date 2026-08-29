import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-client";
const TITLE = "Send a Letter to a Client Online | MailMyPDF";
const DESC = "Send a physical letter to a client without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-client")({
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
      eyebrow={"Letter to a client"}
      h1={"Send a letter to a client online"}
      intro={"Need to send a physical letter to a client? MailMyPDF lets you upload your prepared PDF and mail it from your browser."}
      whatYouCanSend={{
        heading: "Client letters people mail",
        items: ["Engagement letters", "Signed proposals", "Follow-up letters", "Invoice cover letters", "Termination notices", "Formal correspondence"],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
