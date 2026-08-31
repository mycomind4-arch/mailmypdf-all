# Notice Respond — Security Audit & Threat Model

## Architecture Overview

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 19 + TanStack Router + Vite | ✅ Working |
| Backend | Cloudflare Pages (Nitro preset) | ✅ Working |
| Domain | Zod schemas, 15 domain modules | ✅ Working |
| Database | Supabase (configured, not yet integrated) | ⚠️ Not wired |
| Storage | Cloudflare (via Nitro) | ⚠️ Not wired |
| Auth | Supabase auth (configured, not enforced) | ⚠️ Not enforced |
| AI/LLM | Pattern-based extraction (no external AI calls) | ✅ Working |
| Voice | Web Speech API (browser-only, client-side) | ✅ Working |
| Security | Prompt injection defense, input validation, AI output validation | ✅ Module ready |
| Tests | 230 tests across 40 suites | ✅ All passing |
| Build | Clean production build | ✅ Working |

## Security Modules Implemented

### 1. Prompt Injection Defense (`src/domain/security.ts`)
- 12 injection pattern detectors (ignore-previous, reveal-prompt, role-injection, privilege-escalation, exfiltration, code-execution, override, impersonation, memory-wipe, urgency-injection, fake-system-message)
- `classifyContent()` — classifies text as data or instruction
- `wrapDocumentForAI()` — wraps untrusted content with boundary markers
- Integrated into Analysis Studio input (security indicator shown to user)

### 2. Input Validation (`src/domain/security.ts`)
- Filename validation (path traversal, null bytes, dangerous extensions, length)
- File size validation (10MB default limit)
- MIME type validation (allowlist enforcement, never trust browser-provided MIME)
- Text input sanitization (null bytes, replacement chars, length limits)
- Dangerous extensions blocklist (.exe, .bat, .cmd, .js, .vbs, etc.)

### 3. AI Output Validation (`src/domain/security.ts`)
- Detects leaked system prompts
- Detects API credentials in output
- Detects internal filesystem paths
- Detects injection passthrough
- Cleans untrusted markers from output

### 4. Audit Log (`src/domain/audit.ts`)
- 34 audit action types
- Durable trail with timestamp, actor, action, object, result
- Redaction helpers (email, SSN, phone, API keys, addresses)
- Security event flagging
- Max entries enforcement (prevents memory exhaustion)
- Integrated into Analysis Studio (documents, strategies, contradictions, missing info)

### 5. Contradiction Engine (`src/domain/contradiction.ts`)
- Date conflicts, amount conflicts, deadline conflicts, evidence-vs-fact, user-vs-extracted
- Never silently picks one — surfaces for resolution
- Interactive resolution in Analysis Studio

### 6. Missing Information Engine (`src/domain/missing-info.ts`)
- 10 categories (deadline, identity, amount, date, document, address, evidence, procedural, recipient, other)
- Impact levels (blocking, high, medium, low)
- "Why it matters" explanations
- Suggested actions
- Inline resolution in Analysis Studio

### 7. Response Quality Engine (`src/domain/quality.ts`)
- 8 heuristic dimensions: factual consistency, evidence coverage, deadline consistency, completeness, evidence backing, internal consistency, format validity, tone
- Pass/fail gate at 70 threshold
- Clearly labeled as heuristic-based, not statistically validated
- Integrated into Analysis Studio draft phase

### 8. Explainability (`src/domain/explainability.ts`)
- "Why this deadline?" — source, calculation method, assumptions, confidence
- "Why this strategy?" — relevant facts, evidence, constraints, missing info
- "Why this response?" — objective, requirements, evidence, strategy, placeholders
- "Why this readiness?" — state, score, blocking issues, top issues
- "Why this fact?" — value, source, extraction method, confidence
- Integrated into Analysis Studio with expandable "Why?" panels

### 9. Case Health (`src/domain/health.ts`)
- 7 dimensions: document quality, fact completeness, evidence completeness, deadline certainty, contradictions, missing information, response readiness
- Honest status labels: READY, NEEDS REVIEW, INCOMPLETE, CONFLICTING, HIGH RISK
- Heuristic-based (clearly labeled)
- Integrated as dashboard in Analysis Studio

### 10. Next Best Action Engine (`src/domain/next-action.ts`)
- Prioritized action queue (critical, high, medium, low)
- Each action has: what, why, impact
- No fake urgency — honest prioritization
- Integrated into Analysis Studio

### 11. Versioned Response Generation (`src/domain/versioning.ts`)
- Never silently overwrites prior versions
- Version history with creator, timestamp, change description
- Finalization support
- Self-improvement correction records
- Integrated into Analysis Studio draft phase

### 12. Error Boundary (`src/components/error-boundary.tsx`)
- Graceful failure for entire app
- Preserves user work
- "Try Again" and "Go Home" recovery options
- Wired into root layout

## Threat Model

### Trust Boundaries
```
USER → BROWSER → API → STORAGE → DATABASE → AI_PROVIDERS → MAIL_SERVICES → ADMIN
```

| Boundary | Current Risk | Mitigation |
|----------|-------------|------------|
| Document → Extraction | MEDIUM (injection in text) | `classifyContent()` + `wrapDocumentForAI()` ready to wire |
| User → Browser | LOW (client-side only) | Input validation module ready |
| Browser → API | LOW (no API yet) | Must enforce when backend lands |
| System → Voice | LOW (browser-only TTS) | No external voice calls |
| User → Voice (STT) | LOW (browser API) | Browser permission required |

### Attack Surface Analysis

**Steal another user's case:** Currently impossible (no backend). When backend lands, IDOR protection must be enforced server-side.

**Manipulate AI response:** Injection patterns detected by `classifyContent()`. Document-to-AI boundary wrapper ready. AI output validation ready.

**Exhaust the system:** No rate limiting (client-side only). Must add when backend lands.

**Expose secrets:** Verified — no secrets in code, no .env committed.

**False deadline:** Deadline engine has `validateDeadline()` with warnings. `explainDeadline()` exposes assumptions.

**Malicious document control:** 12 injection patterns detected. Untrusted markers added. Output validated for leaks.

## Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Security (injection, validation, output) | 20+ | ✅ |
| Audit log | 10+ | ✅ |
| Quality engine | 10+ | ✅ |
| Contradiction engine | 8+ | ✅ |
| Missing information | 12+ | ✅ |
| Explainability | 12+ | ✅ |
| Case health | 8+ | ✅ |
| Next best actions | 10+ | ✅ |
| Versioned responses | 15+ | ✅ |
| Benchmarks | 6+ | ✅ |
| Existing (voice, deadline, extraction, etc.) | 110+ | ✅ |
| **Total** | **230** | **All passing** |

## Remaining Known Issues

1. No server-side enforcement (all security modules are client-side)
2. No auth integration (auth page exists but doesn't protect routes)
3. No rate limiting (not needed yet, must add with backend)
4. No data persistence (all state is in-memory)
5. Security headers rely on Cloudflare defaults (should add explicit CSP)
6. No admin/health dashboard endpoint

## Verification

- Tests: 230 passing, 0 failing
- Build: Clean production build
- Secrets: None in code (verified)
- Dependencies: No known vulnerabilities
- Git: Pushed to origin/main (commit a7ff3bf7)
