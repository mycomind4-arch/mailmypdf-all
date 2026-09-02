# MailMyPDF Authentication Testing Guide

**Status:** Full Stack Testing  
**Date:** 2026-09-02  
**Scope:** Authentication across all verticals and MailMyPDF Core  
**Goal:** Ensure authenticated users work seamlessly across entire ecosystem

---

## Authentication Architecture Overview

### Unified Auth System

```
Supabase (Single Source of Truth)
    ↓
Auth Context (React Provider)
    ├── notice-respond
    ├── appeal-mail
    ├── immigration-mail
    ├── benefits-appeal
    ├── dispute-mail
    ├── private-office
    ├── code-enforcement
    ├── insurance-claims
    └── mailmypdf-core
        ├── /workspace (Dashboard)
        ├── /admin/* (Admin UI)
        └── /checkout/* (Payment)
```

### Key Components

**User Interface:**
```typescript
interface MailMyPDFUser {
  id: string;                    // Supabase user ID
  email: string;                 // Email address
  fullName?: string;             // User's full name
  role: "customer" | "admin" | "super_admin";
}
```

**Auth Context:**
- `user` - Current logged-in user
- `accessToken` - JWT token for API calls
- `loading` - Initial load state
- `isConfigured` - Supabase connectivity
- Methods: signUp, signIn, signInWithMagicLink, signOut, etc.

**Session Management:**
- Persistent session (localStorage)
- Auto token refresh
- Deep link detection
- Real-time auth state changes

---

## Test Scenarios

### 1. User Registration (Sign Up)

**Test:** New user can register across verticals

```typescript
describe("User Registration", () => {
  it("creates new user in Supabase", async () => {
    const { auth } = createClient(url, anonKey);
    
    const result = await auth.signUp({
      email: "newuser@example.com",
      password: "SecurePassword123!",
      options: {
        emailRedirectTo: "http://localhost:8080/auth/callback"
      }
    });
    
    assert(!result.error);
    assert(result.data.session?.user?.id);
    assert.equal(result.data.session.user.email, "newuser@example.com");
  });

  it("returns error for duplicate email", async () => {
    const { auth } = createClient(url, anonKey);
    
    // First signup
    await auth.signUp({ email: "user@example.com", password: "Pass123!" });
    
    // Duplicate email
    const result = await auth.signUp({ 
      email: "user@example.com", 
      password: "Pass123!" 
    });
    
    assert(result.error);
    assert(result.error.message.includes("already exists"));
  });

  it("validates password strength", async () => {
    const weakPassword = "123"; // Too weak
    
    const result = await auth.signUp({
      email: "test@example.com",
      password: weakPassword
    });
    
    assert(result.error);
    assert(result.error.message.includes("password"));
  });
});
```

**Verification:**
- [ ] New user created in Supabase
- [ ] Email verification sent
- [ ] Duplicate email rejected
- [ ] Weak passwords rejected
- [ ] Session created for new user

### 2. User Login (Sign In)

**Test:** Users can log in with email/password

```typescript
describe("User Login", () => {
  it("logs in with valid credentials", async () => {
    const { auth } = createClient(url, anonKey);
    
    // Assume user exists
    const result = await auth.signInWithPassword({
      email: "user@example.com",
      password: "SecurePassword123!"
    });
    
    assert(!result.error);
    assert(result.data?.session?.user);
    assert(result.data.session.access_token);
  });

  it("rejects invalid password", async () => {
    const result = await auth.signInWithPassword({
      email: "user@example.com",
      password: "WrongPassword123!"
    });
    
    assert(result.error);
    assert(result.error.message.includes("Invalid login credentials"));
  });

  it("rejects non-existent user", async () => {
    const result = await auth.signInWithPassword({
      email: "nonexistent@example.com",
      password: "AnyPassword123!"
    });
    
    assert(result.error);
  });
});
```

