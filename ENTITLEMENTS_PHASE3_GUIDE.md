# MailMyPDF Entitlements Phase 3: Stripe Checkout Integration

**Status:** Implementation Started  
**Date:** 2026-09-02  
**Scope:** Payment processing, quote acceptance, refund handling

---

## Overview

Phase 3 integrates the canonical pricing engine with Stripe to enable end-to-end payment processing:

```
User Workflow → Pricing Quote → Stripe Checkout → Quote Acceptance → Order Fulfillment
```

**Key Innovation:** Quotes are immutable and auditable. Every payment is traced back to the exact policy and pricing in effect at quote time.

---

## Architecture

### Data Flow

```
1. USER REQUESTS WORKFLOW
   ↓
   Pricing Engine generates quote (policy_id, profile_id, assignment_id stored)
   ↓
2. USER NAVIGATES TO CHECKOUT
   ↓
   /checkout/:quoteId loads quote details
   Stripe checkout form renders
   ↓
3. USER ENTERS PAYMENT DETAILS
   ↓
   Form submits to Stripe
   ↓
4. STRIPE PROCESSES PAYMENT
   ↓
   Sends payment_intent.succeeded webhook
   ↓
5. WEBHOOK ACCEPTS QUOTE
   ↓
   Quote locked to order (accepted_at set)
   Order created in database
   Fulfillment initiated
   ↓
6. USER SEES CONFIRMATION
   ↓
   Redirect to /checkout/success
   Shows order details and tracking
```

### Database Changes

**New quote fields:**
```sql
stripe_payment_intent_id TEXT     -- Links quote to Stripe
accepted_at TIMESTAMP             -- When quote was locked to order
```

**Order updates:**
```sql
metadata.stripe_payment_intent_id  -- Payment link for refunds
metadata.quote_id                  -- Audit trail reference
metadata.policy_id                 -- Which policy was active
metadata.assignment_id             -- Which assignment applied
```

**Audit log entries:**
```
action: "payment_accepted"         -- Quote accepted after payment
action: "refund_processed"         -- Quote reversed on refund
action: "chargeback_initiated"     -- Dispute received
```

---

## Files Created

### 1. Checkout Route
**File:** `apps/mailmypdf/src/routes/checkout/index.tsx` (170 lines)

**Components:**
- `CheckoutPage` - Route wrapper with URL param parsing
- `CheckoutContent` - Main checkout UI
- `PaymentForm` - Stripe card element + submit button

**Features:**
- Quote validation (expiration check, amount verification)
- Stripe card element for payment entry
- Error handling and loading states
- Amount display and policy info
- Security notice + terms

**Integration Points:**
```typescript
getPricingQuote.fetch()    → Load quote for display
getCheckoutSession.fetch() → Create Stripe session
stripe.confirmCardPayment()→ Process payment with Stripe
```

### 2. Checkout Success Page
**File:** `apps/mailmypdf/src/routes/checkout/success.tsx` (150 lines)

**Components:**
- `CheckoutSuccessPage` - Main success page
- `StatusStep` - Timeline of order processing steps

**Features:**
- Order confirmation display
- Order number + amount
- Status timeline (Payment → Processing → Mailed → Delivered)
- Next steps instructions
- Action links (Dashboard, New Mailing)

**Integration Points:**
```typescript
getOrderAfterPayment.fetch() → Load order confirmation
```

### 3. Checkout Server Functions
**File:** `apps/mailmypdf/src/lib/checkout.functions.ts` (140 lines)

**Functions:**

#### getPricingQuote
- Input: `{ quoteId }`
- Validates quote still valid (not expired, not already accepted)
- Returns quote details for checkout display
- Returns expiresAt timestamp

#### getCheckoutSession
- Input: `{ quoteId, totalCents }`
- Validates quote amount matches expected
- Creates Stripe checkout session
- Stores quote ID in session metadata
- Returns sessionId + clientSecret

#### verifyPaymentAndAcceptQuote
- Input: `{ quoteId, paymentIntentId }`
- Called after Stripe payment succeeds
- Locks quote to order (sets accepted_at)
- Creates order record
- Logs to audit trail
- Returns orderId

#### getOrderAfterPayment
- Input: `{ orderId }`
- Fetches order confirmation details
- Enforces user ownership (email match)
- Returns order + status + timeline info

