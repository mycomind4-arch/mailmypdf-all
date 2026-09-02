# Next Session Checklist

## Priority 1: Unblock Build (1 hour)

- [ ] Fix `apps/verticals/notice-respond/src/domain/draft-versioning.ts:7`
  - Error: Cannot resolve `@/platform/payment-fulfillment`
  - Check if file exists or if import path is wrong
  - May need to create stub or fix reference

**Verification:**
```bash
pnpm --filter "notice-respond" build
```

Should complete without errors.

---

## Priority 2: Database Setup (2-3 hours)

### Create Supabase Migration

**File to create:** `apps/verticals/notice-respond/supabase/migrations/001_workflow_runs.sql`

```sql
-- Workflow runs table (durable execution state)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  matter_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running|paused|blocked|completed|failed
  current_step TEXT,
  completed_stages TEXT[] DEFAULT '{}',
  stage_results JSONB DEFAULT '[]',
  pipeline_result JSONB,
  error_message TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT owner_not_empty CHECK (owner_id != ''),
  CONSTRAINT matter_not_empty CHECK (matter_id != '')
);

-- Indexes for queries
CREATE INDEX idx_workflow_runs_owner_id ON workflow_runs(owner_id);
CREATE INDEX idx_workflow_runs_matter_id ON workflow_runs(matter_id);
CREATE INDEX idx_workflow_runs_owner_matter ON workflow_runs(owner_id, matter_id);

-- RLS policies
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only see their own runs
CREATE POLICY "Users can read own workflow runs"
  ON workflow_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can update own workflow runs"
  ON workflow_runs
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access"
  ON workflow_runs
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Verify:**
```bash
supabase migrations push
```

---

## Priority 3: Run E2E Test (1-2 hours)

Once build is fixed:

```bash
node --test "apps/verticals/notice-respond/tests/cp2000-factory-e2e.test.ts"
```

**Expected output:**
```
✓ CP2000 factory integration — full pipeline
  - Executed 19 stages
  - Final status: ready_for_review
  - Draft produced: 500+ words

✓ CP2000 factory — workflow run persistence
✓ CP2000 factory — dependency invalidation

3 tests passed
```

---

## Priority 4: Refactor CP2000 Route (2-3 hours)

**File to modify:** `apps/verticals/notice-respond/src/routes/workflows/cp2000-response.tsx`

**Current pattern (lines ~70-100):**
```typescript
const buildGoldStandardPipeline = useCallback((extraction: CP2000Extraction) => {
  let case_ = createCP2000Case(extraction);
  const discrepancies = analyzeCP2000Discrepancies({ extraction });
  // ... manual wiring of 12+ steps
}, []);
```

**New pattern:**
```typescript
import { runConfiguredPipeline } from "@mailmypdf/workflows";
import { cp2000DomainPack } from "@/platform/cp2000-factory-adapter";
import { SupabaseWorkflowRunRepository } from "@/platform/workflow-run-persistence";

const handleAnalyze = useCallback(async (document: DocumentUpload) => {
  // 1. Create workflow run
  const repo = new SupabaseWorkflowRunRepository();
  const run = await repo.create({
    ownerId: currentUser.id,
    matterId: matter.id,
    workflowId: "cp2000-response",
    pipelineId: "P02_OFFICIAL_RESPONSE",
  });

  // 2. Execute through factory
  const result = await runConfiguredPipeline(
    run.id,
    "P02_OFFICIAL_RESPONSE",
    cp2000DomainPack,
    { documents: [{ rawText: text }] }
  );

  // 3. Save results
  await repo.setPipelineResult(
    currentUser.id,
    run.id,
    run.version,
    result
  );

  // 4. Display results to user
  return result;
}, []);
```

**Delete lines:** ~70-120 (duplicate manual pipeline)

**Tests:**
```bash
pnpm --filter "notice-respond" build
node --test "tests/cp2000-factory-e2e.test.ts"
```

---

## Priority 5: Test Save/Resume (1-2 hours)

**Test scenario:**
1. Start CP2000 workflow
2. Upload document
3. Run analysis (factory executes)
4. Close browser
5. Reopen workflow
6. Verify state is loaded from database
7. Continue from where it left off

**Code needed:**
```typescript
useEffect(() => {
  if (matterId && workflowId) {
    // Load any existing workflow run
    const repo = new SupabaseWorkflowRunRepository();
    repo.getByMatter(userId, matterId).then(runs => {
      if (runs.length > 0) {
        const latest = runs[0];
        // Restore state from database
        setWorkflowRunId(latest.id);
        if (latest.pipelineResult) {
          // Display saved results
        }
      }
    });
  }
}, [matterId, workflowId, userId]);
```

---

## Useful Files

**Reference implementations:**
- `apps/verticals/private-office/src/services/supabase-matter-repository.ts` — Matter persistence pattern
- `apps/verticals/private-office/src/domain/matter-repository.ts` — Repository interface
- `packages/workflows/src/configured-pipeline.ts` — Pipeline executor reference

**Factory documentation:**
- `docs/WORKFLOW_FACTORY_INTEGRATION.md` — Architecture patterns
- `docs/CANONICAL_COMPONENTS.md` — Reuse policy
- `CP2000_FACTORY_INTEGRATION_REPORT.md` — This session's work

**Project memory:**
- `~/.claude/projects/.../memory/mailmypdf-factory-architecture.md` — Key design decisions
- `~/.claude/projects/.../memory/mailmypdf-factory-reality.md` — Gap analysis

---

## Success Criteria

After completing this checklist:

- [ ] notice-respond builds without errors
- [ ] E2E test passes (all stages execute)
- [ ] CP2000 uses factory runtime (not manual pipeline)
- [ ] Save/resume works (browser close/reopen)
- [ ] All tests pass
- [ ] CP2000 generates professional drafts through factory

---

## Red Flags to Watch

1. **Build fails with missing dependencies** → Check pnpm-lock.yaml, may need fresh install
2. **Supabase RLS blocks queries** → Verify policy syntax, check `auth.uid()` vs owner_id format
3. **Domain pack returns wrong stage name** → Factory validates stage names, must match exactly
4. **E2E test shows "blocked" status** → Validation failed; check extraction data
5. **Route still calls extractCP2000() directly** → Means you missed removing old code

---

## Quick Start

```bash
# Install deps (if fresh)
pnpm install --frozen-lockfile

# Fix build
# [Edit draft-versioning.ts import path]

# Build
pnpm --filter "@mailmypdf/workflows" --filter "notice-respond" build

# Set up DB
supabase migrations push

# Run test
node --test "apps/verticals/notice-respond/tests/cp2000-factory-e2e.test.ts"

# Refactor route
# [Edit cp2000-response.tsx to use runConfiguredPipeline]

# Final test
pnpm --filter "notice-respond" build
```

---

**Total estimated time:** 6-8 hours  
**Difficulty:** Medium (straightforward refactoring)  
**Dependency:** Supabase credentials for live testing

Good luck! The factory is ready to ship. 🚀
