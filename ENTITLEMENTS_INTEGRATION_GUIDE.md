# How to Integrate Pricing into a Workflow

Quick reference for adding pricing to CP2000 or any other workflow.

## The Problem

**Before:** Workflows calculated their own pricing
```typescript
// ❌ WRONG - Each workflow implements its own logic
const price = basePrice * (isFree ? 0 : 1) + mailingCost;
// Different discounts in different places = inconsistent pricing
```

**After:** One canonical function for all pricing
```typescript
// ✅ RIGHT - All pricing goes through canonical engine
const quote = await createPricingQuote({
  workflowId: "cp2000-response",
  baseWorkflowPriceCents: 1900,
  baseMailingPriceCents: 695,
});
```

## Basic Integration Pattern

### Step 1: Calculate Base Prices

Before calling pricing engine, workflow needs to calculate:
- `baseWorkflowPriceCents` — Cost of this workflow (from config or API)
- `baseMailingPriceCents` — Mailing provider cost (from Lob API or config)

```typescript
// In CP2000 response review component
const baseWorkflowPrice = 1900; // $19.00 for CP2000
const mailingMethod = "certified"; // or "registered", "first_class"

// Get mailing cost from Lob API
const lobQuote = await getLobMailingQuote({
  recipientState: address.state,
  mailingService: mailingMethod,
});
const baseMailingPrice = lobQuote.price_cents; // e.g., 695 cents
```

### Step 2: Call Server Function

```typescript
import { createPricingQuote } from "@/lib/pricing.functions";

const quote = await createPricingQuote.fetch({
  workflowId: "cp2000-response",
  workflowName: "CP2000 Response",
  mailingMethod: mailingMethod,
  baseWorkflowPriceCents: baseWorkflowPrice,
  baseMailingPriceCents: baseMailingPrice,
});

// quote now contains:
// {
//   quoteId: "uuid",
//   total: 2744,
//   workflowPrice: 1900,
//   mailingPrice: 745,
//   serviceFee: 99,
//   lineItems: [...],
//   pricingPolicySlug: "default-public" | "founders-account" | ...,
//   expiresAt: Date,
// }
```

### Step 3: Display Quote to User

```typescript
<div className="pricing-summary">
  <h3>Order Summary</h3>
  
  <div className="line-items">
    {quote.lineItems.map((item) => (
      <div key={item.label} className="line-item">
        <span>{item.label}</span>
        <span>${(item.amount / 100).toFixed(2)}</span>
      </div>
    ))}
  </div>

  <div className="total">
    <strong>Total</strong>
    <strong>${(quote.total / 100).toFixed(2)}</strong>
  </div>

  {/* Show visible value to user */}
  {quote.pricingPolicySlug !== "default-public" && (
    <div className="discount-badge">
      ✓ Special pricing applied: {quote.pricingPolicySlug}
    </div>
  )}

  <button onClick={() => proceedToPayment(quote.quoteId)}>
    Proceed to Payment
  </button>
</div>
```

### Step 4: Proceed to Payment

```typescript
const proceedToPayment = async (quoteId: string) => {
  // Verify quote is still valid
  const { quote: verified } = await verifyPricingQuote.fetch({
    quoteId,
    expectedTotalCents: quote.total,
  });

  if (!verified) {
    alert("Quote expired. Please review pricing again.");
    return;
  }

  // Create Stripe checkout with quote data
  const session = await fetch("/api/checkout", {
    method: "POST",
    body: JSON.stringify({
      quoteId,
      totalCents: verified.total,
      // ... other checkout data
    }),
  }).then((r) => r.json());

  // Redirect to Stripe
  window.location.href = session.url;
};
```

### Step 5: After Payment Success

```typescript
// In webhook handler after Stripe charge succeeds
const acceptPayment = async (quoteId: string, orderId: string) => {
  // Lock quote to order in database
  await acceptPricingQuote.fetch({
    quoteId,
    orderId,
  });

  // Now create the order, submit to mailing provider, etc.
  // Quote is immutably stored and auditable
};
```

## Real Example: CP2000 Response Workflow

### Current Code (Before)
```typescript
// apps/verticals/notice-respond/src/routes/workflows/cp2000-response.tsx
// (Hypothetical - simplified)

async function submitCP2000Response() {
  const price = 1900; // Hardcoded
  if (isFreeFocus) price = 0;
  
  // Create order with this price
  const order = await createOrder({ price });
  await stripeCheckout(order);
}
```

