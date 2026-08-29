import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/resources/")({
  head: () => ({ meta: [
    { title: "Resources & Guides — Notice Respond" },
    { name: "description", content: "Guides for responding to government notices: IRS notices, court summonses, agency actions, and appeals." },
  ] }),
  component: ResourcesIndex,
});

const guides = [
  { slug: "understanding-irs-notices", title: "Understanding IRS Notices: CP Letters Explained", excerpt: "The IRS sends dozens of notice types. Here's what the most common ones mean and how to respond.", readTime: "6 min", category: "IRS Notices" },
  { slug: "responding-to-court-summons", title: "How to Respond to a Court Summons", excerpt: "A court summons demands a timely response. Here's what to know about deadlines, formats, and proof of filing.", readTime: "5 min", category: "Court Responses" },
  { slug: "certified-mail-for-deadlines", title: "Why Certified Mail Matters for Deadline-Sensitive Responses", excerpt: "When you're responding to a government notice, proof of timely delivery can be critical.", readTime: "4 min", category: "Mailing" },
];

function ResourcesIndex() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-2xl px-6 py-16">
          <div className="postmark w-fit">Resources</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Guides for your responses</h1>
          <p className="mt-4 text-muted-foreground">Practical, plain-language guides about responding to government notices. Not legal advice — written to help you understand the process.</p>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-6 py-12">
          <div className="grid gap-5">
            {guides.map((guide) => (
              <Link key={guide.slug} to="/resources/$slug" params={{ slug: guide.slug }} className="envelope-card envelope-card-hover block p-6">
                <div className="flex items-start gap-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rule bg-paper-deep">
                    <svg className="h-6 w-6 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4" /></svg>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="font-medium text-stamp">{guide.category}</span><span>·</span><span>{guide.readTime} read</span></div>
                    <h2 className="mt-2 font-serif text-xl">{guide.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-stamp">Read guide <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 rounded-md border border-dashed border-rule bg-paper-deep/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">More guides are being written. Have a topic you'd like covered? Let us know at <span className="font-medium text-stamp">support@noticerespond.app</span>.</p>
          </div>
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
