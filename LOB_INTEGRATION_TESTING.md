# Lob Integration Testing Guide

**Status:** Testing Framework  
**Date:** 2026-09-02  
**Scope:** Lob API integration, webhooks, retry logic, idempotency

---

## Overview

The MailMyPDF Lob integration handles physical mail delivery via the Lob API. Testing ensures:

1. **Letters Create Successfully** - PDFs are converted to mail
2. **Address Validation** - Valid US addresses before submission
3. **Webhook Processing** - Track delivery status updates
4. **Retry Logic** - Exponential backoff on transient failures
5. **Idempotency** - Safe to retry without duplicates
6. **Error Handling** - Graceful degradation on API errors

---

## Test Architecture

### Files Involved

```
Core Lob Integration:
├── src/lib/lob.server.ts                    (Main Lob API client)
├── src/lib/proof-of-service/lob-bridge.ts   (Quote calculation)
├── src/lib/proof-of-service/lob-webhook-bridge.ts (Webhook handling)
├── src/providers/adapters/lob-adapter.ts    (MailProvider interface)
└── src/routes/api/public/lob-webhook.ts     (Webhook endpoint)

Testing:
├── tests/lob-hardening.test.mjs             (Retry logic tests)
└── tests/lob-integration.test.mjs            (Planned: E2E tests)
```

### Test Environment Setup

```bash
# 1. Set Lob API key (test key)
export LOB_API_KEY="test_abc123..."

# 2. Enable Lob in feature flags
export ENABLE_LOB=true
export AUTO_SUBMIT_ENABLED=false  # Manual submission for testing

# 3. Start dev server
npm run dev

# 4. Run tests
npm test tests/lob-hardening.test.mjs
npm test tests/lob-integration.test.mjs
```

---

## Test Scenarios

### 1. Happy Path: Letter Creation

**Test:** Create a valid letter and verify Lob accepts it

```typescript
describe("Lob Letter Creation", () => {
  it("creates a certified letter with valid addresses", async () => {
    const order = {
      orderId: "order-123",
      pdfUrl: "https://...",  // Publicly accessible signed URL
      to: {
        name: "John Doe",
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postal: "94102",
      },
      from: {
        name: "MailMyPDF",
        line1: "456 Park Ave",
        city: "San Francisco",
        state: "CA",
        postal: "94107",
      },
      extraService: "certified",
    };

    const letter = await createLobLetter(order);
    
    assert(letter.id);                        // Lob assigned ID
    assert.equal(letter.status, "processing"); // Initial status
    assert(letter.expected_delivery_date);    // ETA provided
    assert(letter.tracking_number);           // Tracking available
  });
});
```

**Verification:**
- [ ] Letter created with valid ID
- [ ] Status is "processing"
- [ ] Expected delivery date returned
- [ ] Tracking number assigned
- [ ] Order event logged

### 2. Address Validation

**Test:** Reject invalid addresses before submission

```typescript
describe("Address Validation", () => {
  it("rejects invalid street address", async () => {
    const result = await validateUsAddress({
      line1: "999 Fake St",  // Doesn't exist
      city: "Fakeville",
      state: "XX",
      postal: "00000",
    });

    assert(!result.valid);
    assert(result.error);  // Why it failed
  });

  it("accepts valid address with suggestions", async () => {
    const result = await validateUsAddress({
      line1: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postal: "94102",
    });

    assert(result.valid);
    assert.equal(result.corrected.postal, "94102"); // ZIP corrected if needed
  });

  it("corrects common typos", async () => {
    const result = await validateUsAddress({
      line1: "123 Main St",
      city: "SF",  // Abbreviation
      state: "California",  // Full name
      postal: "94102",
    });

    assert(result.valid);
    assert.equal(result.corrected.state, "CA");      // Standardized
    assert.equal(result.corrected.city, "San Francisco"); // Expanded
  });
});
```

