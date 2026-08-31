import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/resources/")({
  head: () => ({
    meta: [
      { title: "Resources & Guides — Immigration Mail" },
      { name: "description", content: "Guides for preparing immigration correspondence: how to respond to notices, write explanation letters, and submit supporting documents." },
      { property: "og:title", content: "Resources & Guides — Immigration Mail" },
      { property: "og:description", content: "Guides for preparing immigration correspondence." },
    ],
    links: [{ rel: "canonical", href: "https://immigrationmail.com/resources" }],
  }),
  component: ResourcesIndex,
});

const guides = [
  {
    slug: "how-to-respond-to-rfe",
    title: "How to Respond to a Request for Evidence (RFE)",
    excerpt: "An RFE gives you a deadline to submit additional evidence. Here's how to organize your response, what to include, and how to mail it with proof of delivery.",
    readTime: "6 min",
    category: "Responding to Notices",
    icon: "📋",
  },
  {
    slug: "writing-an-explanation-letter",
    title: "Writing an Effective Explanation Letter",
    excerpt: "Explanation letters accompany your application or response to clarify circumstances. Learn what to include, what to avoid, and how to structure your letter.",
    readTime: "5 min",
    category: "Correspondence Tips",
    icon: "✍️",
  },
  {
    slug: "certified-mail-guide",
    title: "Why Certified Mail Matters for Immigration Correspondence",
    excerpt: "When you send immigration correspondence, proof of delivery can be critical. Here's what certified mail offers and when to use it.",
    readTime: "4 min",
    category: "Mailing",
    icon: "📮",
  },
];

function ResourcesIndex() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />

      <section className="border-b border-rule/60 bg-paper-deep/20 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="postmark w-fit">Resources</div>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">Guides for your correspondence</h1>
          <p className="mt-4 text-muted-foreground">Practical, plain-language guides about preparing and sending immigration-related correspondence. Not legal advice — written to help you understand the process.</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-5">
            {guides.map((guide) => (
              <Link key={guide.slug} to="/resources/$slug" params={{ slug: guide.slug }} className="envelope-card envelope-card-hover group p-6">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-xl">{guide.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-stamp">{guide.category}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span>
                    </div>
                    <h2 className="mt-2 font-serif text-xl text-foreground group-hover:text-stamp transition-colors">{guide.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-stamp">
                      Read guide <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-rule/70 bg-paper-deep/40 p-6 text-center">
            <BookOpen size={24} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">More guides are being written. Have a topic you'd like covered? Let us know at <span className="font-semibold text-stamp">support@immigrationmail.app</span>.</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
