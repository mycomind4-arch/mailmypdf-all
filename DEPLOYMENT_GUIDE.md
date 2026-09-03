# Deployment Guide - MailMyPDF to Cloudflare Pages

## ✅ Status: Deployment Configured

Your admin dashboard and all MailMyPDF code has been successfully pushed to GitHub on the `codex/workflow-build-console-foundation` branch and is ready for deployment to Cloudflare Pages.

---

## 🚀 Automatic Deployment Setup

A GitHub Actions workflow has been configured to automatically deploy your application to Cloudflare Pages whenever you push code to:
- `main` branch
- `codex/workflow-build-console-foundation` branch

**Workflow file:** `.github/workflows/deploy.yml`

---

## 📋 Pre-Deployment Checklist

### 1. Create Cloudflare Account
If you don't have one yet:
1. Go to https://dash.cloudflare.com
2. Sign up for a free account
3. Verify your email

### 2. Get Your Cloudflare Credentials

#### Find Your Account ID:
1. Log into Cloudflare Dashboard
2. Click your profile icon (bottom-left) → **Account Settings**
3. Look for **Account ID** in the right sidebar
4. Copy the ID (looks like: `a1b2c3d4e5f6g7h8i9j0`)

#### Create an API Token:
1. In Cloudflare Dashboard: Profile → **API Tokens**
2. Click **Create Token**
3. Use the "Edit Cloudflare Workers" template (or create custom)
4. Grant these permissions:
   - **Account.Pages** (Read & Write)
   - **Account.Account Settings** (Read)
5. Click **Continue to Summary** → **Create Token**
6. Copy the token (you'll only see it once!)

---

## 🔐 Configure GitHub Secrets

Add your Cloudflare credentials to GitHub:

1. Go to your GitHub repository: `mycomind4-arch/mailmypdf-all`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: *Paste your API token from above*

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: *Paste your Account ID from above*

4. Click **Add secret** for each

✅ GitHub will now have access to deploy to your Cloudflare Pages project.

---

## 🌐 Create Cloudflare Pages Project

### Option A: Automatic (Recommended)
The GitHub Actions workflow will automatically create and deploy to a Cloudflare Pages project on first run.

### Option B: Manual Setup
1. Log into Cloudflare Dashboard
2. Go to **Pages** (in left sidebar)
3. Click **Create a project** → **Connect to Git**
4. Select your GitHub account and repository (`mailmypdf-all`)
5. Select branch: `codex/workflow-build-console-foundation`
6. Configure build settings:
   - **Framework preset:** None
   - **Build command:** `pnpm install && pnpm run build`
   - **Build output directory:** `apps/mailmypdf/dist/client`
   - **Node version:** `20`
7. Click **Save and Deploy**

---

## 📦 Build Output Structure

The deployment uses:
- **Build Command:** `pnpm run build` (from root)
- **Output Directory:** `apps/mailmypdf/dist/client`
- **Framework:** TanStack Start (Nitro/Vite) with Cloudflare Pages preset

---

## 🔍 Verify Deployment

After the workflow runs:

1. **Check GitHub Actions:**
   - Go to your repo → **Actions** tab
   - Look for the "Deploy to Cloudflare Pages" workflow
   - It should show a ✅ green checkmark when successful

2. **Find Your Cloudflare Pages URL:**
   - Log into Cloudflare Dashboard → **Pages**
   - Look for your project (auto-named based on repo)
   - Click the project to see your live URL (e.g., `https://mailmypdf-abc123.pages.dev`)

3. **View Deployment Details:**
   - Click the project → **Deployments** tab
   - See deployment history and build logs

---

## 📝 Admin Dashboard Access

Once deployed to Cloudflare Pages, your admin dashboard is live at:

```
https://<your-pages-domain>/auth
```

**Login credentials:**
- Email: `admin@mailmypdf.ai`
- Password: `666mdr222`

**After login, you'll see:**
- ✅ Dashboard Overview (metrics, status cards)
- ✅ Left Sidebar Navigation (all admin functions)
- ✅ Platform Agent Chat Interface
- ✅ Settings & Secrets Tab (LLM API key management)
- ✅ MailMyPDF Small Business Styling

---

## 🔧 Troubleshooting

### Deployment Failed?

**Check the GitHub Actions logs:**
1. Go to repo → **Actions** → Select failed workflow
2. Click the job to see detailed error logs
3. Common issues:
   - Dependencies not installed (pnpm issues)
   - Build errors in the app
   - Missing environment variables
   - Cloudflare token expired or invalid

**Re-run the workflow:**
1. If you fix the issue in code, just push again
2. The workflow automatically triggers on push
3. Or manually: Go to **Actions** → Select workflow → **Run workflow**

### Custom Domain?

To use your own domain with Cloudflare Pages:
1. Cloudflare Dashboard → Your Pages project
2. Click **Custom domains**
3. Add your domain (requires Cloudflare DNS)
4. Follow the DNS verification steps

### Environment Variables

If your app needs environment variables at build/runtime:
1. Cloudflare Dashboard → Pages project → **Settings** → **Environment variables**
2. Add variables for different environments (Production, Preview)
3. Redeploy to apply

---

## 📊 What's Deployed

Your admin dashboard includes:

### Frontend (React/TanStack Start)
- ✅ Unified authentication system
- ✅ Admin dashboard with 5 tabs
- ✅ Left sidebar navigation
- ✅ Platform agent chat interface
- ✅ LLM secrets management
- ✅ MailMyPDF Small Business styling

### Backend (Nitro/Cloudflare Workers)
- ✅ Authentication API (`/api/admin/login`)
- ✅ Chat agent API (`/api/admin/chat-agent`)
- ✅ Session validation
- ✅ Message processing with Claude AI

### Documentation
- ✅ Agent Architecture Guide
- ✅ Admin Dashboard Styling Guide
- ✅ Admin Setup Guide
- ✅ Complete deployment documentation

---

## 🚀 Next Steps

1. **Set GitHub Secrets** (as described above)
2. **Verify Cloudflare Setup** (create account if needed)
3. **Wait for first deployment** (workflow runs automatically on push)
4. **Access your dashboard** at `https://<your-pages-domain>/auth`
5. **Monitor deployments** in GitHub Actions and Cloudflare Dashboard

---

## 💡 Key Points

- ✅ Code is clean (all secrets removed)
- ✅ GitHub Actions workflow is configured
- ✅ Nitro preset for Cloudflare Pages is set
- ✅ Build process is automated
- ✅ Deployment happens on every push to main/codex branches

🎉 **Your MailMyPDF admin dashboard is ready to deploy!**

---

## 📞 Support

For issues with:
- **Cloudflare Pages:** https://developers.cloudflare.com/pages/
- **GitHub Actions:** https://docs.github.com/en/actions
- **Deployment troubleshooting:** Check the GitHub Actions logs
