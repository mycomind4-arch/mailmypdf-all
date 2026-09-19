import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-signed-document-online";
const TITLE = "Send a Signed Document Online by Mail | MailMyPDF";
const DESC = "Upload a signed PDF and send it as a physical letter. MailMyPDF prints and mails your document for you.";

export const Route = createFileRoute("/send-signed-document-online")({
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
      eyebrow={"Signed and mailed"}
      h1={"Send a signed document online by mail"}
      intro={"If you have a signed PDF that needs to be mailed, MailMyPDF lets you upload the file and send it as a physical letter without printing it yourself."}
      whatYouCanSend={{
        heading: "Signed documents people mail",
        items: ["Signed contracts", "Signed agreements", "Signed forms", "Signed letters", "Signed authorizations", "Signed supporting paperwork"],
      }}
      disclaimer="MailMyPDF does not verify signatures or determine whether a signed document satisfies any legal, business, or filing requirement."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
