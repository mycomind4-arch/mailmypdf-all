# MailMyPDF Data Retention Policy

**Last updated:** 2026-08-15

## Overview

MailMyPDF retains user data only as long as necessary to provide the service
and comply with legal record-keeping requirements. This document describes
what data we keep, how long we keep it, and how users can request deletion.

## Data Categories & Retention Periods

### 1. Unpaid Draft Orders

| Field | Value |
|---|---|
| **Data** | Order record, uploaded PDF, sender/recipient addresses, email |
| **Retention** | 24 hours (configurable via `MAILMYPDF_DRAFT_RETENTION_HOURS`) |
| **Cleanup** | Automated cron job deletes draft orders with no Stripe session |
| **Storage** | PDF file deleted from Supabase Storage; database row hard-deleted |

### 2. Completed Orders (Paid & Mailed)

| Field | Value |
|---|---|
| **Data** | Order record, PDF document, mailing metadata, tracking info, event history |
| **Retention** | 7 years from delivery date (standard legal records requirement) |
| **Rationale** | Proof of mailing, delivery confirmation, and legal correspondence records |
| **Deletion** | Automated job deletes expired records (PDF + database row + events) |

### 3. Authentication & Session Data

| Field | Value |
|---|---|
| **Data** | Supabase auth tokens, session metadata |
| **Retention** | Managed by Supabase Auth defaults (refresh tokens expire per Supabase config) |

### 4. Audit Logs

| Field | Value |
|---|---|
| **Data** | Rate limit hits, auth events, admin actions, security events |
| **Retention** | 90 days |
| **Rationale** | Security investigation and incident response |

### 5. Rate Limit Buckets

| Field | Value |
|---|---|
| **Data** | IP/email + bucket key + timestamps |
| **Retention** | 2 hours (auto-expiry via cleanup) |
| **Rationale** | Only needed for active rate limiting windows |

### 6. Tenant API Keys (Proof of Service)

| Field | Value |
|---|---|
| **Data** | API key hash (SHA-256 + bcrypt), key metadata |
| **Retention** | Until revoked by tenant admin |
| **Encryption** | API keys stored as bcrypt hashes; tenant secrets encrypted at rest (AES-256-GCM) |

## User Rights

### Right to Deletion

Users can request deletion of their data at any time:

- **Email:** Send a deletion request to the support email configured via `RESEND_SUPPORT_EMAIL`
- **Scope:** All orders, PDFs, and event history associated with the user's email
- **Timeline:** Deletion completed within 30 days of verified request
- **Verification:** We verify identity via the email on file before deletion

### Right to Export

Users can request a data export containing:

- All order records and event history
- Uploaded PDF documents
- Mailing metadata and tracking information

## Enterprise Tenants

Enterprise tenants (Proof of Service API) can configure:

- Custom retention periods (shorter or longer than defaults)
- Automated deletion schedules
- Per-key data isolation and deletion

## Legal Basis

- **Contract performance:** Order data needed to fulfill the mailing service
- **Legal obligation:** 7-year retention for mailed correspondence records
- **Legitimate interest:** Audit logs for security and fraud prevention
- **Consent:** Marketing communications (opt-in, revocable at any time)

## Data Deletion Methods

- **Database records:** Hard-deleted via Supabase admin client (not soft-deleted)
- **Storage files:** Permanently removed from Supabase Storage buckets
- **Backups:** Supabase backup retention is managed by Supabase's infrastructure
- **Rate limit data:** Auto-expired and cleaned up within 2 hours

## Contact

For data retention, deletion, or export requests, contact the support email
configured in the deployment's environment variables (`RESEND_SUPPORT_EMAIL`).
