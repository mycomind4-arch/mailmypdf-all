# Security Hardening Implementation Guide

**Status:** ✅ **IMPLEMENTED**  
**Date:** 2026-09-02  
**Scope:** Complete security foundation for MailMyPDF platform

---

## 🎯 Overview

This guide covers the implementation of critical security hardening for MailMyPDF. All code has been created and is ready for integration into your application.

### What's Implemented

✅ **Input Validation** — Comprehensive validation library with SQL injection, XSS, and command injection detection  
✅ **Rate Limiting** — Token bucket algorithm with configurable limits per endpoint  
✅ **CORS Configuration** — Environment-aware CORS policy with strict origin whitelisting  
✅ **Error Handling** — Secure error responses with server-side logging  
✅ **Logging & Audit** — Structured logging with sensitive data redaction  
✅ **Database Security** — RLS verification and parameterized query enforcement  
✅ **Middleware** — Integrated security middleware for all endpoints  

---

## 📁 File Structure

```
apps/mailmypdf/src/lib/security/
├── index.ts                    # Central export point
├── input-validation.ts         # 400+ lines - Schema validation, injection detection
├── rate-limiting.ts            # 300+ lines - Token bucket rate limiter
├── cors-config.ts              # 250+ lines - CORS policy, security headers
├── error-handling.ts           # 350+ lines - Secure error responses
├── database-security.ts        # 250+ lines - RLS verification, query safety
└── middleware.ts               # 350+ lines - Unified middleware chain

apps/mailmypdf/src/lib/logging/
└── logger.ts                   # 350+ lines - Structured logging, audit trail

Root:
└── SECURITY_HARDENING_ROADMAP.md  # Complete prioritized hardening plan
```

---

## 🚀 Implementation Steps

### Step 1: Import Security Module

Add security imports to your main app file:

```typescript
// apps/mailmypdf/src/entry-server.tsx
import { printSecurityChecklist } from '@/lib/security';

// Print checklist on startup
if (process.env.NODE_ENV === 'development') {
  printSecurityChecklist();
}
```

### Step 2: Apply Middleware to Route Handlers

#### Example: Workflow Hub Search

```typescript
// apps/mailmypdf/src/routes/workflows/index.tsx
import { withSearchMiddleware, validateInput, WorkflowSchemas } from '@/lib/security';

export const searchWorkflows = withSearchMiddleware(
  async (context) => {
    // Input validation
    const query = validateInput(
      userInput,
      WorkflowSchemas.searchQuery
    );

    if (!query.success) {
      throw new ValidationError(query.error);
    }

    // Handler logic
    const results = await getWorkflowsMatchingQuery(query.data);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
);
```

#### Example: Authentication Endpoint

```typescript
// apps/mailmypdf/src/routes/auth/login.tsx
import { withAuthMiddleware, logAuthAttempt, logger } from '@/lib/security';

export const login = withAuthMiddleware(
  async (context) => {
    const { email, password } = await request.json();

    try {
      // Validate input
      const validated = validateInput(email, CommonSchemas.email);
      if (!validated.success) {
        logAuthAttempt(context.ip, email, false, context.userAgent);
        throw new ValidationError('Invalid email format');
      }

      // Authenticate
      const user = await authenticateUser(email, password);

      logAuthAttempt(context.ip, email, true, context.userAgent);
      logger.info('User logged in', { userId: user.id, email });

      return new Response(JSON.stringify({ token: user.token }));
    } catch (error) {
      logAuthAttempt(context.ip, email, false, context.userAgent);
      throw error;
    }
  }
);
```

### Step 3: Integrate Logging Throughout

```typescript
// In any server function
import { logger, logAuditEvent } from '@/lib/security';

export const createWorkflow = async (userId: string, workflow: Workflow) => {
  try {
    const result = await db.workflows.insert(workflow);

    // Log audit event
    await logAuditEvent(
      userId,
      'workflow_created',
      'workflow',
      result.id,
      { name: workflow.name, type: workflow.type },
      'success'
    );

    logger.info('Workflow created', {
      workflowId: result.id,
      userId,
      name: workflow.name,
    });

    return result;
  } catch (error) {
    logger.error('Failed to create workflow', {
      userId,
      error: error.message,
    });
    throw error;
  }
};
```

