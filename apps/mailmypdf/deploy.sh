#!/usr/bin/env bash
set -euo pipefail

# ── MailMyPDF Deploy Script ──────────────────────────────────────────────────
# Builds the app, adds cron triggers, and deploys to Cloudflare Workers.
#
# The scheduled handler in src/server.ts is compiled into the build by Nitro
# automatically — no post-build patching needed.
#
# Cron: every 5 minutes → POST /api/internal/proof-processor
# Auth: Bearer MAILMYPDF_CLEANUP_SECRET
#
# Usage: ./deploy.sh

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
