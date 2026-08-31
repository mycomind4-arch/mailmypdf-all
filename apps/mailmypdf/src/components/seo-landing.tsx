import { Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export interface SeoPageProps {
  eyebrow: string;
  h1: string;
  intro: string;
  whatYouCanSend: {
    heading?: string;
    items: string[];
  };
  faq?: { q: string; a: string }[];
  disclaimer?: string;
  relatedLinks?: { to: string; label: string }[];
}

const DEFAULT_FAQ = [
  {
    q: "What file types do you accept?",
    a: "PDF only in this first version. Files must be under 10MB and no more than 10 pages.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can upload, pay, and send as a guest. Your order status link will be sent by email.",
  },
  {
    q: "Is certified mail available?",
    a: "Yes. You can add Certified Mail (tracking + signature) or Registered Mail (insured + tracking) at checkout for an additional fee.",
  },
  {
    q: "Can I send international mail?",
    a: "Not yet. MailMyPDF currently supports U.S. domestic mail only.",
  },
  {
    q: "Do you read my document?",
    a: "No. Uploaded PDFs are processed for printing and mailing. We do not use uploaded documents for AI training.",
  },
  {
    q: "What if I enter the wrong address?",
    a: "Users are responsible for reviewing the document and address before payment. MailMyPDF prints and mails using the information submitted.",
  },
];

const STEPS = [
  { n: "01", t: "Upload your PDF", d: "Drag in your PDF. Up to 10 pages, under 10MB." },
  {
    n: "02",
    t: "Enter the recipient's mailing address",
    d: "U.S. domestic addresses only in this release.",
  },
  { n: "03", t: "Review the price and pay online", d: "Secure Stripe checkout. Starts at $4.99." },
  {
    n: "04",
    t: "We print and mail your letter",
    d: "Printed and dropped in the mail through our print partner.",
  },
];

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h10m0 0L9 4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrimaryCta() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to="/send"
        className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-base font-medium text-white shadow-stamp transition-transform hover:-translate-y-0.5"
      >
        Upload PDF <ArrowRight />
      </Link>
      <a
        href="#how"
        className="inline-flex items-center gap-2 rounded-full border border-input px-5 py-3 text-sm text-foreground transition-colors hover:bg-muted"
      >
        How it works
      </a>
      <span className="font-mono text-xs uppercase tracking-widest text-cobalt">
        Starting at $4.99
      </span>
    </div>
  );
}

export function SeoLandingPage(props: SeoPageProps) {
  const faq = props.faq ?? DEFAULT_FAQ;
  const sendHeading = props.whatYouCanSend.heading ?? "What you can send";

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
          <div className="postmark w-fit">{props.eyebrow}</div>
          <h1 className="mt-6 text-4xl leading-[1.05] md:text-6xl">{props.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">{props.intro}</p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            PDF only · U.S. domestic mail · No account required · Private upload
          </p>
          <div className="mt-8">
            <PrimaryCta />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="postmark w-fit">Process</div>
            <h2 className="mt-4 text-3xl md:text-4xl">How MailMyPDF works</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="envelope-card p-6">
                <div className="font-mono text-xs text-cobalt">{s.n}</div>
                <div className="mt-3 font-serif text-2xl">{s.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you can send */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="postmark w-fit">Uses</div>
            <h2 className="mt-4 text-3xl md:text-4xl">{sendHeading}</h2>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-3 md:grid-cols-2">
            {props.whatYouCanSend.items.map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-rule/70 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                <span className="text-foreground">{i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing + Privacy */}
      <section className="border-t border-rule/60 bg-paper-deep/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
          <div className="envelope-card p-8">
            <div className="postmark w-fit">Pricing</div>
            <h3 className="mt-4 font-serif text-3xl">Starting at $4.99</h3>
            <p className="mt-3 text-muted-foreground">
              Simple per-letter pricing starts at $4.99 for 1–2 page black-and-white U.S. domestic
              letters.
            </p>
            <div className="mt-4">
              <Link
                to="/"
                hash="pricing"
                className="text-sm text-cobalt underline-offset-4 hover:underline"
              >
                See all pricing tiers →
              </Link>
            </div>
          </div>
          <div className="envelope-card p-8">
            <div className="postmark w-fit">Privacy</div>
            <h3 className="mt-4 font-serif text-3xl">Your document stays private</h3>
            <p className="mt-3 text-muted-foreground">
              Uploaded PDFs are used only to process, print, and mail your order. We do not use
              customer documents for AI training, resale, or marketing.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark mx-auto w-fit">FAQ</div>
          <h2 className="mt-4 text-center text-3xl md:text-4xl">Questions people ask</h2>
          <div className="mt-10 divide-y divide-rule/70 border-y border-rule/70">
            {faq.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between list-none">
                  <span className="font-serif text-xl">{item.q}</span>
                  <span className="text-cobalt transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related links */}
      {props.relatedLinks && props.relatedLinks.length > 0 && (
        <section className="border-t border-rule/60 bg-paper-deep/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="postmark w-fit">Related</div>
            <h2 className="mt-4 font-serif text-3xl">More ways to mail a PDF</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {props.relatedLinks.map((r) => (
                <Link
                  key={r.to}
                  to={r.to}
                  className="envelope-card block px-5 py-4 text-sm font-medium text-foreground hover:text-cobalt"
                >
                  {r.label} →
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      {props.disclaimer && (
        <section className="border-t border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-6 text-sm text-muted-foreground">
              <div className="font-mono text-xs uppercase tracking-widest text-cobalt">
                Disclaimer
              </div>
              <p className="mt-2">{props.disclaimer}</p>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="border-t border-rule/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="postmark mx-auto w-fit">Ready to mail</div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Upload. Address. <span className="italic text-cobalt">Mailed.</span>
          </h2>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export const DEFAULT_FAQ_LIST = DEFAULT_FAQ;
