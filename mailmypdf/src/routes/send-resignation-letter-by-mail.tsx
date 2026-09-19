import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-resignation-letter-by-mail";
const TITLE = "Send a Resignation Letter by Mail | MailMyPDF";
const DESC = "Mail your signed resignation letter as a physical letter. Upload the PDF, enter your employer's address, and MailMyPDF handles the rest.";

export const Route = createFileRoute("/send-resignation-letter-by-mail")({
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
      eyebrow="Resignation letter"
      h1="Send a resignation letter by mail"
      intro="Prefer to submit your resignation as a physical letter? Upload your signed resignation PDF and MailMyPDF will print and mail it to your employer."
      whatYouCanSend={{
        heading: "Related letters people send",
        items: [
          "Standard two-week resignation letters",
          "Immediate resignation notices",
          "Retirement notification letters",
          "Position transfer requests",
          "Formal follow-up correspondence",
          "Return of company property letters",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