**Verification:**
- [ ] Valid credentials authenticate
- [ ] Invalid password rejected
- [ ] Non-existent user rejected
- [ ] Access token returned
- [ ] Session persisted

### 3. Cross-Vertical Authentication

**Test:** User authenticated in one vertical is authenticated in all

```typescript
describe("Cross-Vertical Authentication", () => {
  it("user logged in to notice-respond is also authenticated in appeal-mail", async () => {
    // 1. Login at notice-respond
    const response1 = await fetch("https://notice-respond.pages.dev/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Pass123!" })
    });
    const session1 = await response1.json();
    
    assert(session1.user);
    assert(session1.accessToken);
    
    // 2. Same user tries appeal-mail
    const response2 = await fetch("https://appeal-mail.pages.dev/api/user", {
      headers: {
        "Authorization": `Bearer ${session1.accessToken}`
      }
    });
    
    assert.equal(response2.status, 200);
    const user2 = await response2.json();
    assert.equal(user2.id, session1.user.id);
    assert.equal(user2.email, session1.user.email);
  });

  it("maintains auth context across tab navigation", async () => {
    // Tab 1: notice-respond
    const tab1 = await browser.newTab();
    await tab1.goto("https://notice-respond.pages.dev");
    await tab1.fill("input[name=email]", "test@example.com");
    await tab1.fill("input[name=password]", "Pass123!");
    await tab1.click("button[type=submit]");
    await tab1.waitForSelector("[data-user-id]");
    
    const userId1 = await tab1.$eval("[data-user-id]", el => el.textContent);
    
    // Tab 2: immigration-mail
    const tab2 = await browser.newTab();
    await tab2.goto("https://immigration-mail.pages.dev");
    
    // Should be authenticated without login
    const userEl = await tab2.$("[data-user-id]", { timeout: 2000 });
    assert(userEl); // User context available
    
    const userId2 = await tab2.$eval("[data-user-id]", el => el.textContent);
    assert.equal(userId1, userId2); // Same user
  });

  it("user from one vertical can access mailmypdf-core dashboard", async () => {
    // Login at any vertical
    const loginRes = await fetch("https://dispute-mail.pages.dev/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Pass123!" })
    });
    const { accessToken } = await loginRes.json();
    
    // Access core dashboard
    const dashRes = await fetch("http://localhost:8080/api/workspace", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    assert.equal(dashRes.status, 200);
    const data = await dashRes.json();
    assert(data.user);
    assert(data.entitlements); // Can fetch entitlements
  });
});
```

**Verification:**
- [ ] Credentials work across all verticals
- [ ] Access token valid for all APIs
- [ ] User context persists across tabs
- [ ] User can access core dashboard
- [ ] Entitlements sync across verticals

### 4. Session Management

**Test:** Sessions persist and refresh properly

```typescript
describe("Session Management", () => {
  it("restores session from localStorage", async () => {
    const { auth } = createClient(url, anonKey);
    
    // First login
    await auth.signInWithPassword({ 
      email: "test@example.com", 
      password: "Pass123!" 
    });
    
    // Simulate page refresh
    const stored = localStorage.getItem("sb-supabase-auth-token");
    assert(stored); // Token stored
    
    // Create new client instance
    const newClient = createClient(url, anonKey, { 
      auth: { persistSession: true } 
    });
    
    // Session should be restored
    const session = await newClient.auth.getSession();
    assert(session.data.session?.user);
    assert(session.data.session.user.email === "test@example.com");
  });

  it("auto-refreshes expired token", async () => {
    const { auth } = createClient(url, anonKey);
    
    // Get session with tokens
    const session1 = await auth.getSession();
    const token1 = session1.data.session?.access_token;
    
    // Wait for token expiration (1 hour in real scenario)
    // Simulate with clock manipulation
    jest.useFakeTimers();
    jest.advanceTimersByTime(60 * 60 * 1000 + 1000);
    
    // Next API call should trigger refresh
    const session2 = await auth.getSession();
    const token2 = session2.data.session?.access_token;
    
    // Token should be different (refreshed)
    assert.notEqual(token1, token2);
    assert(token2); // New token valid
  });

  it("clears session on sign out", async () => {
    const { auth } = createClient(url, anonKey);
    
    // Login
    await auth.signInWithPassword({ 
      email: "test@example.com", 
      password: "Pass123!" 
    });
    
    // Verify logged in
    let session = await auth.getSession();
    assert(session.data.session?.user);
    
    // Sign out
    await auth.signOut();
    
    // Session should be gone
    session = await auth.getSession();
    assert(!session.data.session?.user);
    
    // localStorage should be cleared
    const stored = localStorage.getItem("sb-supabase-auth-token");
    assert(!stored);
  });
});
```

