#!/usr/bin/env bash

# ── MailMyPDF Deploy Script ──────────────────────────────────────────────────
# Builds the app and deploys it to Cloudflare WORKERS with a cron trigger.
#
# Workers, not Pages, is deliberate: src/server.ts exports a `scheduled`
# handler, and Cloudflare Pages never fires scheduled events. Under the Pages
# preset this script cannot run at all — Pages emits
# dist/_worker.js/wrangler.json rather than .output/server/wrangler.json — and
# the proof jobs silently never run. The guard below fails loudly rather than
# letting that recur as a confusing `cd` error.
#
# Cron: every 5 minutes → POST /api/internal/proof-processor
# Auth: Bearer MAILMYPDF_CLEANUP_SECRET
#
# The secure-core jobs (document scanning, retention) are scheduled separately
# in .github/workflows/secure-core-jobs.yml, so they keep running regardless of
# where this app is hosted.
#
# Usage: ./deploy.sh

set -euo pipefail

if ! grep -q 'preset: "cloudflare_module"' vite.config.ts; then
  echo "❌ vite.config.ts is not on the Cloudflare Workers preset." >&2
  echo "   This script deploys a Worker with cron triggers. On the Pages" >&2
  echo "   preset the build emits no Worker config and scheduled events" >&2
  echo "   never fire. Read the header of this file before changing it." >&2
  exit 1
fi

echo "📦 Building..."
npm run build

echo "🔧 Adding cron triggers to wrangler config..."
cd .output/server

python3 << 'PYEOF'
import json

with open("wrangler.json") as f:
    config = json.load(f)

config["name"] = "mailmypdf"
config["triggers"] = {
    "crons": [
        "*/5 * * * *",   # Every 5 minutes: proof-processor (webhook retries, window expiry)
    ]
}

with open("wrangler.json", "w") as f:
    json.dump(config, f, indent=2)

print("✅ Cron triggers added: proof-processor every 5 minutes")
PYEOF

echo "🚀 Deploying to Cloudflare Workers..."
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID npx wrangler deploy --config wrangler.json

echo ""
echo "✅ Deployed! Cron: */5 * * * * → /api/internal/proof-processor"
