# Security & Infrastructure Hardening Roadmap

**Date:** 2026-09-02  
**Status:** Assessment & Planning  
**Scope:** Complete security audit and hardening plan for MailMyPDF

---

## 📊 Current State Assessment

### ✅ What's Built & Secure
- ✅ Authenticated routes (Supabase auth)
- ✅ Row-level security on database tables
- ✅ API key management (environment-based, not hardcoded)
- ✅ Entitlements system with proper access control
- ✅ Webhook signature verification (Stripe, Lob)
- ✅ Basic input validation

### ⚠️ What Needs Hardening
- ❌ Comprehensive input validation everywhere
- ❌ Rate limiting
- ❌ OWASP compliance verification
- ❌ Secrets rotation policy
- ❌ Encryption at rest
- ❌ Comprehensive audit logging
- ❌ Error handling (leaking info)
- ❌ CORS configuration
- ❌ Request size limits
- ❌ DDoS protection

### ⏳ What's Missing
- ❌ Comprehensive test coverage
- ❌ Performance optimization
- ❌ Infrastructure monitoring
- ❌ Incident response plan
- ❌ GDPR/compliance features
- ❌ Admin dashboard
- ❌ Analytics infrastructure

---

## 🔒 Critical Security Issues (Priority: IMMEDIATE)

### 1. **Input Validation** — CRITICAL
**Risk:** SQL injection, XSS, command injection  
**Current State:** Partial (Supabase parameterized queries help)  
**Required:**
- [ ] Validate ALL user inputs
- [ ] Whitelist allowed characters
- [ ] Check length limits
- [ ] Sanitize for XSS
- [ ] Validate file uploads

**Implementation:**
```typescript
// Add comprehensive input validation
import { validate } from 'class-validator';

// Validate all API inputs
const schema = {
  workflowId: z.string().uuid(),
  documentName: z.string().min(1).max(255),
  email: z.string().email(),
};

// Before any database query
const validated = schema.parse(userInput);
```

**Effort:** 20-30 hours  
**Impact:** CRITICAL — Prevents major exploits

---

### 2. **Rate Limiting** — CRITICAL
**Risk:** Brute force, DoS, API abuse  
**Current State:** None  
**Required:**
- [ ] IP-based rate limiting
- [ ] User-based rate limiting
- [ ] API endpoint rate limiting
- [ ] Webhook rate limiting
- [ ] Login attempt throttling

**Implementation:**
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

**Effort:** 10-15 hours  
**Impact:** CRITICAL — Prevents abuse

---

### 3. **CORS Configuration** — CRITICAL
**Risk:** Cross-site request forgery, data leakage  
**Current State:** Likely too permissive or missing  
**Required:**
- [ ] Strict CORS policy
- [ ] Whitelist allowed origins
- [ ] Validate referer headers
- [ ] CSRF tokens on forms

**Implementation:**
```typescript
// Configure CORS properly
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Effort:** 5 hours  
**Impact:** CRITICAL — Prevents CSRF

---

### 4. **Secrets Management** — CRITICAL
**Risk:** Key leakage, hardcoded credentials  
**Current State:** Environment-based (good), but needs rotation  
**Required:**
- [ ] Secrets rotation policy
- [ ] Key versioning
- [ ] Audit trail for key access
- [ ] Automated key expiration
- [ ] No secrets in logs

**Implementation:**
```typescript
// Use secrets manager
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager();
const apiKey = await secretsManager.getSecretValue({
  SecretId: 'mailmypdf/anthropic-key'
}).promise();
```

**Effort:** 15-20 hours  
**Impact:** CRITICAL — Prevents key compromise

---

### 5. **Error Handling** — HIGH
**Risk:** Information disclosure  
**Current State:** Generic errors, but may leak stack traces  
**Required:**
- [ ] Generic error messages to users
- [ ] Detailed errors logged server-side only
- [ ] No stack traces in API responses
- [ ] Error tracking (Sentry, etc.)
- [ ] Structured logging

**Implementation:**
```typescript
// Secure error handling
app.use((err, req, res, next) => {
  // Log full error server-side
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    userId: req.user?.id,
    path: req.path
  });

  // Return generic error to client
  res.status(500).json({
    error: 'An error occurred. Please contact support.',
    requestId: req.id // For support reference
  });
});
```

**Effort:** 10 hours  
**Impact:** HIGH — Prevents information disclosure

---

## 🛡️ Security Hardening (Priority: HIGH)

### 6. **Database Security** — HIGH
**Risk:** Data breach, unauthorized access  
**Current State:** RLS implemented, but needs review  
**Required:**
- [ ] Verify RLS on all tables
- [ ] Encryption at rest
- [ ] Backup encryption
- [ ] Connection encryption (SSL/TLS)
- [ ] Parameterized queries everywhere
- [ ] Query audit logging

**Checklist:**
```sql
-- Verify RLS enabled on all tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity;

