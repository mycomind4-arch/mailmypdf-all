import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-cease-and-desist-letter";
const TITLE = "Send a Cease and Desist Letter by Mail | MailMyPDF";
const DESC = "Have a cease and desist PDF ready? Upload it, enter the recipient's address, and MailMyPDF will print and mail it for you.";

export const Route = createFileRoute("/send-cease-and-desist-letter")({
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
      eyebrow="Cease and desist"
      h1="Send a cease and desist letter by mail"
      intro="If you already have a cease and desist letter prepared as a PDF, MailMyPDF can print and mail it to the recipient without you touching a printer."
      whatYouCanSend={{
        heading: "Common uses",
        items: [
          "Harassment or defamation notices",
          "Trademark and copyright notices",
          "Contract breach notices",
          "Debt collection responses",
          "Unwanted contact notices",
          "Formal warnings before legal action",
        ],
      }}
      disclaimer="MailMyPDF is not a law firm and does not provide legal advice. We do not draft, review, or verify the legal effect of any letter. Consult a licensed attorney if you need legal guidance, and check whether certified mail or other delivery methods are required for your situation."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