**Verification:**
- [ ] Invalid addresses rejected
- [ ] Error message explains why
- [ ] Valid addresses accepted
- [ ] Common typos corrected
- [ ] ZIP+4 format used when available

### 3. Retry Logic

**Test:** Exponential backoff on transient failures

```typescript
describe("Retry Logic", () => {
  it("retries on 429 rate limit", async () => {
    let attempts = 0;
    
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error("Rate limited");
        error.status = 429;
        throw error;
      }
      return "success";
    }, { maxAttempts: 5, baseDelayMs: 100 });

    assert.equal(result, "success");
    assert.equal(attempts, 3);  // Retried twice, succeeded on third
  });

  it("backs off exponentially: 1s, 2s, 4s, 8s...", () => {
    const delays = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      const delay = 100 * Math.pow(2, attempt - 1);  // baseDelayMs * 2^(attempt-1)
      delays.push(Math.min(delay, 15000));  // Capped at maxDelayMs
    }

    assert.deepEqual(delays, [100, 200, 400, 800, 1600]);
  });

  it("stops retrying on non-retryable error (4xx)", async () => {
    let attempts = 0;
    
    try {
      await withRetry(async () => {
        attempts++;
        const error = new Error("Invalid address");
        error.status = 422;  // Validation error, not retryable
        throw error;
      }, { maxAttempts: 5 });
    } catch (e) {
      // Expected to fail
    }

    assert.equal(attempts, 1);  // No retries
  });
});
```

**Verification:**
- [ ] Exponential backoff calculated correctly
- [ ] Retries on 429, 503, 504
- [ ] No retry on 400, 401, 402, 404, 422
- [ ] Max delay capped at 15s
- [ ] Gives up after maxAttempts

### 4. Webhook Processing

**Test:** Handle Lob delivery status updates

```typescript
describe("Lob Webhook Processing", () => {
  it("processes delivered event and updates order", async () => {
    const webhookPayload = {
      event: "letter.delivered",
      body: {
        id: "ltr_123abc",
        status: "delivered",
        expected_delivery_date: "2026-09-05",
        date_delivered: "2026-09-04",
        tracking_number: "1Z999AA10123456784",
      },
    };

    const result = await processLobWebhook(webhookPayload);
    
    assert.equal(result.status, "delivered");
    assert.equal(result.mailedAt, "2026-09-04");
    assert.equal(result.trackingNumber, "1Z999AA10123456784");
    
    // Verify order event logged
    const event = await getOrderEvent(result.orderId, "mailed");
    assert(event);
  });

  it("processes failed event and logs error", async () => {
    const webhookPayload = {
      event: "letter.failed",
      body: {
        id: "ltr_456def",
        status: "failed",
        error_message: "Address not found",
      },
    };

    const result = await processLobWebhook(webhookPayload);
    
    assert.equal(result.status, "failed");
    assert(result.errorMessage.includes("Address"));
  });

  it("handles duplicate webhooks (idempotent)", async () => {
    const webhook = {
      event: "letter.delivered",
      body: {
        id: "ltr_789ghi",
        status: "delivered",
        date_delivered: "2026-09-04",
      },
    };

    const result1 = await processLobWebhook(webhook);
    const result2 = await processLobWebhook(webhook);  // Same webhook again
    
    assert.equal(result1.orderId, result2.orderId);
    assert.equal(result1.deliveredAt, result2.deliveredAt);
    
    // Only one event should be logged
    const events = await getOrderEvents(result1.orderId, "mailed");
    assert.equal(events.length, 1);  // Not duplicated
  });

  it("validates webhook signature", async () => {
    const webhook = {
      event: "letter.delivered",
      body: { id: "ltr_xyz" },
    };
    
    const signature = "invalid_signature";

    try {
      await processLobWebhook(webhook, { signature });
      assert.fail("Should have thrown");
    } catch (e) {
      assert(e.message.includes("signature"));
    }
  });
});
```

**Verification:**
- [ ] Delivered event updates order status
- [ ] Failed event logs error
- [ ] Webhook signature verified
- [ ] Duplicate webhooks handled safely
- [ ] Order event created for audit trail

