/**
 * Checkout Review Page (Phase 3)
 *
 * Displays quote breakdown and initiates Stripe checkout.
 * User reviews final price before being redirected to Stripe.
 *
 * Route: /checkout/review?quoteId=...
 */

import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getPricingQuoteDetails } from "~/lib/pricing.functions";
import { createCheckoutSession } from "~/lib/stripe-payment.functions";

const CheckoutReviewSearch = z.object({
  quoteId: z.string().uuid(),
});

import { z } from "zod";

export const Route = createFileRoute("/checkout/review")({
  validateSearch: (search) => CheckoutReviewSearch.parse(search),
  component: CheckoutReviewPage,
});

function CheckoutReviewPage() {
  const search = useSearch({ from: "/checkout/review" });
  const navigate = useNavigate();

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
  }, [search.quoteId]);

  async function loadQuote() {
    try {
      setLoading(true);
      const result = await getPricingQuoteDetails(search.quoteId);

      if (!result.success) {
        setError(result.error || "Failed to load quote");
        return;
      }

      setQuote(result.quote);
    } catch (err) {
      setError("Failed to load quote details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProceedToPayment() {
    try {
      setSubmitting(true);
      setError(null);

      // Get current URL for success/cancel redirects
      const currentUrl = new URL(window.location.href);
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

      const result = await createCheckoutSession({
        quoteId: search.quoteId,
        successUrl: `${baseUrl}/checkout/success?quoteId=${search.quoteId}`,
        cancelUrl: `${baseUrl}/checkout/cancelled?quoteId=${search.quoteId}`,
      });

      if (!result.success) {
        setError(result.error || "Failed to create checkout session");
        return;
      }

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setError("Failed to proceed to payment");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <CheckoutReviewSkeleton />;
  }

  if (error) {
    return <CheckoutError error={error} onRetry={loadQuote} />;
  }

  if (!quote) {
    return <CheckoutError error="Quote not found" onRetry={loadQuote} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Review Your Order
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Please review the details before proceeding to payment
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Order Details (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Details Card */}
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
                Workflow Details
              </h2>

              <div className="space-y-3">
                <DetailRow label="Workflow" value={quote.workflowId} />
                <DetailRow label="Vertical" value={quote.verticalId} />
                <DetailRow label="Quote ID" value={quote.id.slice(0, 8)} />
                <DetailRow
                  label="Expires At"
                  value={new Date(quote.expiresAt).toLocaleString()}
                />
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">
                Price Breakdown
              </h2>

              <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
                <PriceRow
                  label="Workflow Fee"
                  amount={quote.lineItems.workflowBase}
                />
                {quote.lineItems.workflowDiscount > 0 && (
                  <PriceRow
                    label="Your Discount"
                    amount={-quote.lineItems.workflowDiscount}
                    discount
                  />
                )}
                {quote.lineItems.mailingService > 0 && (
                  <PriceRow
                    label="Mail Service"
                    amount={quote.lineItems.mailingService}
                  />
                )}
                {quote.lineItems.extraPages > 0 && (
                  <PriceRow
                    label="Extra Pages"
                    amount={quote.lineItems.extraPages}
                  />
                )}
                {quote.lineItems.discountCode > 0 && (
                  <PriceRow
                    label="Coupon Discount"
                    amount={-quote.lineItems.discountCode}
                    discount
                  />
                )}
              </div>

              {/* Total */}
              <div className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    ${(quote.lineItems.total / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security & Info */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>🔒 Secure Payment:</strong> Your payment is processed securely by Stripe. We never store your card information.
              </p>
            </div>
          </div>

          {/* Right Column: Summary & CTA (1/3) */}
          <aside>
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6 p-6 space-y-6">
              {/* Order Summary */}
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Order Summary
                </p>
                <div className="space-y-2">
                  <SummaryItem
                    label="Subtotal"
                    value={`$${(
                      (quote.lineItems.total +
                        quote.lineItems.workflowDiscount +
                        quote.lineItems.discountCode) /
                      100
                    ).toFixed(2)}`}
                  />
                  {(quote.lineItems.workflowDiscount > 0 ||
                    quote.lineItems.discountCode > 0) && (
                    <SummaryItem
                      label="Savings"
                      value={`-$${(
                        (quote.lineItems.workflowDiscount +
                          quote.lineItems.discountCode) /
                        100
                      ).toFixed(2)}`}
                      highlight
                    />
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                    <SummaryItem
                      label="Total"
                      value={`$${(quote.lineItems.total / 100).toFixed(2)}`}
                      bold
                    />
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleProceedToPayment}
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition"
                >
                  {submitting ? "Processing..." : "Proceed to Payment"}
                </button>
                <button
                  onClick={() => window.history.back()}
                  disabled={submitting}
                  className="w-full px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {/* Payment Methods */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  We Accept
                </p>
                <div className="flex gap-2">
                  <PaymentMethod icon="💳" label="Card" />
                  <PaymentMethod icon="🍎" label="Apple Pay" />
                  <PaymentMethod icon="🤖" label="Google Pay" />
                </div>
              </div>

              {/* Help Link */}
              <div className="text-center pt-4">
                <a
                  href="/support"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Need help? Contact support →
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 font-mono">
        {value}
      </p>
    </div>
  );
}

function PriceRow({
  label,
  amount,
  discount = false,
}: {
  label: string;
  amount: number;
  discount?: boolean;
}) {
  const cents = amount;
  const dollars = Math.abs(cents) / 100;
  const isNegative = cents < 0;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p
        className={`text-sm font-medium ${
          isNegative
            ? "text-green-600 dark:text-green-400"
            : "text-slate-900 dark:text-slate-50"
        }`}
      >
        {isNegative ? "-" : ""}${dollars.toFixed(2)}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <p
        className={`text-sm ${
          bold
            ? "font-bold text-slate-900 dark:text-slate-50"
            : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-sm font-medium ${
          highlight
            ? "text-green-600 dark:text-green-400"
            : "text-slate-900 dark:text-slate-50"
        } ${bold ? "text-base font-bold" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentMethod({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

function CheckoutReviewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-6 animate-pulse"
            >
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-4 bg-slate-200 dark:bg-slate-800 rounded"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function CheckoutError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-red-200 dark:border-red-800 p-8 max-w-md text-center">
        <p className="text-4xl mb-4">❌</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Error Loading Quote
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Retry
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