-- Check indexes on frequently queried columns
SELECT * FROM pg_indexes 
WHERE schemaname = 'public';
```

**Effort:** 15-20 hours  
**Impact:** HIGH — Protects data

---

### 7. **Authentication & Authorization** — HIGH
**Risk:** Unauthorized access, privilege escalation  
**Current State:** Supabase auth + entitlements, needs hardening  
**Required:**
- [ ] Session timeout enforcement
- [ ] Device verification
- [ ] IP whitelist for admin
- [ ] 2FA/MFA support
- [ ] OAuth scope validation
- [ ] Permission audit on every endpoint

**Implementation:**
```typescript
// Add permission checks
async function requirePermission(userId, resource, action) {
  const { data: entitlements } = await supabase
    .from('entitlement_assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (!canPerform(entitlements, action)) {
    throw new PermissionError('Insufficient permissions');
  }
}

// Use on every endpoint
app.post('/api/workflows/:id', async (req, res) => {
  await requirePermission(req.user.id, 'workflow', 'write');
  // ... handle request
});
```

**Effort:** 25-30 hours  
**Impact:** HIGH — Prevents unauthorized access

---

### 8. **Encryption** — HIGH
**Risk:** Data interception, data at rest compromise  
**Current State:** TLS in transit (Supabase/Stripe), needs at-rest encryption  
**Required:**
- [ ] Encryption at rest for sensitive fields
- [ ] Field-level encryption for PII
- [ ] Key derivation from user password (if applicable)
- [ ] Secure backup encryption

**Implementation:**
```typescript
// Encrypt sensitive fields
import crypto from 'crypto';