### 5. Idempotency

**Test:** Safe to retry requests without duplicates

```typescript
describe("Idempotency", () => {
  it("uses idempotency key to prevent duplicate letters", async () => {
    const key = "order-123-v1";
    
    const letter1 = await createLobLetter({
      orderId: "order-123",
      pdfUrl: "https://...",
      to: {...},
      from: {...},
      idempotencyKey: key,
    });

    // Same request with same key
    const letter2 = await createLobLetter({
      orderId: "order-123",
      pdfUrl: "https://...",
      to: {...},
      from: {...},
      idempotencyKey: key,
    });

    assert.equal(letter1.id, letter2.id);  // Same letter ID
    // Not two letters
  });

  it("creates different letters with different keys", async () => {
    const letter1 = await createLobLetter({
      idempotencyKey: "order-123-v1",
      ...
    });

    const letter2 = await createLobLetter({
      idempotencyKey: "order-123-v2",  // Different version
      ...
    });

    assert.notEqual(letter1.id, letter2.id);  // Different letters
  });
});
```

**Verification:**
- [ ] Same idempotency key returns same letter
- [ ] Different key creates new letter
- [ ] Database stores idempotency key
- [ ] Key format: `{orderId}-v{versionNumber}`

### 6. Error Cases

**Test:** Graceful handling of various errors

```typescript
describe("Error Handling", () => {
  it("handles network timeout gracefully", async () => {
    // Mock fetch timeout
    const order = {...};
    
    try {
      await withRetry(
        () => createLobLetter(order),
        { timeoutMs: 100 }  // Very short timeout
      );
      assert.fail("Should have timed out");
    } catch (e) {
      assert(e.message.includes("timeout") || e.name === "AbortError");
    }
  });

  it("handles invalid PDF URL", async () => {
    try {
      await createLobLetter({
        pdfUrl: "https://example.com/missing.pdf",
        ...
      });
      assert.fail("Should have failed");
    } catch (e) {
      assert(e.message.includes("404") || e.message.includes("PDF"));
    }
  });

  it("handles authentication failure", async () => {
    // Invalid API key
    process.env.LOB_API_KEY = "invalid_key";
    
    try {
      await createLobLetter({...});
      assert.fail("Should have failed");
    } catch (e) {
      assert.equal(e.status, 401);
    }
  });

  it("handles rate limiting with backoff", async () => {
    let attempts = 0;
    
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error("Too many requests");
        error.status = 429;
        throw error;
      }
      return { id: "ltr_success" };
    }, { maxAttempts: 5, baseDelayMs: 50 });

    assert.equal(result.id, "ltr_success");
    assert.equal(attempts, 3);  // Retried successfully
  });
});
```

**Verification:**
- [ ] Timeout error handled
- [ ] Invalid PDF URL rejected
- [ ] Authentication failure caught
- [ ] Rate limiting triggers backoff
- [ ] Proper error messages returned

---

## Manual Testing Checklist

### 1. Create a Test Order

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "appeal-reply",
    "recipientName": "Test Recipient",
    "recipientLine1": "123 Main St",
    "recipientCity": "San Francisco",
    "recipientState": "CA",
    "recipientPostal": "94102",
    "senderName": "Test Sender",
    "senderLine1": "456 Park Ave",
    "senderCity": "San Francisco",
    "senderState": "CA",
    "senderPostal": "94107",
    "priceCents": 2995
  }'
```

**Expected:**
- [ ] Order created with status "draft"
- [ ] Order ID returned
- [ ] Document generated (PDF)

### 2. Submit to Lob

```bash
curl -X POST http://localhost:8080/api/orders/{orderId}/submit-to-lob \
  -H "Authorization: Bearer {token}"
