# Proof-of-Service: Cron & Scheduler Setup

The Proof-of-Service API has three internal maintenance endpoints that need
to be called on a schedule. Since MailMyPDF uses external schedulers (not
in-app cron), here's how to set them up.

## Recommended Schedule

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `/api/internal/proof-processor` | Every 5 min | Combined: webhook retries + window expiry |
| `/api/internal/proof-webhook-retries` | (alternative) Every 5 min | Webhook retries only |
| `/api/internal/proof-window-expiry` | (alternative) Hourly | Response window expiry only |

**Recommended:** Use the combined `/api/internal/proof-processor` endpoint
with a single cron job every 5 minutes. It runs both tasks in one call.

## Authentication

All internal endpoints require the `MAILMYPDF_CLEANUP_SECRET` environment
variable, passed as a Bearer token:

```
Authorization: Bearer <MAILMYPDF_CLEANUP_SECRET>
```

## Setup Options

### Option 1: Uptime Robot / Cron-job.org (Simplest)

1. Create a monitor/job for:
   ```
   POST https://mailmypdf.ai/api/internal/proof-processor
   Authorization: Bearer <MAILMYPDF_CLEANUP_SECRET>
   ```
2. Set interval to 5 minutes
3. Alert on non-200 response

### Option 2: Supabase Edge Function (Cron)

Create a Supabase Edge Function with a cron trigger:

```sql
-- In Supabase SQL editor
SELECT cron.schedule(
  'proof-of-service-processor',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://mailmypdf.ai/api/internal/proof-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cleanup_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Option 3: GitHub Actions (Free, Reliable)

```yaml
# .github/workflows/proof-of-service-cron.yml
name: Proof-of-Service Processor
on:
  schedule:
    - cron: '*/5 * * * *'  # every 5 minutes

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger proof-processor
        run: |
          curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Authorization: Bearer ${{ secrets.MAILMYPDF_CLEANUP_SECRET }}" \
            https://mailmypdf.ai/api/internal/proof-processor
```

### Option 4: Vercel Cron (if deployed on Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/internal/proof-processor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Monitoring

Each endpoint returns JSON with counts:

```json
{
  "ok": true,
  "webhook_retries": 3,
  "window_expiries": 1,
  "errors": []
}
```

Alert if:
- `ok` is false
- `errors` array is non-empty
- Response is non-200
- Response time > 10 seconds

## Environment Variables

Ensure these are set in the MailMyPDF deployment:

| Variable | Purpose |
|----------|---------|
| `MAILMYPDF_CLEANUP_SECRET` | Auth for internal endpoints |
| `LOB_API_KEY` | For sending mail via Lob |
| `LOB_WEBHOOK_SECRET` | For verifying Lob webhook signatures |
| `PROOF_OF_SERVICE_PLATFORM_KEY` | For tenant onboarding endpoint |

## Webhook URL Configuration

Point Lob's webhook to the extended endpoint:

```
https://mailmypdf.ai/api/public/lob-webhook-v2
```

This endpoint handles both consumer orders (existing flow) and
proof-of-service communications (new flow) in a single handler.
