/**
 * Checkout Cancelled Page (Phase 3)
 *
 * Displays when user cancels Stripe checkout.
 * Quote remains in "pending" status for 1 hour.
 *
 * Route: /checkout/cancelled?quoteId=...
 */

import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const CheckoutCancelledSearch = z.object({
  quoteId: z.string().uuid(),
});

export const Route = createFileRoute("/checkout/cancelled")({
  validateSearch: (search) => CheckoutCancelledSearch.parse(search),
  component: CheckoutCancelledPage,
});

function CheckoutCancelledPage() {
  const search = useSearch({ from: "/checkout/cancelled" });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-slate-100 dark:from-amber-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <div className="text-6xl mb-4">⏸️</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Checkout Cancelled
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Your quote is still available - you can complete your purchase anytime
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          <div className="space-y-8">
            {/* Info Box */}
            <div className="bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 p-6">
              <p className="text-amber-900 dark:text-amber-50">
                <strong>ℹ️ Your Quote:</strong> Your pricing quote is saved and valid for 1 hour from when it was created. You can come back anytime during this window to complete your purchase.
              </p>
            </div>

            {/* Why Cancel */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
                Why did you cancel?
              </h2>

              <div className="space-y-2">
                <CancelReason
                  emoji="💰"
                  title="Price concern"
                  description="View your discounts and special offers"
                />
                <CancelReason
                  emoji="❓"
                  title="Have questions"
                  description="Check our FAQ or contact our support team"
                />
                <CancelReason
                  emoji="⏰"
                  title="Not ready yet"
                  description="Your quote will be saved for 1 hour"
                />
                <CancelReason
                  emoji="🔐"
                  title="Security concern"
                  description="We use Stripe for secure, PCI-compliant payments"
                />
              </div>
            </div>

            {/* Quote Info */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
                Your Quote Details
              </h2>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="space-y-2 text-sm">
                  <DetailRow label="Quote ID" value={search.quoteId.slice(0, 8)} />
                  <DetailRow
                    label="Valid Until"
                    value="~1 hour from creation"
                  />
                  <DetailRow label="Status" value="Pending" />
                </div>
              </div>
            </div>

            {/* What You Get */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
                What's Included
              </h2>

              <ul className="space-y-2">
                <BenefitItem emoji="✓" text="Complete workflow processing" />
                <BenefitItem emoji="✓" text="Priority support" />
                <BenefitItem emoji="✓" text="Secure payment processing" />
                <BenefitItem emoji="✓" text="Email confirmation" />
                <BenefitItem emoji="✓" text="Order tracking" />
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() =>
                  navigate({
                    to: "/checkout/review",
                    search: { quoteId: search.quoteId },
                  })
                }
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
              >
                Complete Purchase
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Dashboard
                </button>

                <a
                  href="/support"
                  className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition text-center"
                >
                  Contact Support
                </a>
              </div>
            </div>

            {/* Security Message */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-center">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                🔒 Your payment information is secure. Stripe is PCI-DSS Level 1 certified.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Frequently Asked Questions
          </h2>

          <FAQItem
            question="How long is my quote valid?"
            answer="Your quote is valid for 1 hour from when it was created. After that, you'll need to request a new quote."
          />

          <FAQItem
            question="Can I change the amount?"
            answer="No, quotes are locked at creation time and cannot be modified. If you need a different amount, request a new quote."
          />

          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards, Apple Pay, and Google Pay through Stripe."
          />

          <FAQItem
            question="Is my payment information safe?"
            answer="Yes! We never store your payment information. All payments are processed securely through Stripe, a Level 1 PCI-DSS certified payment processor."
          />
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CancelReason({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-1">{emoji}</span>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-50">
            {title}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-slate-600 dark:text-slate-400">{label}</p>
      <p className="font-mono font-medium text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

function BenefitItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <li className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
      <span className="text-lg">{emoji}</span>
      <span>{text}</span>
    </li>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition group">
      <summary className="font-medium text-slate-900 dark:text-slate-50 flex items-center justify-between">
        {question}
        <span className="text-slate-400 group-open:rotate-180 transition">
          ▼
        </span>
      </summary>
      <p className="text-slate-600 dark:text-slate-400 mt-4">{answer}</p>
    </details>
  );
}