### Step 4: Database Security

```typescript
// Verify RLS on startup
import { TABLES_REQUIRING_RLS } from '@/lib/security';

// Add this check to your deployment:
// SELECT tablename FROM pg_tables 
// WHERE schemaname = 'public' 
// AND tablename IN (?, ?, ?)  -- TABLES_REQUIRING_RLS
// AND rowsecurity = true;

// Create recommended indexes
// Run: apps/mailmypdf/src/lib/security/database-security.ts
// Copy INDEX_RECOMMENDATIONS and execute in your database
```

### Step 5: Environment Configuration

```bash
# .env.local (development)
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# .env.production
NODE_ENV=production
ALLOWED_ORIGINS=https://mailmypdf.com,https://app.mailmypdf.com
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
```

---

## 🔒 Security Features

### Input Validation

**Location:** `apps/mailmypdf/src/lib/security/input-validation.ts`

Detects and prevents:
- ✅ SQL injection
- ✅ XSS attacks
- ✅ Command injection
- ✅ Path traversal
- ✅ Invalid data types

**Usage:**
```typescript
import { validateInput, CommonSchemas } from '@/lib/security';

const result = validateInput(userEmail, CommonSchemas.email);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

### Rate Limiting

**Location:** `apps/mailmypdf/src/lib/security/rate-limiting.ts`

Configured limits:
- AUTH endpoints: 5 requests/15 minutes (prevents brute force)
- API endpoints: 100 requests/minute
- Search: 30 requests/minute (prevents scraping)
- Upload: 10 uploads/5 minutes
- Payment: 5 requests/minute
- Webhook: 100 requests/10 seconds

**Usage:**
```typescript
import { withSearchMiddleware } from '@/lib/security';

export const search = withSearchMiddleware(handler);
```

### CORS Configuration

**Location:** `apps/mailmypdf/src/lib/security/cors-config.ts`

Auto-configured per environment:
- Development: localhost variations
- Staging: staging.mailmypdf.com
- Production: mailmypdf.com, app.mailmypdf.com

**Security Headers Applied:**
- X-Frame-Options: SAMEORIGIN (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- Strict-Transport-Security: HTTPS enforcement
- Content-Security-Policy: Resource restriction
- Referrer-Policy: Information leakage prevention

### Error Handling

**Location:** `apps/mailmypdf/src/lib/security/error-handling.ts`

Prevents information disclosure:
- ✅ Generic error messages to clients
- ✅ Full details logged server-side
- ✅ No stack traces in responses
- ✅ Unique request IDs for support

**Error Types:**
- ValidationError (400)
- AuthenticationError (401)
- AuthorizationError (403)
- NotFoundError (404)
- ConflictError (409)
- RateLimitError (429)
- InternalServerError (500)
- DatabaseError (500)
- ExternalServiceError (503)

### Logging & Audit

**Location:** `apps/mailmypdf/src/lib/logging/logger.ts`

Features:
- ✅ Structured JSON logging
- ✅ Sensitive data redaction
- ✅ Audit trail creation
- ✅ Security event tracking
- ✅ Request/response logging
- ✅ Performance monitoring

**Redacted Fields:**
- Passwords
- Tokens
- API keys
- SSN
- Credit card numbers
- Any field with "secret", "password", "token", "key", "credential"

---

## 📋 Integration Checklist

Before deploying, ensure:

### Code Integration
- [ ] Import security module in entry point
- [ ] Wrap all public endpoints with middleware
- [ ] Add input validation to all handlers
- [ ] Replace generic errors with security error types
- [ ] Add logger calls to critical operations
- [ ] Enable audit logging

### Database
- [ ] Verify RLS enabled on all sensitive tables
- [ ] Create recommended indexes
- [ ] Test parameterized queries
- [ ] Verify user isolation

### Deployment
- [ ] Set environment variables correctly
- [ ] Configure allowed origins per environment
- [ ] Enable HTTPS/TLS
- [ ] Set up error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Test rate limiting in staging

### Operations
- [ ] Set up monitoring/alerts
- [ ] Document security procedures
- [ ] Train team on new error handling
- [ ] Schedule security audits
- [ ] Plan penetration testing

---

## 🧪 Testing Security Features

### Test Rate Limiting

```bash
# Make rapid requests to trigger rate limit
for i in {1..10}; do
  curl -s http://localhost:3000/api/search?q=test | jq .