**Verification:**
- [ ] Session persisted in localStorage
- [ ] Session restored on page load
- [ ] Token auto-refreshes before expiry
- [ ] Sign out clears all sessions
- [ ] Can't use token after sign out

### 5. Magic Link Authentication

**Test:** Users can log in via email magic link

```typescript
describe("Magic Link Login", () => {
  it("sends magic link email", async () => {
    const { auth } = createClient(url, anonKey);
    
    const result = await auth.signInWithOtp({
      email: "test@example.com",
      options: {
        emailRedirectTo: "http://localhost:8080/auth/callback"
      }
    });
    
    assert(!result.error);
    // Email should be sent (verified in email service)
  });

  it("authenticates via magic link callback", async () => {
    // Simulate magic link click with token
    const url = "http://localhost:8080/auth/callback?type=recovery&token=abc123";
    
    const response = await fetch(url);
    assert.equal(response.status, 200);
    
    // User should be authenticated after callback
    const user = await getUserContext();
    assert(user);
  });
});
```

**Verification:**
- [ ] Magic link email sent
- [ ] Link works when clicked
- [ ] User authenticated via link
- [ ] Redirects to dashboard

### 6. Role-Based Access Control

**Test:** Different roles have appropriate access

```typescript
describe("Role-Based Access Control", () => {
  it("customer can access workflows", async () => {
    const response = await fetch("http://localhost:8080/api/workflows", {
      headers: { "Authorization": `Bearer ${customerToken}` }
    });
    
    assert.equal(response.status, 200);
  });

  it("customer cannot access admin panel", async () => {
    const response = await fetch("http://localhost:8080/admin/entitlements", {
      headers: { "Authorization": `Bearer ${customerToken}` }
    });
    
    assert.equal(response.status, 403); // Forbidden
  });

  it("admin can access admin panel", async () => {
    const response = await fetch("http://localhost:8080/admin/entitlements", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    
    assert.equal(response.status, 200);
  });

  it("super_admin has full access", async () => {
    const response = await fetch("http://localhost:8080/api/system", {
      headers: { "Authorization": `Bearer ${superAdminToken}` }
    });
    
    assert.equal(response.status, 200);
  });
});
```

**Verification:**
- [ ] Customers see workflows
- [ ] Customers blocked from admin
- [ ] Admins can access entitlements
- [ ] Super admins have full access

### 7. Auth State Changes (Real-time)

**Test:** UI updates when auth state changes

```typescript
describe("Real-time Auth State Changes", () => {
  it("updates UI when user logs in", async () => {
    // Page shows logged-out state
    assert(await page.$(".login-button"));
    assert(!await page.$("[data-user-name]"));
    
    // User logs in in another tab
    await auth.signInWithPassword({
      email: "test@example.com",
      password: "Pass123!"
    });
    
    // Current tab should update automatically
    await page.waitForSelector("[data-user-name]", { timeout: 2000 });
    
    const userName = await page.$eval("[data-user-name]", el => el.textContent);
    assert.equal(userName, "test@example.com");
  });

  it("updates UI when user signs out", async () => {
    // User logged in
    assert(await page.$("[data-user-name]"));
    
    // Sign out in another tab
    await auth.signOut();
    
    // Current tab updates
    await page.waitForSelector(".login-button", { timeout: 2000 });
    assert(!await page.$("[data-user-name]"));
  });
});
```

