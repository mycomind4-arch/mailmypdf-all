import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/print-and-mail-pdf-online";
const TITLE = "Print and Mail a PDF Online | MailMyPDF";
const DESC = "Print and mail a PDF online in minutes. Upload your document, enter the address, and send a physical letter without leaving home.";

export const Route = createFileRoute("/print-and-mail-pdf-online")({
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
      eyebrow="Print and mail online"
      h1="Print and mail a PDF online"
      intro="MailMyPDF turns your PDF into a physical letter. Upload the file, enter the recipient address, review your order, and we'll handle the print-and-mail process."
      whatYouCanSend={{
        items: [
          "Business correspondence",
          "Cover letters and applications",
          "Tax and government correspondence",
          "Landlord and tenant notices",
          "Insurance claims and appeals",
          "Signed contracts",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
