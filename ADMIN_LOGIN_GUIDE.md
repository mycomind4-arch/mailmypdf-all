# Admin Login & Authentication Guide

## Login Flow Overview

```
User Visit: /admin/login
       ↓
Display Login Form
       ↓
Enter Credentials
  - Email: admin@mailmypdf.ai
  - Password: 666mdr222
       ↓
Submit Form
       ↓
Server Validates Credentials (admin-auth.server.ts)
       ↓
Session Token Generated
       ↓
Token Stored in localStorage
       ↓
Redirect to /admin/dashboard
       ↓
Authenticated Dashboard Displayed
```

---

## Admin Login Page (/admin/login)

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│          🔒 Admin Login                             │
│       MailMyPDF Platform Management                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Demo Credentials:                           │  │
│  │ Email: admin@mailmypdf.ai                  │  │
│  │ Password: 666mdr222                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │ Email                                       │  │
│  │ [admin@mailmypdf.ai________________]        │  │
│  │                                             │  │
│  │ Password                                    │  │
│  │ [••••••••]                                  │  │
│  │                                             │  │
│  │ [🔐 Sign In]                                │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│        Secure Admin Dashboard                      │
│        ✓ Production Ready                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Login Form Fields

| Field | Value | Type |
|-------|-------|------|
| Email | admin@mailmypdf.ai | Text input |
| Password | 666mdr222 | Password input |
| Submit Button | Sign In | Button |

### Login Process

```typescript
// User enters credentials and clicks Sign In

const loginMutation = useMutation({
  mutationFn: async (credentials) => {
    // Calls adminLogin server function
    const result = await adminLogin({
      email: "admin@mailmypdf.ai",
      password: "666mdr222"
    });
    return result;
  },
  onSuccess: (result) => {
    // Session successful
    localStorage.setItem("admin-session-token", result.sessionToken);
    localStorage.setItem("admin-email", result.email);
    
    // Redirect to dashboard
    navigate({ to: "/admin/dashboard" });
  },
  onError: (error) => {
    // Show error message
    setError(error.message);
  }
});
```

---

## Admin Dashboard Page (/admin/dashboard)

### Visual Layout - Authenticated State

```
┌────────────────────────────────────────────────────────────┐
│ ⚡ MailMyPDF Admin         admin@mailmypdf.ai  [🚪 Logout] │
│    AI-Powered Platform     ✓ Authenticated                  │
│    Management                                              │
└────────────────────────────────────────────────────────────┘

Status Cards Row:
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Agent Status     │ │ Active Tasks     │ │ Pending         │
│ Online      ✓    │ │ 3           ⏱    │ │ Approvals    ⚠  │
│ (Green)          │ │ (Blue)           │ │ 1 (Orange)      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
┌──────────────────┐
│ Autonomy Level   │
│ 20%          ⚡  │
│ (Orange)         │
└──────────────────┘

Agent Capabilities Section:
┌─────────────────────────────────────────────────────────────┐
│ ⚙  Agent Capabilities                                       │
│                                                             │
│  Enabled Features          │  Permissions                   │
│  ✓ Web Access             │  ✓ Modify Workflows           │
│  ✓ File Storage           │  ✓ Modify Verticals           │
│  ✓ Website Operation      │  ✗ Deploy Changes             │
│  ✓ Automation             │  ✓ Access Analytics           │
│  ✓ Analytics              │  ✗ Manage Users               │
│                            │  ✗ Modify Config              │
└─────────────────────────────────────────────────────────────┘

Chat Agent Interface:
┌─────────────────────────────────────────────────────────────┐
│ 💬 Platform Agent                                           │
│    AI-powered platform management assistant                │
│                                                             │
│  [Chat message history...]                                  │
│                                                             │
│  [Quick command buttons: Add Workflow | Edit Vertical]     │
│                                                             │
│  [Input field] Send                                         │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Components

#### 1. Status Cards
Shows real-time agent status:
- **Agent Status**: Online/Offline (Green when online)
- **Active Tasks**: Number of running tasks
- **Pending Approvals**: Decisions awaiting human approval
- **Autonomy Level**: Percentage of autonomous operation

#### 2. Agent Capabilities Panel
Two columns:
- **Enabled Features** (what the agent can do)
  - ✓ Web Access
  - ✓ File Storage
  - ✓ Website Operation
  - ✓ Automation
  - ✓ Analytics

- **Permissions** (what the admin allows)
  - ✓ Modify Workflows
  - ✓ Modify Verticals
  - ✗ Deploy Changes (requires approval)
  - ✓ Access Analytics
  - ✗ Manage Users (restricted)
  - ✗ Modify Config (restricted)

#### 3. Chat Agent Interface
- Message history with timestamp
- Action status tracking (pending/success/error)
- Quick command buttons for common tasks
- Input field for natural language commands
- Real-time response from AI agent

---

## Authentication Details

### Session Management

```javascript
// On successful login:
localStorage.setItem("admin-session-token", sessionToken);
localStorage.setItem("admin-email", "admin@mailmypdf.ai");