### New Code (After)
```typescript
import { createPricingQuote, acceptPricingQuote } from "@/lib/pricing.functions";

async function submitCP2000Response() {
  // 1. Calculate base prices
  const baseWorkflowPrice = 1900; // Still from config
  const baseMailingPrice = 695; // From Lob API

  // 2. Get pricing quote from server
  const quote = await createPricingQuote.fetch({
    workflowId: "cp2000-response",
    workflowName: "CP2000 Response",
    mailingMethod: "certified",
    baseWorkflowPriceCents: baseWorkflowPrice,
    baseMailingPriceCents: baseMailingPrice,
  });

  // 3. Show to user (or skip if auto-approve)
  setQuote(quote);
  showPricingModal(quote);
}

async function onUserApprovePrice(quote) {
  // 4. Verify still valid
  const verified = await verifyPricingQuote.fetch({
    quoteId: quote.quoteId,
    expectedTotalCents: quote.total,
  });

  // 5. Proceed to payment with quote
  const checkout = await fetch("/api/checkout", {
    method: "POST",
    body: JSON.stringify({
      quoteId: verified.quote.quoteId,
      totalCents: verified.quote.total,
      workflowId: "cp2000-response",
    }),
  }).then((r) => r.json());

  window.location.href = checkout.url;
}

// In Stripe webhook handler
async function handleStripePaymentSuccess(event) {
  const { quoteId, orderId } = event.data.object.metadata;

  // Lock quote to this order
  await acceptPricingQuote.fetch({
    quoteId,
    orderId,
  });

  // Continue with fulfillment
  await submitMailingOrder(orderId);
}
```

## Common Questions

### Q: What if user's entitlements change between viewing quote and checkout?

**A:** Quote expires in 1 hour and stores immutable snapshot. If they take longer, they need to request a new quote (pricing may have changed).

### Q: How do I show "founder gets this free"?

**A:** The pricing engine sets `workflowPrice: 0`. Just display it:
```typescript
if (quote.workflowPrice === 0) {
  <p className="free-badge">✓ Included with your account</p>
}
```

### Q: What if a user has a coupon code?

**A:** Coupons aren't in Phase 1. Add them in Phase 2 by:
1. Create `coupon_codes` table
2. Validate coupon in `createPricingQuote` server function
3. Modify entitlement lookup to apply coupon discount
4. Quote stores which coupon was used

### Q: Can I show "normally $X, you pay $Y"?

**A:** Yes! The pricing engine calculates what "normal" would be. Store it:

```typescript
const quote = await createPricingQuote(...);

// Compare to default pricing
const defaultPolicy = await fetch("/api/pricing/default").then(r => r.json());
const savings = defaultPolicy.total - quote.total;

return (
  <div>
    <strike>${(defaultPolicy.total / 100).toFixed(2)}</strike>
    <strong>${(quote.total / 100).toFixed(2)}</strong>
    {savings > 0 && <span className="save">Save ${(savings/100).toFixed(2)}</span>}
  </div>
);
```

### Q: How do I test this locally?

**A:** See `ENTITLEMENTS_PHASE1_CHECKLIST.md` for full test instructions.

### Q: What about orgs (law firms)?

**A:** Org pricing works automatically:
```typescript
// If user is part of org and org has entitlements
const quote = await createPricingQuote.fetch({
  workflowId: "...",
  // No organizationId passed (server resolves it from auth context)
  baseWorkflowPriceCents: 1900,
  baseMailingPriceCents: 695,
});

// Server function looks up:
// 1. User entitlements (if any)
// 2. User's organization entitlements (if not found)
// 3. Default public pricing (if neither found)
```

## Testing Pricing Locally

### Using Dev Supabase
```bash
supabase start
# Migrations run automatically
# Seed data loaded

# Set env vars
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="..." # from supabase status
```

### Run Tests
```bash
npm run test -- tests/entitlements-phase1.test.ts
```

### Manual Test in Browser Console
```javascript
// In any authenticated page
const quote = await fetch("/api/pricing", {
  method: "POST",
  body: JSON.stringify({
    workflowId: "test",
    baseWorkflowPriceCents: 1900,
    baseMailingPriceCents: 695,
  }),
}).then(r => r.json());

console.log(quote);
// Should show pricing breakdown
```

## Checklist Before Deploying Workflow

- [ ] Workflow calls `createPricingQuote()` before payment
- [ ] Quote is displayed to user (or stored for audit)
- [ ] Quote is verified with `verifyPricingQuote()` before payment
- [ ] Quote ID passed to Stripe checkout
- [ ] Quote accepted with `acceptPricingQuote()` after payment success
- [ ] Order links back to quote_id in database
- [ ] No hardcoded pricing left in workflow code
- [ ] Tests pass
- [ ] Audit log entries verified (check entitlements_audit_log table)

## Files to Know

| File | Purpose |
|------|---------|
| `packages/pricing/src/canonical-pricing-engine.ts` | Core calculation logic |
| `apps/mailmypdf/src/lib/pricing.functions.ts` | Server functions (workflows call this) |
| `apps/mailmypdf/src/lib/supabase-admin.server.ts` | Admin database client |
| `apps/mailmypdf/tests/entitlements-phase1.test.ts` | Tests to verify everything works |
| `ENTITLEMENTS_PHASE1_CHECKLIST.md` | Deployment checklist |

## Next Phase (Phase 2)

Once Phase 1 is live:
1. Add dashboard showing "Your pricing: Founder Account"
2. Build admin UI for assigning entitlements
3. Implement quota tracking (free workflows/month)
4. Add feature access flags (private office, premium workflows)
5. Create payment retry logic

---

**Need help?** See `ENTITLEMENTS_PHASE1_CHECKLIST.md` for troubleshooting.
