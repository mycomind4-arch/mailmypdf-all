import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/mail-a-contract-online";
const TITLE = "Mail a Signed Contract Online | Print and Mail PDFs";
const DESC = "Upload a signed contract PDF and MailMyPDF will print and mail a physical copy to the other party.";

export const Route = createFileRoute("/mail-a-contract-online")({
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
      eyebrow="Mail a contract"
      h1="Mail a signed contract online"
      intro="Some agreements still need a physical copy in the mail. MailMyPDF lets you upload a signed contract PDF and send it as a real letter."
      whatYouCanSend={{
        heading: "Contracts and agreements",
        items: [
          "Service and vendor agreements",
          "Freelance and consulting contracts",
          "Non-disclosure agreements",
          "Lease and rental agreements",
          "Employment offer letters",
          "Settlement and release documents",
        ],
      }}
      disclaimer="MailMyPDF does not draft, review, or verify the legal effect of any contract. You are responsible for the accuracy of the document and the recipient's address."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
