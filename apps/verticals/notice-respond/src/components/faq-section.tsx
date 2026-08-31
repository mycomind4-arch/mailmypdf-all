/**
 * FAQSection — displays FAQ content on the workflow intro page.
 * Renders structured FAQ entries with proper HTML semantics for SEO.
 */
import type { FAQEntry } from "../domain/workflow-seo";

export function FAQSection({ faq }: { faq: FAQEntry[] }) {
  if (!faq || faq.length === 0) return null;

  return (
    <section className="mt-16 border-t border-rule pt-8">
      <h2 className="font-serif text-2xl text-foreground">Frequently Asked Questions</h2>
      <div className="mt-6 space-y-6">
        {faq.map((item, i) => (
          <div key={i} className="border-b border-rule/40 pb-6">
            <h3 className="font-medium text-lg text-foreground">{item.question}</h3>
            <p className="mt-2 text-muted-foreground leading-relaxed">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
