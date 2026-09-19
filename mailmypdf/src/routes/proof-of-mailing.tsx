import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/proof-of-mailing")({
  head: () => ({
    meta: [
      { title: "Proof of Mailing | How to Document That You Sent a Letter | MailMyPDF" },
      { name: "description", content: "Learn how proof of mailing works, what records to keep, and when certified mail may be useful for important documents." },
      { property: "og:title", content: "Proof of Mailing | MailMyPDF" },
      { property: "og:description", content: "Understand the records that can help document an important mailing." },
    ],
    links: [{ rel: "canonical", href: "/proof-of-mailing" }],
  }),
  component: Page,
});

function Page() {
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28"><div className="postmark w-fit">Proof of mailing</div><h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Need to Prove You Sent a Letter?</h1><p className="mt-7 max-w-2xl text-xl text-ink-soft">For an important document, keeping a copy of the letter may not be enough. A documented mailing workflow can help you establish what you sent and when you sent it.</p><Link to="/certified-mail-guide" className="mt-8 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">See Certified Mail Options →</Link></div></section>
    <section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">What should you preserve?</h2><div className="mt-10 grid gap-5 md:grid-cols-2">{[["The document","Keep the exact version you intended to send."],["Recipient information","Preserve the destination and relevant address information."],["Mailing record","Keep the order details and date associated with the mailing."],["Delivery information","When a tracked or certified service is used, retain the resulting delivery or attempt information available for that service."]].map(([t,d])=><div className="envelope-card p-6" key={t}><h3 className="font-serif text-2xl">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p></div>)}</div></div></section>
    <section><div className="mx-auto max-w-4xl px-6 py-20"><div className="postmark w-fit">Important distinction</div><h2 className="mt-4 text-3xl md:text-4xl">Proof of mailing is not the same as proof of recipient action</h2><p className="mt-5 text-lg text-ink-soft">A mailing record can document that a document entered the mail process. Delivery records can document delivery or an attempted delivery. Neither necessarily proves that the recipient agreed with the document, read it, or took the requested action.</p></div></section>
    <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Create a documented mailing record</h2><p className="mt-5 text-lg text-ink-soft">Upload your document, choose the appropriate mailing method, and keep the resulting order information with your records.</p><Link to="/send" className="mt-7 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Start a Mailing →</Link></div></section>
  </main><SiteFooter /></div>;
}