done

# After limit exceeded, should get 429 response
```

### Test Input Validation

```typescript
// Should be rejected
const malicious = "'; DROP TABLE users; --";
const result = validateInput(malicious, CommonSchemas.safeString);
expect(result.success).toBe(false);
```

### Test CORS

```bash
# Check CORS headers
curl -s -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3000/api/workflows

# Should return CORS headers
```

### Test Error Sanitization

```bash
// Trigger an error and verify:
// - Client gets generic message
// - Server logs full error details
// - No stack trace in response
// - No sensitive data in response
```

---

## 🔄 Monitoring

### Key Metrics to Monitor

1. **Rate Limit Hits**
   - Track 429 responses per endpoint
   - Alert if sudden spike (possible attack)

2. **Errors**
   - Track error types and frequencies
   - Alert on spike in 400/500 errors

3. **Security Events**
   - Authentication failures
   - Authorization failures
   - Suspicious activity

4. **Performance**
   - API latency
   - Database query times
   - Slow query detection

### Recommended Tools

- **Error Tracking:** Sentry ($29/mo)
- **Monitoring:** Datadog ($15/host/mo)
- **Logging:** Supabase logs (included)
- **Analytics:** PostHog (self-hosted free)

---

## 🚨 Incident Response

### If Rate Limit Attacked

```typescript
// Temporarily increase limits
const config = {
  windowMs: 5 * 60 * 1000,
  maxRequests: 1000, // Temporarily increased
};

// Monitor for abuse patterns
// Consider blocking IPs
```

### If SQL Injection Detected

1. Check logs for patterns
2. Verify parameterized queries are used
3. Update input validation
4. Test with malicious input
5. Deploy fix
6. Monitor for similar patterns

### If Unauthorized Access

1. Review audit logs
2. Identify compromised user/token
3. Revoke tokens
4. Reset user password
5. Check for data access
6. Notify user if needed

---

## 📚 Additional Resources

### Documentation Files

- `SECURITY_HARDENING_ROADMAP.md` — Complete hardening plan with timeline
- `LLM_SETUP_GUIDE.md` — API key security best practices
- This file — Implementation guide

### Code Examples

All security code includes:
- ✅ JSDoc comments
- ✅ Type definitions
- ✅ Usage examples
- ✅ Error handling patterns
- ✅ Best practices

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Guidelines](https://csrc.nist.gov/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

## ✅ Verification Checklist

After implementation:

- [ ] All endpoints have rate limiting
- [ ] All inputs are validated
- [ ] All errors are sanitized
- [ ] All requests are logged
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Database RLS verified
- [ ] Audit logging works
- [ ] Error tracking set up
- [ ] Monitoring configured

---

## 🔐 Security Best Practices

### Do's ✅
- ✅ Use environment variables for secrets
- ✅ Validate all user input
- ✅ Log security events
- ✅ Rotate API keys regularly
- ✅ Use HTTPS everywhere
- ✅ Keep dependencies updated
- ✅ Review logs regularly
- ✅ Test security measures

### Don'ts ❌
- ❌ Hardcode secrets
- ❌ Trust client input
- ❌ Log sensitive data
- ❌ Disable CORS
- ❌ Use weak passwords
- ❌ Skip updates
- ❌ Ignore security warnings
- ❌ Skip testing

---

## 📞 Support

If you need help implementing security features:

1. Check the JSDoc comments in the code
2. Review the example implementations
3. Check SECURITY_HARDENING_ROADMAP.md for more details
4. Run security checklist: `PRINT_SECURITY_CHECKLIST=true npm run dev`

---

**Implementation Status:** ✅ **READY FOR INTEGRATION**

All code has been created and is production-ready. Integrate according to the steps above and run the verification checklist before deploying to production.
