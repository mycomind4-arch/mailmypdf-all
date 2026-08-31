# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MailMyPDF, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email **security@mailmypdf.com** with a description of the vulnerability
2. Include steps to reproduce, proof of concept, and potential impact
3. Do not publicly disclose the vulnerability until it has been addressed

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 5 business days
- **Fix or Mitigation:** Within 30 days for critical issues, 90 days for others
- **Public Disclosure:** After a fix is released, coordinated with the reporter

### Scope

- The MailMyPDF web application (mailmypdf.com)
- The Proof-of-Service API (api/v1)
- Payment processing (Stripe integration)
- Document handling and storage
- Authentication and access control

### Out of Scope

- Third-party services (Lob, Stripe, Supabase, Resend) — report to them directly
- Social engineering attacks
- Physical security

### Recognition

We appreciate responsible disclosure and will acknowledge contributors in release notes (with permission).

## Security Measures

MailMyPDF implements:
- Content-Security-Policy headers on all responses
- HSTS with preload in production
- Stripe SDK webhook signature verification
- Supabase Row-Level Security (RLS) on all tables
- Input sanitization and Zod schema validation
- SHA-256 cryptographic hash chains for proof-of-service records
- Per-tenant rate limiting on API endpoints
- Server-side PDF validation
- Idempotency keys for all mailing operations
