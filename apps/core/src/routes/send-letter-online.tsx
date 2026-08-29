import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-online";
const TITLE = "Send a Letter Online | Print and Mail from Your Browser";
const DESC = "Send a real physical letter online. Upload your PDF, enter the recipient's address, pay securely, and we'll print and mail it.";

export const Route = createFileRoute("/send-letter-online")({
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
      eyebrow="Send a letter online"
      h1="Send a letter online"
      intro="MailMyPDF makes it simple to send a physical letter from your browser. Upload your PDF, add the mailing address, review the price, and send it without visiting a post office."
      whatYouCanSend={{
        heading: "Letters people send with MailMyPDF",
        items: [
          "Personal letters and notes",
          "Cover letters and job applications",
          "Cancellation letters",
          "Notice to a landlord or tenant",
          "Insurance claims and appeals",
          "Signed contracts and agreements",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
