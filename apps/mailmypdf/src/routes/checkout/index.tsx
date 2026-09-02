/**
 * Checkout Page
 *
 * Display pricing quote and process payment via Stripe.
 *
 * Flow:
 * 1. User requests workflow pricing
 * 2. Canonical pricing engine generates quote
 * 3. User navigates to /checkout/:quoteId
 * 4. Page loads quote details and Stripe payment form
 * 5. User enters card details and submits
 * 6. Stripe processes payment
 * 7. Webhook accepts quote and creates order
 * 8. User redirected to success page
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Mail, AlertCircle, Lock } from "lucide-react";
import { getCheckoutSession, getPricingQuote } from "@/lib/checkout.functions";

export const Route = createFileRoute("/checkout/")({
  parseParams: (params) => ({
    quoteId: params.quoteId as string,
  }),
  stringifyParams: (params) => ({
    quoteId: params.quoteId,
  }),
  component: CheckoutPage,
});

const stripePromise = loadStripe(
  process.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

function CheckoutPage() {
  const { quoteId } = Route.useSearch();

  if (!quoteId) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="rounded-lg border border-rule/60 bg-card p-12 text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <p className="font-medium">Invalid Quote ID</p>
          <p className="text-sm text-ink-soft mt-2">Please request a new quote to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutContent quoteId={quoteId} />
    </Elements>
  );
}

interface CheckoutContentProps {
  quoteId: string;
}

function CheckoutContent({ quoteId }: CheckoutContentProps) {
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuery({
    queryKey: ["pricing-quote", quoteId],
    queryFn: () => getPricingQuote.fetch({ quoteId }),
  });

  if (quoteLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-rule border-t-cobalt animate-spin mx-auto mb-4" />
          <p className="text-ink-soft">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (quoteError || !quote) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="rounded-lg border border-rule/60 bg-card p-12 text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <p className="font-medium">Quote Not Found</p>
          <p className="text-sm text-ink-soft mt-2">
            {quoteError instanceof Error ? quoteError.message : "This quote may have expired."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule/60 bg-paper sticky top-0 z-40">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-2xl">Checkout</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quote Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-rule/60 bg-card p-6 space-y-4">
              <h2 className="font-serif text-xl">Order Summary</h2>

              {/* Line Items */}
              <div className="space-y-3 border-b border-rule/60 pb-4">
                {quote.lineItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-soft">{item.description}</span>
                    <span className="font-medium">
                      ${(item.amountCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Policy Info */}
              <div className="rounded-lg bg-brass/5 border border-brass/20 p-3">
                <p className="text-xs text-ink-soft">Applied Policy</p>
                <p className="font-medium">{quote.pricingPolicySlug}</p>
              </div>

              {/* Total */}
              <div className="flex justify-between pt-4 border-t border-rule/60">
                <span className="font-serif text-lg">Total</span>
                <span className="font-serif text-2xl">
                  ${(quote.total / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-1">
            <PaymentForm quote={quote} quoteId={quoteId} />
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 flex items-center gap-2 text-xs text-ink-soft">
          <Lock className="h-4 w-4" />
          <p>Secure payment powered by Stripe. Your data is encrypted.</p>
        </div>
      </main>
    </div>
  );
}

interface PaymentFormProps {
  quote: any;
  quoteId: string;
}

function PaymentForm({ quote, quoteId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe not loaded");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get checkout session from server
      const session = await getCheckoutSession.fetch({
        quoteId,
        totalCents: quote.total,
      });

      if (!session.clientSecret) {
        throw new Error("Failed to create payment session");
      }

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(session.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: session.userEmail,
            },
          },
        });

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Payment succeeded, redirect to success page
        window.location.href = `/checkout/success?orderId=${paymentIntent.id}`;
      } else {
        setError("Payment was not completed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-rule/60 bg-card p-6 space-y-4">
        <h3 className="font-serif text-lg">Payment Details</h3>

        {/* Card Element */}
        <div className="rounded-lg border border-rule bg-paper p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#0f0f0f",
                  "::placeholder": {
                    color: "#888",
                  },
                },
                invalid: {
                  color: "#dc2626",
                },
              },
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="w-full py-2 px-4 rounded-full bg-cobalt text-white font-medium hover:bg-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Pay ${(quote.total / 100).toFixed(2)}
            </>
          )}
        </button>

        <p className="text-xs text-ink-soft text-center">
          Quote expires in 30 minutes
        </p>
      </div>

      {/* Terms */}
      <p className="text-xs text-ink-soft text-center">
        By clicking "Pay", you agree to send this mailing via MailMyPDF
      </p>
    </form>
  );
}
