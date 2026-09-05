/**
 * Checkout Success Page (Phase 3)
 *
 * Displays after successful Stripe payment.
 * Webhook will confirm payment and update quote status.
 *
 * Route: /checkout/success?quoteId=...
 */

import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPaymentStatus } from "~/lib/stripe-payment.functions";
import { z } from "zod";

const CheckoutSuccessSearch = z.object({
  quoteId: z.string().uuid(),
});

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search) => CheckoutSuccessSearch.parse(search),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const search = useSearch({ from: "/checkout/success" });
  const navigate = useNavigate();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  useEffect(() => {
    if (!loading && status?.status !== "accepted") {
      // Poll every 2 seconds for up to 30 seconds
      if (checkCount < 15) {
        const timer = setTimeout(() => {
          checkPaymentStatus();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, status, checkCount]);

  async function checkPaymentStatus() {
    try {
      const result = await getPaymentStatus(search.quoteId);

      if (result.success) {
        setStatus(result);
      }

      setCheckCount((c) => c + 1);
    } catch (error) {
      console.error("Error checking payment status:", error);
    } finally {
      setLoading(false);
    }
  }

  const isConfirmed = status?.status === "accepted";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-slate-100 dark:from-green-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <div className="text-6xl mb-4">
            {isConfirmed ? "✅" : "⏳"}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isConfirmed ? "Payment Successful!" : "Processing Payment..."}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {isConfirmed
              ? "Your order has been confirmed"
              : "Please wait while we confirm your payment"}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          {loading ? (
            /* Loading State */
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-blue-600 animate-spin" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Verifying payment with Stripe...
              </p>
            </div>
          ) : isConfirmed ? (
            /* Confirmed State */
            <div className="space-y-8">
              {/* Status */}
              <div className="bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 p-6 text-center">
                <p className="text-green-900 dark:text-green-50 font-semibold">
                  Your payment has been successfully processed and confirmed.
                </p>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Order Confirmation
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Quote ID
                    </p>
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-50 font-bold">
                      {status?.quoteId?.slice(0, 8)}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Amount Paid
                    </p>
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-50 font-bold">
                      ${(status?.totalCents / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Confirmation Time
                    </p>
                    <p className="text-sm text-slate-900 dark:text-slate-50">
                      {status?.acceptedAt
                        ? new Date(status.acceptedAt).toLocaleString()
                        : "Just now"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Status
                    </p>
                    <p className="text-sm font-bold">
                      <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs">
                        ✓ Accepted
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
                <h3 className="font-bold text-blue-900 dark:text-blue-50 mb-3">
                  What happens next?
                </h3>
                <ol className="space-y-2 text-sm text-blue-900 dark:text-blue-200">
                  <li>✓ Your quote has been locked and accepted</li>
                  <li>✓ Your workflow is queued for processing</li>
                  <li>
                    ✓ We'll send a confirmation email with next steps
                  </li>
                  <li>✓ Track your order status in your dashboard</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Print Confirmation
                </button>
              </div>

              {/* Email Confirmation */}
              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                <p>
                  A confirmation email has been sent to your registered email address.
                </p>
              </div>
            </div>
          ) : (
            /* Unconfirmed State (Polling Timeout) */
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
                <p className="text-yellow-900 dark:text-yellow-50">
                  <strong>⏳ Payment Pending:</strong> We're still verifying your
                  payment. This usually takes just a moment. If this page
                  doesn't refresh, please check your email for confirmation or
                  contact support.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={checkPaymentStatus}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  Check Status Again
                </button>
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="flex-1 px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Support Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Having issues?{" "}
            <a
              href="/support"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact support →
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