#### cancelOrderAndReverseQuote
- Input: `{ orderId, reason }`
- Validates order is paid
- Processes Stripe refund
- Reverses quote acceptance
- Updates order status to refunded

### 4. Stripe Webhook Handler
**File:** `apps/mailmypdf/src/routes/api/webhooks/stripe.ts` (250 lines)

**Endpoint:** `POST /api/webhooks/stripe`

**Events Handled:**

#### payment_intent.succeeded
- Triggered when Stripe payment completes
- Accepts quote + creates order
- Idempotent (handles retries)
- Initiates fulfillment

#### charge.refunded
- Triggered when customer refunds payment
- Reverses quote acceptance
- Updates order status to "refunded"
- Logs to audit trail

#### charge.dispute.created
- Triggered when chargeback initiated
- Marks order as "disputed"
- Logs dispute details
- Requires manual review

**Security:**
- Verifies Stripe webhook signature
- Returns 200 immediately (async processing)
- Never fails on auth (could be retry)
- Logs all errors for manual review

### 5. Stripe Server Configuration
**File:** `apps/mailmypdf/src/lib/stripe.server.ts` (existing, extended)

**Helper Functions:**

#### validateQuoteForCheckout
- Checks quote exists and valid
- Checks not expired (30 minutes)
- Checks not already accepted
- Checks amount matches

#### createCheckoutSession
- Creates Stripe Checkout session
- Stores quote ID in metadata
- Sets success/cancel URLs
- Enables automatic tax (if configured)

#### acceptQuoteAfterPayment
- Locks quote to order
- Stores Stripe payment ID
- Creates order record
- Logs to audit trail

#### handleRefund
- Finds quote by Stripe payment ID
- Reverses quote acceptance
- Updates order status
- Logs refund

#### verifyStripeWebhookSignature
- Validates webhook authenticity
- Constructs Stripe event
- Throws on signature mismatch

#### getStripePublishableKey
- Returns public key for Stripe.js
- Safe to expose to client

---

## Configuration Required

### Environment Variables

```bash
# Stripe API Keys (sandbox initially)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For production (later)
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...

# MailMyPDF URLs
MAILMYPDF_BASE_URL=http://localhost:8080  # or production URL
```

### Stripe Dashboard Setup

1. **Create Webhook Endpoint**
   - URL: `{BASE_URL}/api/webhooks/stripe`
   - Events: 
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `charge.dispute.created`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

2. **Enable Automatic Tax (Optional)**
   - Configure tax rates in Stripe Dashboard
   - If disabled, set `automatic_tax.enabled: false` in checkout

3. **Test Mode**
   - Use test keys initially
   - Test card: `4242 4242 4242 4242`, any future date, any CVC
   - Declined card: `4000 0000 0000 0002`

---

## Integration Checklist

### Before Launch

- [ ] Stripe keys configured in `.env.local`
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] Stripe React library installed (`npm install @stripe/react-stripe-js @stripe/js`)
- [ ] Database migrations applied (if any)
- [ ] Quote expiration time configured (30 minutes recommended)
- [ ] Error handling tested
- [ ] Refund flow tested end-to-end
- [ ] Security review passed

### Testing Checklist

- [ ] Quote loads on checkout page
- [ ] Stripe form renders correctly
- [ ] Test payment succeeds (webhook fires)
- [ ] Order created after payment
- [ ] Quote marked as accepted
- [ ] Order confirmation page displays
- [ ] Test refund from Stripe Dashboard
- [ ] Order status updates to refunded
- [ ] Quote reversal recorded in audit log
- [ ] Webhook retries handled (idempotent)

### Error Cases to Test

- [ ] Expired quote rejected
- [ ] Quote amount mismatch detected
- [ ] Already-accepted quote prevents re-payment
- [ ] Missing metadata handled gracefully
- [ ] Webhook signature verification works
- [ ] Invalid Stripe key detected early
- [ ] Network errors handled

---

## Webhook Security

### Signature Verification
Every webhook must be verified:
```typescript
const event = verifyStripeWebhookSignature(body, signature);
```

This ensures:
- Webhook came from Stripe (not attacker)
- Body wasn't modified in transit
- Timestamp is within acceptable window

### Idempotency
Stripe retries failed webhooks. Handle them safely:
```typescript
if (quote.accepted_at) {
  return { status: "already_accepted" };  // Safe to retry
}
```

### Error Handling
Always return 200 to Stripe (even on errors):
- Logging errors internally
- Investigate manually if needed
- Prevents Stripe retry storms