**Verification:**
- [ ] UI shows logged-out state initially
- [ ] UI updates when signed in
- [ ] User name/email displays
- [ ] UI updates when signed out
- [ ] Dashboard hidden when not authenticated

---

## Manual Testing Checklist

### 1. Registration Flow

- [ ] Visit https://notice-respond.pages.dev/sign-up
- [ ] Enter new email and password
- [ ] Click Sign Up
- [ ] Receive confirmation email
- [ ] Click email link
- [ ] Redirected to dashboard
- [ ] User context shows email

### 2. Login Flow

- [ ] Visit https://appeal-mail.pages.dev/sign-in
- [ ] Enter registered email and password
- [ ] Click Sign In
- [ ] Redirected to dashboard
- [ ] User info displays in header

### 3. Cross-Vertical Access

**In Tab 1:**
- [ ] Login to notice-respond
- [ ] User displays

**In Tab 2:**
- [ ] Open immigration-mail
- [ ] User STILL displays (no login needed)
- [ ] Can access workflow
- [ ] Email matches Tab 1

### 4. Core Dashboard Access

**After logging in to any vertical:**
- [ ] Navigate to http://localhost:8080/workspace
- [ ] Dashboard loads without re-login
- [ ] User email shows
- [ ] Entitlements display
- [ ] Can access admin UI (if admin)

### 5. Sign Out Flow

- [ ] Click Sign Out button
- [ ] Redirected to login page
- [ ] Refresh page
- [ ] Still on login page (session cleared)
- [ ] Try to access protected page
- [ ] Redirected to login

### 6. Magic Link Login

- [ ] Visit login page
- [ ] Click "Send me a magic link"
- [ ] Enter email
- [ ] Check email for link
- [ ] Click link
- [ ] Logged in automatically

### 7. Token Persistence

- [ ] Login to vertical
- [ ] Open DevTools → Application → Storage → LocalStorage
- [ ] Look for `sb-supabase-auth-token`
- [ ] Refresh page
- [ ] Should still be logged in
- [ ] Sign out
- [ ] Token should be gone

---

## Automated Testing

### Test Suite

```bash
# Run auth tests for all verticals
npm test tests/auth-*.test.ts

# Run specific vertical auth
npm test tests/auth-notice-respond.test.ts

# Run with coverage
npm test -- --coverage tests/auth*
```

### CI/CD Integration

```yaml
name: Authentication Tests
on: [push, pull_request]

jobs:
  auth-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      
      # Auth tests for each vertical
      - run: npm test tests/auth-notice-respond.test.ts
      - run: npm test tests/auth-appeal-mail.test.ts
      - run: npm test tests/auth-immigration-mail.test.ts
      - run: npm test tests/auth-benefits-appeal.test.ts
      - run: npm test tests/auth-dispute-mail.test.ts
      - run: npm test tests/auth-private-office.test.ts
      
      # Cross-vertical tests
      - run: npm test tests/auth-cross-vertical.test.ts
      
      # Upload coverage
      - uses: codecov/codecov-action@v3
```

---

## Testing Matrix

### Verticals to Test

| Vertical | Test | Status |
|----------|------|--------|
| notice-respond | Login/Register | ⏳ |
| appeal-mail | Login/Register | ⏳ |
| immigration-mail | Login/Register | ⏳ |
| benefits-appeal | Login/Register | ⏳ |
| dispute-mail | Login/Register | ⏳ |
| private-office | Login/Register | ⏳ |
| code-enforcement | Login/Register | ⏳ |
| insurance-claims | Login/Register | ⏳ |
| mailmypdf-core | Dashboard Access | ⏳ |

