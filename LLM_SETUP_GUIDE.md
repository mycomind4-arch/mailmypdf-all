# LLM Setup Guide — Anthropic & Gemini Configuration

**Status:** ✅ **READY FOR CONFIGURATION**  
**Date:** 2026-09-02

---

## 🔐 API Key Management

The Workflow Intelligence system supports **both Anthropic and Google Gemini** for maximum flexibility:

| Feature | Anthropic | Gemini |
|---------|-----------|--------|
| **Model** | Claude 3.5 Sonnet | Gemini 2.0 Pro |
| **Max Tokens** | 200,000 | 1,000,000 |
| **Speed** | Medium | Fast |
| **Cost** | $3-15/1M tokens | Competitive |
| **Vision** | ✅ Yes | ✅ Yes |
| **Streaming** | ✅ Yes | ✅ Yes |

---

## 🔑 Getting API Keys

### Anthropic (Claude)

1. **Create Account**
   - Go to https://console.anthropic.com/
   - Sign up with email or Google

2. **Generate API Key**
   - Click "Account" → "API Keys"
   - Create new API key
   - Copy key (starts with `sk-`)

3. **Set Environment Variable**
   ```bash
   export ANTHROPIC_API_KEY="sk_your_key_here"
   ```

### Google Gemini

1. **Create Account**
   - Go to https://aistudio.google.com/app/apikey
   - Sign in with Google account

2. **Generate API Key**
   - Click "Create API Key"
   - Select project (or create new)
   - Copy key

3. **Set Environment Variable**
   ```bash
   export GEMINI_API_KEY="your_key_here"
   ```

---

## 🚀 Setup Instructions

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Add Your API Keys

Edit `.env.local`:

```bash
# Add your Anthropic key
ANTHROPIC_API_KEY=sk_your_anthropic_key_here

# Add your Gemini key (optional)
GEMINI_API_KEY=your_gemini_key_here
```

### Step 3: Verify Configuration

```bash
npm run build  # Build workflow-intelligence package
```

The system will validate your keys and show warnings if needed.

### Step 4: Use in Code

```typescript
import { llmProvider } from '@mailmypdf/workflow-intelligence';

// Automatically uses available providers
const response = await llmProvider.sendMessage([
  {
    role: 'user',
    content: 'Analyze this workflow...'
  }
]);

console.log(response.text);
console.log(response.provider); // "anthropic" or "gemini"
console.log(response.cost);     // Cost in USD
```

---

## ⚙️ Configuration Options

### Use Both Providers (Recommended)

```env
ANTHROPIC_API_KEY=sk_...
GEMINI_API_KEY=...
```

**Benefits:**
- ✅ Automatic fallback if one provider fails
- ✅ Load balancing based on availability
- ✅ Cost optimization (use cheaper provider)

### Use Only Anthropic

```env
ANTHROPIC_API_KEY=sk_...
# Leave GEMINI_API_KEY unset
```

### Use Only Gemini

```env
GEMINI_API_KEY=...
# Leave ANTHROPIC_API_KEY unset
```

---

## 📊 Cost Comparison

### Anthropic (Claude 3.5 Sonnet)
- **Input:** $3 per 1M tokens
- **Output:** $15 per 1M tokens
- **Example:** 10,000 input + 1,000 output = ~$0.048

### Google Gemini (2.0 Pro)
- **Free tier:** 15 requests per minute
- **Paid:** Competitive pricing
- **Example:** ~$0.001-0.005 per request

---

## 🔄 Provider Selection Strategy

The system automatically selects providers based on:

1. **Availability** — Use whichever is configured
2. **Fallback** — If primary fails, try alternate
3. **Cost Optimization** — Use cheaper provider (when both available)
4. **Context Size** — Use Gemini for large contexts (>100K tokens)
5. **Speed** — Use Gemini for latency-critical operations

### Manual Override

```typescript
// Force Anthropic
await llmProvider.sendMessage(messages, {
  provider: 'anthropic'
});

// Force Gemini
await llmProvider.sendMessage(messages, {
  provider: 'gemini'
});

// Auto-select (default)
await llmProvider.sendMessage(messages, {
  provider: 'auto'
});
```

---

## 🛡️ Security Best Practices

### ✅ DO

- ✅ Use `.env.local` for local development
- ✅ Add `.env.local` to `.gitignore`
- ✅ Rotate keys periodically
- ✅ Use least-privilege API key permissions
- ✅ Monitor API usage and costs
- ✅ Set rate limits on your API keys