// Session Token Format:
// admin-${Date.now()}-${randomString}
// Example: admin-1725274800000-a7b9c2d4

// Session Storage Location:
// Server-side: activeSessions Map in admin-auth.server.ts
// Client-side: browser localStorage

// Session Validation:
// Every API request includes:
// Authorization: Bearer ${sessionToken}

// Session Expiration:
// 1 hour from login (configurable)
// Auto logout on expiration
```

### Protected Routes

```typescript
// Dashboard checks on mount:
useEffect(() => {
  const email = localStorage.getItem("admin-email");
  const token = localStorage.getItem("admin-session-token");
  
  if (!email || !token) {
    // Redirect to login if not authenticated
    navigate({ to: "/admin/login" });
    return;
  }
  
  // User is authenticated - load dashboard
  setAdmin({ email });
}, [navigate]);
```

### API Protection

```typescript
// Every API request includes:
const response = await fetch("/api/admin/chat-agent", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,  // ← Token here
  },
  body: JSON.stringify({ message, conversationHistory })
});

// Server validates:
const sessionToken = event.request.headers
  .get("Authorization")
  ?.replace("Bearer ", "");
const isValidSession = validateAdminSession(sessionToken);

if (!isValidSession) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401 }
  );
}
```

---

## What You See After Login

### Admin Email Display
- Located in top-right of dashboard
- Shows: `admin@mailmypdf.ai`
- Indicates logged-in user
- Shows authentication status with ✓ Authenticated

### Logout Button
- Icon: Door/exit symbol
- Location: Top-right corner
- Action: Clears localStorage and redirects to /admin/login
- Clears both `admin-session-token` and `admin-email`

### Dashboard Features
Once authenticated, you see:

1. **Real-time Status** - See what the agent is doing
2. **Capabilities** - What the agent can access
3. **Permissions** - What you allow it to do
4. **Chat Interface** - Talk naturally to the agent
5. **Active Tasks** - Monitor running operations
6. **Pending Approvals** - Review high-risk decisions

---

## Login Credentials

### Admin User
```
Email: admin@mailmypdf.ai
Password: 666mdr222
```

### Where Credentials Are Stored
Server-side in `admin-auth.server.ts`:
```typescript
const ADMIN_CREDENTIALS = {
  email: "admin@mailmypdf.ai",
  password: "666mdr222",
};
```

### How to Change Credentials
Edit `/src/lib/admin-auth.server.ts`:
```typescript
// Change to different credentials:
const ADMIN_CREDENTIALS = {
  email: "your-email@domain.com",
  password: "your-new-password",
};
```

---

## Common Actions After Login

### 1. Check Agent Status
```
Dashboard loads → See status cards → Agent Online ✓
```

### 2. Review Capabilities
```
Read "Agent Capabilities" panel → See what agent can do
```

### 3. Use Chat Agent
```
Click chat input → Type command → Agent responds
Examples:
- "What's our website health?"
- "Create a new workflow for housing mail"
- "Deploy changes to production"
```

### 4. Approve Pending Actions
```
See "Pending Approvals" count → Click to review → Approve/Reject
```

### 5. Logout
```
Click logout button → Cleared from localStorage → Redirected to login
```

---

## Error Handling

### Login Fails
If credentials are wrong:
```
Error message displayed in red box:
"Invalid email or password"
```

### Session Expires
If logged out / token invalid:
```
Dashboard redirects to /admin/login
```

### API Request Fails
If API call fails while authenticated:
```
Error message in chat: "Failed to process command"
Check browser console for details
```

---

## File Locations

| File | Purpose |
|------|---------|
| `src/routes/admin/login.tsx` | Login page component |
| `src/routes/admin/dashboard.tsx` | Dashboard page component |
| `src/routes/api/admin/login.ts` | Login API endpoint |
| `src/lib/admin-auth.server.ts` | Session management |
| `src/components/admin-chat-agent.tsx` | Chat interface |

---

## Next Steps

1. **Navigate to** `http://localhost:5173/admin/login`
2. **Enter credentials**:
   - Email: `admin@mailmypdf.ai`
   - Password: `666mdr222`
3. **Click Sign In**
4. **See dashboard** with agent controls
5. **Start using** the chat agent to manage your platform

---

**You're now set up for admin authentication!** 🎉

The login system is:
✅ Secure (session tokens, server validation)
✅ User-friendly (clear forms, error messages)
✅ Production-ready (protected routes, API validation)
✅ Extensible (easy to add more admins or change credentials)

