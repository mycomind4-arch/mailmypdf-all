import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-dmv";
const TITLE = "Send a Letter to the DMV Online | Print and Mail Documents";
const DESC = "Mail documents to a DMV office without a printer. Upload your PDF, enter the DMV address, and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-dmv")({
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
      eyebrow="Mail to the DMV"
      h1="Send a letter to the DMV online"
      intro="MailMyPDF helps you send physical documents to a DMV office from your browser. Upload your PDF, enter the address, and send your letter online."
      whatYouCanSend={{
        heading: "Documents people commonly mail",
        items: [
          "Vehicle registration paperwork",
          "License-related correspondence",
          "Address change letters",
          "Signed forms and attachments",
          "Responses to DMV notices",
          "Supporting documentation",
        ],
      }}
      disclaimer="MailMyPDF is not affiliated with any DMV or state motor vehicle agency. You are responsible for confirming the correct mailing address and document requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