function encryptField(value, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

**Effort:** 20-25 hours  
**Impact:** HIGH — Protects sensitive data

---

## 📋 Compliance & Audit (Priority: HIGH)

### 9. **GDPR Compliance** — HIGH
**Risk:** Legal penalties, data subject rights violations  
**Current State:** Partial (auth, RLS), needs GDPR features  
**Required:**
- [ ] Right to access (data export)
- [ ] Right to erasure (secure deletion)
- [ ] Right to portability (data export format)
- [ ] Privacy policy
- [ ] Data processing agreements
- [ ] Consent management
- [ ] Breach notification process

**Checklist:**
- [ ] Can users download their data?
- [ ] Can users delete their account completely?
- [ ] Is consent recorded with timestamp?
- [ ] Privacy policy published?
- [ ] DPA signed with Supabase/Stripe?
- [ ] Breach notification procedure documented?

**Effort:** 30-40 hours  
**Impact:** CRITICAL — Legal requirement

---

### 10. **Audit Logging** — HIGH
**Risk:** Cannot investigate incidents, compliance failure  
**Current State:** Basic Supabase auth logs, needs comprehensive audit trail  
**Required:**
- [ ] Log all API calls (user, action, timestamp, IP)
- [ ] Log data access and modifications
- [ ] Log authentication events
- [ ] Log admin actions
- [ ] Log payment events
- [ ] Immutable audit log (cannot be deleted)
- [ ] Audit log retention (min 2+ years)

**Implementation:**
```typescript
// Comprehensive audit logging
async function auditLog(event) {
  await supabase.from('audit_log').insert({
    user_id: event.userId,
    action: event.action,
    resource: event.resource,
    resource_id: event.resourceId,
    timestamp: new Date().toISOString(),
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    changes: event.changes,
    status: event.status // success/failure
  });
}

// Log before every important action
await auditLog({
  userId: req.user.id,
  action: 'workflow_created',
  resource: 'workflow',
  resourceId: workflow.id,
  changes: { /* what changed */ }
});
```

**Effort:** 15-20 hours  
**Impact:** HIGH — Required for compliance

---

## 🧪 Testing (Priority: HIGH)

### 11. **Test Coverage** — HIGH
**Risk:** Bugs in production, security flaws  
**Current State:** Minimal (only Lob integration tests passing)  
**Required:**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security tests
- [ ] Performance tests
- [ ] Load tests

**Needed Tests:**
```typescript
// Security tests
describe('Security', () => {
  test('SQL injection prevented', () => {
    // Try to inject SQL
    const malicious = "'; DROP TABLE users; --";
    // Should be sanitized/rejected
  });

  test('XSS prevented', () => {
    // Try to inject script
    const xss = "<script>alert('xss')</script>";
    // Should be escaped/rejected
  });

  test('CSRF token validation', () => {
    // Request without CSRF token should fail
  });

  test('Rate limiting works', async () => {
    // Make 101 requests, 101st should fail
  });
});
```

**Effort:** 40-60 hours  
**Impact:** HIGH — Catches bugs early

---

## 📊 Infrastructure (Priority: MEDIUM)

### 12. **Monitoring & Alerting** — MEDIUM
**Risk:** Incidents go unnoticed, slow response  
**Current State:** None  
**Required:**
- [ ] Application performance monitoring (APM)
- [ ] Error rate monitoring
- [ ] Performance monitoring
- [ ] Security event alerts
- [ ] Database monitoring
- [ ] API latency monitoring
- [ ] Cost monitoring (API spend)

**Tools:**
- Sentry (error tracking)
- Datadog (monitoring)
- CloudWatch (AWS)
- New Relic (APM)

**Effort:** 20-30 hours  
**Impact:** MEDIUM — Faster incident detection

---

### 13. **Scalability** — MEDIUM
**Risk:** System goes down under load  
**Current State:** Single deployment, no scaling  
**Required:**
- [ ] Horizontal scaling setup
- [ ] Load balancing
- [ ] Database connection pooling
- [ ] Caching strategy (Redis)
- [ ] CDN for static assets
- [ ] Queue system for long tasks

**Effort:** 40-60 hours  
**Impact:** MEDIUM — Handles growth

---

### 14. **Backup & Disaster Recovery** — MEDIUM
**Risk:** Data loss, extended downtime  
**Current State:** Likely Supabase backups only  
**Required:**
- [ ] Daily encrypted backups
- [ ] Backup verification (test restore)
- [ ] Geographically distributed backups
- [ ] RTO/RPO documented
- [ ] Disaster recovery plan
- [ ] Regular DR drills

**Checklist:**
- [ ] Can restore from yesterday's backup?
- [ ] Backup encryption working?
- [ ] Backup location different from primary?
- [ ] Restore time < 1 hour?

**Effort:** 15-20 hours  
**Impact:** MEDIUM — Prevents data loss

---

## 🚀 Feature Completeness (Priority: MEDIUM)

### 15. **Admin Dashboard** — MEDIUM
**Risk:** Cannot manage system, slow incident response  
**Current State:** None  
**Required:**
- [ ] User management
- [ ] Workflow management
- [ ] Analytics dashboard
- [ ] Support tools
- [ ] System health dashboard
- [ ] Compliance reporting
- [ ] Audit log viewer

**Effort:** 40-50 hours  
**Impact:** MEDIUM — Enables operations

---

### 16. **Analytics & Reporting** — MEDIUM
**Risk:** Cannot measure success or improve  
**Current State:** Minimal (learning engine collects data)  
**Required:**
- [ ] Usage analytics
- [ ] Workflow success rates
- [ ] User retention metrics
- [ ] Performance metrics
- [ ] Financial reporting (costs, revenue)
- [ ] Compliance reports

**Effort:** 30-40 hours  
**Impact:** MEDIUM — Data-driven decisions

---

### 17. **Documentation** — MEDIUM
**Risk:** Team cannot operate system, users confused  
**Current State:** Partial (implementation guides created)  
**Required:**
- [ ] API documentation
- [ ] Admin guide
- [ ] Operations manual
- [ ] Security playbook
- [ ] Disaster recovery runbook
- [ ] User guide
- [ ] Developer guide

**Effort:** 30-40 hours  
**Impact:** MEDIUM — Enables support

---

## 🎯 Priority Matrix

### IMMEDIATE (Week 1-2)
1. Input validation (CRITICAL)
2. Rate limiting (CRITICAL)
3. CORS configuration (CRITICAL)
4. Error handling (HIGH)
5. Database security verification (HIGH)

**Effort:** ~60 hours  
**Impact:** Prevents major exploits

### URGENT (Week 3-4)
6. Secrets management (CRITICAL)
7. Authentication hardening (HIGH)
8. Encryption at rest (HIGH)
9. GDPR compliance (HIGH)
10. Audit logging (HIGH)

**Effort:** ~100 hours  
**Impact:** Compliance + security

### IMPORTANT (Month 2)
11. Test coverage (HIGH)
12. Monitoring & alerting (MEDIUM)
13. Admin dashboard (MEDIUM)
14. Documentation (MEDIUM)

**Effort:** ~150 hours  
**Impact:** Operations + reliability

### LATER (Month 3+)
15. Scalability (MEDIUM)
16. Backup & DR (MEDIUM)
17. Analytics (MEDIUM)

**Effort:** ~150 hours  
**Impact:** Growth + resilience

---

## 🔐 Security Checklist by Layer

### Network Layer
- [ ] TLS 1.3 enforced
- [ ] HSTS header set
- [ ] DDoS protection configured
- [ ] WAF rules deployed
- [ ] VPN for admin access
- [ ] IP whitelisting for admin

### Application Layer
- [ ] Input validation on all endpoints
- [ ] Output encoding (XSS prevention)
- [ ] CSRF tokens on forms
- [ ] Authentication on all routes
- [ ] Authorization checks
- [ ] Rate limiting
- [ ] Secure headers (CSP, X-Frame-Options, etc.)

### Data Layer
- [ ] Encryption at rest
- [ ] Encryption in transit (TLS)
- [ ] Field-level encryption for PII
- [ ] Parameterized queries
- [ ] RLS on all tables
- [ ] Audit logging on sensitive tables

### Infrastructure Layer
- [ ] Secrets management
- [ ] No hardcoded credentials
- [ ] Secure CI/CD
- [ ] Container scanning
- [ ] Vulnerability scanning
- [ ] Regular patching

### Operational Layer
- [ ] Incident response plan
- [ ] Security training
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Backup verification
- [ ] Compliance audits

---

## 📈 Effort & ROI

| Category | Effort | Priority | ROI |
|----------|--------|----------|-----|
| Input validation | 20-30h | IMMEDIATE | CRITICAL |
| Rate limiting | 10-15h | IMMEDIATE | CRITICAL |
| Error handling | 10h | IMMEDIATE | HIGH |
| Secrets mgmt | 15-20h | URGENT | CRITICAL |
| Auth hardening | 25-30h | URGENT | HIGH |
| Encryption | 20-25h | URGENT | HIGH |
| GDPR | 30-40h | URGENT | CRITICAL |
| Audit logging | 15-20h | URGENT | HIGH |
| Tests | 40-60h | IMPORTANT | HIGH |
| Monitoring | 20-30h | IMPORTANT | HIGH |
| Admin dashboard | 40-50h | IMPORTANT | MEDIUM |
| **Total** | **~305-410h** | **8-10 weeks** | **CRITICAL** |

---

## 🚨 Risk Assessment

### Current Risks
- **CRITICAL:** No rate limiting (DDoS/abuse)
- **CRITICAL:** No GDPR features (legal)
- **CRITICAL:** Secrets not rotated (key compromise)
- **HIGH:** Input validation incomplete
- **HIGH:** Error handling leaky
- **HIGH:** No audit trail
- **HIGH:** No backup plan
- **MEDIUM:** No monitoring
- **MEDIUM:** No tests

### Recommended Approach
1. **Week 1-2:** Fix CRITICAL security issues
2. **Week 3-4:** GDPR + audit + encryption
3. **Week 5-6:** Tests + monitoring
4. **Week 7-8:** Admin + docs + scalability

This brings the system to **production-hardened** status.

---

## ✅ Sign-Off Criteria

Before considering the platform production-ready:

- [ ] All IMMEDIATE items complete
- [ ] All URGENT items complete
- [ ] Security audit passed
- [ ] Penetration test passed (no critical issues)
- [ ] Load test: 1000 concurrent users
- [ ] GDPR compliance verified
- [ ] Audit log working
- [ ] Disaster recovery tested
- [ ] All teams trained
- [ ] On-call rotation established

**Estimated Timeline:** 8-10 weeks to production-hardened status