### ❌ DON'T

- ❌ Commit API keys to version control
- ❌ Share keys in Slack/email/chat
- ❌ Use production keys in development
- ❌ Hardcode keys in source code
- ❌ Log API keys in error messages

---

## 📝 Example: .env.local

```bash
# Workflow Intelligence - LLM Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
ANTHROPIC_MODEL=claude-opus-5
GEMINI_MODEL=gemini-2.0-pro-exp-12-05
```

---

## 🐛 Troubleshooting

### "No LLM providers configured"

**Problem:** Neither API key is set

**Solution:**
```bash
export ANTHROPIC_API_KEY="sk_..."
# OR
export GEMINI_API_KEY="..."
```

### "Invalid API key for Anthropic"

**Problem:** Key doesn't start with `sk-`

**Solution:**
1. Go to https://console.anthropic.com/account/keys
2. Generate new API key
3. Copy exact key (including `sk_` prefix)

### "CORS error with Gemini"

**Problem:** API key not valid for web use

**Solution:**
- Use server-side environment variables (not client-side)
- Gemini keys work best in Node.js backend

### High API Costs

**Solution:**
- Monitor API usage in provider dashboards
- Set spending limits in console
- Use Gemini (cheaper) for high-volume operations
- Optimize prompts (shorter = cheaper)

---

## 📊 Monitoring & Costs

### Anthropic Console

Track usage at: https://console.anthropic.com/account/usage

### Google AI Studio

Track usage at: https://aistudio.google.com/app/usage

### Set Spending Limits

**Anthropic:**
- Console → Settings → Usage Limits
- Set monthly budget cap

**Google:**
- Google Cloud Console → Billing
- Set project budget and alerts

---

## 🔄 Provider Switching Example

```typescript
import { llmProvider } from '@mailmypdf/workflow-intelligence';

// Get available providers
const available = llmProvider.getAvailableProviders();
console.log('Available:', available); // ['anthropic', 'gemini']

// Check capabilities
const anthropicCaps = llmProvider.getCapabilities('anthropic');
const geminiCaps = llmProvider.getCapabilities('gemini');

console.log('Anthropic max context:', anthropicCaps.maxContextTokens);
console.log('Gemini max context:', geminiCaps.maxContextTokens);

// Send with auto-selection
const response = await llmProvider.sendMessage(
  [{ role: 'user', content: 'Your prompt...' }],
  { provider: 'auto', maxTokens: 2000 }
);

console.log(`Used ${response.provider}: $${response.cost?.usd.toFixed(4)}`);
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env.local` file created
- [ ] API keys added to `.env.local`
- [ ] `.env.local` in `.gitignore`
- [ ] At least one provider configured
- [ ] Build succeeds: `npm run build`
- [ ] Can import from package: `import { llmProvider }`
- [ ] `llmProvider.getAvailableProviders()` returns non-empty array
- [ ] Test message sends successfully

---

## 🚀 Running with LLMs

### Development

```bash
# Load environment and run
source .env.local
npm run dev

# Or use dotenv
npx dotenv -e .env.local npm run dev
```

### Production

Set environment variables via:
- Docker: `ENV` directives
- Kubernetes: `ConfigMap` or `Secret`
- Heroku: `Config Vars`
- AWS: Parameter Store / Secrets Manager
- GitHub Actions: Secrets

Never commit production keys to git!

---

## 📈 Usage Patterns

### High-Throughput Analysis

```typescript
// Use Gemini (faster, cheaper for volume)
const results = await Promise.all(
  workflows.map(w =>
    llmProvider.sendMessage([/* ... */], {
      provider: 'gemini',
      maxTokens: 1000
    })
  )
);
```

### Complex Analysis

```typescript
// Use Anthropic (better reasoning)
const analysis = await llmProvider.sendMessage(
  [/* complex prompt requiring deep reasoning */],
  {
    provider: 'anthropic',
    maxTokens: 4000
  }
);
```

### Cost-Optimized

```typescript
// Auto-select based on cost
const response = await llmProvider.sendMessage(
  messages,
  { provider: 'auto' } // Picks cheapest available
);
```

---

## 🔗 Resources

- **Anthropic Docs:** https://docs.anthropic.com/
- **Gemini Docs:** https://cloud.google.com/docs/gemini/
- **Rate Limits:** Check provider console
- **Billing:** Monitor via provider dashboards

---

**Setup Complete!** Your MailMyPDF Workflow Intelligence system is now LLM-powered and ready to use.