```

**Expected:**
- [ ] Order status changes to "submitted_to_provider"
- [ ] Lob letter ID stored in order metadata
- [ ] Order event logged: "submitted_to_lob"

### 3. Check Lob Dashboard

Visit https://dashboard.lob.com/letters

**Expected:**
- [ ] Your test letter appears in the list
- [ ] Status shows "Processing" or "In Transit"
- [ ] PDF preview available
- [ ] Tracking number assigned

### 4. Simulate Webhook

```bash
curl -X POST http://localhost:8080/api/public/lob-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "letter.delivered",
    "body": {
      "id": "ltr_{letterIdFromLob}",
      "status": "delivered",
      "expected_delivery_date": "2026-09-05",
      "date_delivered": "2026-09-04",
      "tracking_number": "1Z999AA10123456784"
    }
  }'
```

**Expected:**
- [ ] Webhook accepted (200 OK)
- [ ] Order status changes to "delivered"
- [ ] Tracking number stored
- [ ] Delivery date recorded
- [ ] Order event logged

### 5. Verify Order History

```bash
curl http://localhost:8080/api/orders/{orderId} \
  -H "Authorization: Bearer {token}"
```

**Expected:**
- [ ] Order status is "delivered"
- [ ] Mailed date is set
- [ ] Tracking number present
- [ ] Order events show full timeline:
  - `created` → `submitted_to_lob` → `mailed` → `delivered`

---

## Automated Testing

### Run Test Suite

```bash
# Retry logic tests
npm test tests/lob-hardening.test.mjs

# E2E tests (with Lob test key)
LOB_API_KEY=test_abc123... npm test tests/lob-integration.test.mjs

# Coverage
npm test -- --coverage tests/lob*
```

### Expected Coverage

```
File                           | Statements | Branches | Functions | Lines
--------------------------------|-----------|----------|-----------|--------
src/lib/lob.server.ts          | 95%       | 90%      | 95%       | 95%
src/providers/adapters/lob-adapter.ts | 90% | 85% | 90% | 90%
src/lib/proof-of-service/lob-bridge.ts | 85% | 80% | 85% | 85%
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Lob Integration Tests
on: [push, pull_request]

jobs:
  lob-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      
      - name: Run hardening tests
        run: npm test tests/lob-hardening.test.mjs
      
      - name: Run integration tests
        env:
          LOB_API_KEY: ${{ secrets.LOB_TEST_KEY }}
        run: npm test tests/lob-integration.test.mjs
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lob*.json
```

---

## Production Deployment

### Pre-Launch Checklist

- [ ] All tests passing
- [ ] Address validation working
- [ ] Webhook signature verification enabled
- [ ] Idempotency keys in database
- [ ] Error logging configured
- [ ] Monitoring/alerting set up
- [ ] Runbook for common issues
- [ ] Load testing completed (10+ letters/sec)

### Monitoring

**Key Metrics:**
- Letter creation success rate (target: >99%)
- Average delivery time (target: 3-5 business days)
- Webhook delivery success (target: 100%)
- API error rate (target: <1%)

**Alerts:**
- Letter creation failing >5% in last hour
- Webhook not received for 30 minutes
- API latency >30 seconds
- Rate limiting (429) errors increasing

### Rollback Plan

If Lob integration breaks:
1. Set `LOB_ENABLED=false` in feature flags
2. Queue all new orders as "manual_fulfillment"
3. Notify admins to handle manually
4. Investigate and fix
5. Gradually re-enable with `AUTO_SUBMIT=false` (manual)
6. Monitor for 24 hours before enabling auto-submit

---

## Success Criteria

Phase is complete when:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing checklist completed
- [ ] Retry logic verified
- [ ] Webhook processing verified
- [ ] Address validation verified
- [ ] Error cases handled
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Team familiar with operation

---

## References

- [Lob API Docs](https://docs.lob.com/)
- [Lob Letters API](https://docs.lob.com/api#letters)
- [Lob Webhooks](https://docs.lob.com/webhooks)
- [Phase 1-3: Entitlements System](ENTITLEMENTS_COMPLETE_SUMMARY.md)