### Auth Methods to Test

| Method | Test | Status |
|--------|------|--------|
| Email/Password | SignUp, SignIn, Logout | ⏳ |
| Magic Link | Send link, Click link, Auth | ⏳ |
| Password Reset | Reset flow, Token validation | ⏳ |
| Session Persistence | LocalStorage, Auto-restore | ⏳ |
| Token Refresh | Expired token handling | ⏳ |
| Cross-Vertical | Token valid everywhere | ⏳ |
| Real-time Updates | Auth state change notifications | ⏳ |
| Role-Based Access | Customer vs Admin vs SuperAdmin | ⏳ |

---

## Key Auth Flows

### Happy Path: Registration

```
User visits vertical
  ↓
Clicks "Sign Up"
  ↓
Enters email/password
  ↓
System creates Supabase user
  ↓
Email verification sent
  ↓
User clicks email link
  ↓
Session created
  ↓
Redirected to dashboard
  ↓
Can access all verticals
```

### Happy Path: Login

```
User visits any vertical
  ↓
Clicks "Sign In"
  ↓
Enters email/password
  ↓
Supabase verifies credentials
  ↓
Session created
  ↓
Access token issued
  ↓
Redirected to dashboard
  ↓
Token valid across all verticals
  ↓
Can access core dashboard
```

### Happy Path: Cross-Vertical Access

```
User logs in at notice-respond
  ↓
Redirected to dashboard
  ↓
User navigates to appeal-mail
  ↓
System checks access token
  ↓
Token valid (from Supabase)
  ↓
No re-login needed
  ↓
User context loads
  ↓
Access allowed
```

---

## Troubleshooting

### User Not Persisting on Refresh

**Check:**
1. Supabase URL configured
2. Anon key configured
3. `persistSession: true` set
4. Browser localStorage enabled
5. Check browser console for errors

**Fix:**
```typescript
// Ensure this in auth.tsx
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true
}
```

### Cross-Vertical Auth Not Working

**Check:**
1. All verticals use same Supabase project
2. Access tokens issued correctly
3. API endpoints accept Authorization header
4. Token validation on backend

**Fix:**
```typescript
// Ensure consistent Supabase init
const client = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Token Expired

**Check:**
1. Token refresh mechanism working
2. Refresh token available
3. Supabase session valid

**Fix:**
```typescript
// Token auto-refreshes when expired
// If manual refresh needed:
const { data, error } = await client.auth.refreshSession()
```

---

## Success Criteria

- [ ] All verticals authenticate users independently
- [ ] Users authenticated in one vertical work in all others
- [ ] Cross-vertical tokens valid for API calls
- [ ] Sessions persist across tab/page refreshes
- [ ] Tokens auto-refresh before expiry
- [ ] Real-time auth state changes sync
- [ ] Role-based access working
- [ ] Magic link authentication functional
- [ ] Password reset workflow functional
- [ ] Sign out clears all sessions
- [ ] No auth leakage between users
- [ ] Performance acceptable (<500ms login)

---

## Deployment Checklist

Before going to production:

- [ ] All auth tests passing
- [ ] Cross-vertical testing completed
- [ ] Load test with 100+ concurrent users
- [ ] Email verification working
- [ ] Magic links functional
- [ ] Password reset operational
- [ ] Token refresh working
- [ ] Session timeout configured
- [ ] Monitoring/alerting set up
- [ ] Error logging enabled
- [ ] Security review completed
- [ ] HTTPS enforced everywhere

---

## References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Auth Context Implementation: `src/lib/auth.tsx` (each vertical)
- Owner Context: `src/platform/owner-context.ts`
- API Guards: `src/lib/auth-guard.ts` (each vertical)

---

**Status: READY FOR FULL TESTING**

All verticals share unified authentication system. Authenticated users automatically authenticated across all verticals via Supabase.

Next: Run full test matrix across all verticals.