---

## Refund Flow

### Customer-Initiated Refund

```
1. Admin/API calls cancelOrderAndReverseQuote()
   ↓
2. System calls Stripe API to create refund
   ↓
3. Stripe processes refund
   ↓
4. Stripe sends charge.refunded webhook
   ↓
5. Webhook reverses quote acceptance
   ↓
6. Order status updated to "refunded"
   ↓
7. Audit logged with refund details
```

### Stripe-Initiated Refund

```
1. User initiates refund in Stripe Dashboard
   ↓
2. Stripe sends charge.refunded webhook
   ↓
3. Webhook finds quote by payment ID
   ↓
4. Quote acceptance reversed
   ↓
5. Order status updated
   ↓
6. Audit logged
```

Both flows result in identical state:
- Quote: `accepted_at = null`
- Order: `status = "refunded"`
- Audit: Action recorded

---

## Performance Considerations

### Query Optimization

1. **Quote Lookup by Payment ID** (webhook)
   ```sql
   SELECT * FROM pricing_quotes 
   WHERE stripe_payment_intent_id = $1
   ```
   - Need index on `stripe_payment_intent_id`
   - Single row result expected

2. **Order Creation** (post-payment)
   ```sql
   INSERT INTO orders (...) VALUES (...)
   ```
   - Fast: just one insert
   - No joins needed

### Webhook Processing
- Happens async (fire and forget)
- User gets Stripe redirect immediately
- Quote acceptance happens in background
- If webhook fails, order is retried on next attempt

---

## Audit Trail

Every payment event is logged:

```
quote {
  id: "uuid"
  policy_id: "uuid"          ← Which policy was active
  assignment_id: "uuid"      ← Which user assignment
  total_cents: 1999
  created_at: "2026-09-02T12:34:56Z"
  accepted_at: "2026-09-02T12:35:12Z"  ← Payment locked it
  stripe_payment_intent_id: "pi_..."    ← Stripe proof
}

audit_log {
  action: "payment_accepted"
  resource_type: "quote"
  resource_id: "quote-uuid"
  new_values: {
    order_id: "order-uuid"
    stripe_payment_intent_id: "pi_..."
  }
  created_at: "2026-09-02T12:35:12Z"
}
```

This provides complete audit trail:
- Who bought what (user email in order)
- At what price (total_cents + line_items)
- Under which policy (policy_id)
- When exactly (timestamps)
- Proof from Stripe (payment_intent_id)

---

## Error Messages

Users see these messages in checkout:

| Error | Reason | Action |
|-------|--------|--------|
| "Quote not found or expired" | Quote ID invalid or >30min old | Request new quote |
| "This quote has already been paid" | Quote already accepted | Use existing order |
| "Quote expired" | Checkout took >30 min | Request new quote |
| "Quote amount mismatch" | Client tampered with form | Retry checkout |
| "Stripe not loaded" | Network issue | Refresh page |
| "Payment failed" | Card declined, etc | Retry with different card |

---

## Success Criteria

Phase 3 is complete when:

- [ ] Quote → Checkout flow works end-to-end
- [ ] Stripe payment accepted successfully
- [ ] Quote locked to order after payment
- [ ] Order created in database
- [ ] Success page displays confirmation
- [ ] Refund flow works correctly
- [ ] Webhook handles retries safely
- [ ] Audit trail complete and accurate
- [ ] Error cases handled gracefully
- [ ] Security review passed
- [ ] All documentation updated

---

## Next Steps After Phase 3

### Phase 3b: Subscriptions (Future)
- Stripe billing cycles
- Monthly/annual plans
- Quota limits per plan
- Auto-renewal handling

### Phase 3c: Advanced Features
- Coupon/discount codes
- Multiple payment methods (PayPal, etc)
- Invoice generation
- Tax handling by region
- Bulk order processing

### Integration
- Connect fulfillment pipeline to orders
- Add order tracking
- Email notifications
- Auto-refund on failed delivery

---

## References

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Phase 1: Database Schema](ENTITLEMENTS_PHASE1_CHECKLIST.md)
- [Phase 2: Dashboard & Admin](ENTITLEMENTS_PHASE2_SUMMARY.md)
- [Pricing Engine](packages/pricing/src/canonical-pricing-engine.ts)

---

**Status: PHASE 3 INFRASTRUCTURE COMPLETE**

Next: Complete interactive testing and deploy to production.
