# Workflow Factory — Adding New Notice Types

Notice Respond uses a **catalog-driven architecture** for workflows. Adding a new notice type (e.g., CP504, state tax assessment, court summons) requires three layers:

1. **Domain logic** — extraction, classification, draft generation
2. **Catalog entry** — metadata, UX config, validation rules
3. **Route** — React component using the workflow runtime

## Architecture Overview

```
src/domain/
  workflow-catalog.ts    ← Single source of truth for all workflows
  workflow-runtime.ts    ← State machine: createWorkflowState, advanceStep, canAdvance
  workflow-adapter.ts    ← Legacy adapter (workflows.ts re-exports from catalog)
  draft-validator.ts     ← Independent validation pass on generated drafts
  notice-type.ts         ← Classification patterns for auto-detecting notice type
  cp2000.ts              ← CP2000-specific extraction & draft generation
  fact.ts                ← Fact type: source-tracked claims with confidence levels

src/routes/workflows/
  irs-notice.tsx         ← Generic IRS workflow (manual form entry)
  cp2000-response.tsx   ← CP2000 workflow (auto-extraction + interactive review)
  cp2000-seo.tsx         ← SEO landing page for CP2000
```

## Adding a New Notice Type

### 1. Add Classification Patterns

In `src/domain/notice-type.ts`, add the new type to the `NoticeType` union and `CLASSIFICATION_PATTERNS`:

```typescript
export type NoticeType =
  | "irs_cp2000"
  | "irs_cp14"
  | "irs_cp504"
  | "your_new_type"  // ← add here
  | ...

// Add to CLASSIFICATION_PATTERNS array (order matters: specific before generic)
{
  type: "your_new_type",
  patterns: [/pattern1/i, /pattern2/i],
  minMatches: 1,
}
```

**Key rule:** Generic types (`irs_letter`, `agency_action`, `other`) are automatically deprioritized by the classifier. Specific types always win over generic ones.

### 2. Create Domain Logic

Create `src/domain/your-type.ts` with:

- `extractYourType(text: string): ExtractionResult` — extract notice number, dates, amounts
- `generateYourTypeDraft(params: DraftParams): string` — generate response letter
- Use clear section headers in the draft that match the `requiredSections` in the catalog

```typescript
export function generateYourTypeDraft(params: {
  noticeNumber: string;
  taxYear: string | null;
  responseDeadline: string | null;
  userFacts: string;
  userObjective: string;
}): string {
  const lines = [
    `Notice reference number: ${params.noticeNumber || "[Notice Number]"}`,
    params.taxYear ? `Tax year: ${params.taxYear}` : "",
    // ... more fields
    "",
    "Mismatch explanation:",  // ← must match requiredSections in catalog
    params.userFacts || "[Explain here]",
    "",
    "Requested correction:",  // ← must match requiredSections in catalog
    params.userObjective || "[State what you want]",
    "",
    "Supporting records list:",
    "  [LIST DOCUMENTS]",
    "",
    "Attachments:",
    "  [LIST ATTACHMENTS]",
  ];
  return lines.filter((l) => l !== "").join("\n");
}
```

**Critical:** Section headers in the draft must contain the exact text from `ux.requiredSections` in the catalog entry. The validator checks for these strings.

### 3. Add Catalog Entry

In `src/domain/workflow-catalog.ts`, add a new entry with steps, UX config (reviewChecks, requiredSections, disclaimerText), SEO metadata (title, description, keywords, faqs), and validation rules.

### 4. Create the Route

Create `src/routes/workflows/your-workflow.tsx` using the runtime API:

```typescript
const definition = getWorkflowById("your-workflow-id");
const [state, setState] = useState(() => createWorkflowState(definition));
```

Render step content based on `state.phase`, use `canAdvance(state, definition)` for gating, and `advanceStep`/`retreatStep` for navigation.

### 5. Add an SEO Landing Page (Optional)

Create `src/routes/workflows/your-workflow-seo.tsx` for search engine indexing with FAQs and internal links.

### 6. Write Tests

Create `tests/your-workflow.test.mjs` covering classification, extraction, draft generation, validation, and state transitions.

## Runtime API Reference

- `createWorkflowState(def)` — initial state at step 0
- `advanceStep(state, def)` — move to next step
- `retreatStep(state, def)` — move to previous step
- `goToStep(state, def, index)` — jump to a specific step
- `canAdvance(state, def)` — check if user can proceed (gates: facts required, objective required, draft non-empty, all review checks checked, recipient address complete)
- `setUserFacts(state, text)` / `setUserObjective(state, text)` — set fields
- `setDraft(state, text)` — set draft text
- `setReviewChecks(state, checks)` — set review checks array
- `setMailing(state, mailing)` — set mailing configuration

## Draft Validator

`validateDraft(draft, facts, definition, expectations?)` performs:

- **Section check**: each `requiredSection` must appear in the draft
- **Fact check**: each fact's value must appear in the draft
- **Amount/date check**: amounts and dates from facts must appear
- **Notice number/tax year/deadline check**: if expectations provided, must match
- **Length check**: draft must be at least `minDraftLength` characters
- **Forbidden behavior check**: no "I don't know", "I can't", etc.

Returns `{ passed, errors, warnings, findings }` where `findings` is an array of `{ check, passed, severity, detail }`.

## Key Patterns

### Specific vs Generic Classification
The classifier boosts specific types by +0.3 confidence and filters out generic types when any specific type matches. This prevents "IRS" in a CP2000 notice from classifying as generic `irs_letter`.

### Extraction Pattern Design
- Require `$` signs before amounts to avoid matching form numbers (W-2, 1099)
- Use multiple patterns per field — first match wins
- Test with real notice text, not synthetic examples

### Draft Section Headers
The validator does literal substring matching. Section headers in the draft must contain the exact text from `requiredSections`. Use "Mismatch explanation:" not "Explanation of the mismatch:".

## Testing Checklist

- [ ] Classification: correct type for sample text
- [ ] Extraction: all fields extracted correctly
- [ ] Draft: contains all required sections
- [ ] Validation: well-formed draft → 0 errors
- [ ] Validation: missing section → error finding
- [ ] State: canAdvance gates work at each step
- [ ] State: step navigation (forward, back, jump)
- [ ] Build: `npm run build` succeeds
- [ ] All tests: `npm test` passes
