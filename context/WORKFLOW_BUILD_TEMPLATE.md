# Workflow Builder Template

## Quick Start

The `administrative-hearing-notice-response` workflow is now a complete, reusable template for building new workflows quickly. It demonstrates the shared-component pattern that makes it easy to build more workflows.

## File Structure

Each workflow directory contains 5 key files that you copy from the template and customize:

```
workflow-name/
├── config.ts                   # Landing page & SEO configuration
├── manifest.ts                 # Workflow metadata & profile
├── domain.ts                   # Business logic & validation rules
├── extraction-schema.ts        # AI extraction field definitions
├── definition.ts               # Component bundler (usually unchanged)
├── index.tsx                   # Route mount (auto-wired, usually unchanged)
├── schema.ts                   # SEO schema (auto-wired, usually unchanged)
├── seo.ts                      # SEO metadata (auto-wired, usually unchanged)
└── start/                      # Start page (optional for v2, needs implementation)
    ├── .gitkeep               # (placeholder until runtime UI is built)
```

## Step-by-Step Guide

### 1. Copy the Template

```bash
cp -r notice-respond/workflows/administrative-hearing-notice-response \
      notice-respond/workflows/your-new-workflow
```

### 2. Update `config.ts`

Replace the workflow metadata with yours:

```typescript
export const workflowConfig = {
  id: "your-workflow-id",              // unique identifier
  title: "Your Workflow Title",
  seoTitle: "Your Workflow Title | Notice Respond | MailMyPDF",
  seoDescription: "One-line description for SEO...",
  heroTitle: "User-facing headline",
  heroDescription: "2-3 sentence description of what this workflow does",
  
  // What users accomplish with this workflow
  whatYouDo: [
    "First step description",
    "Second step description",
    // ... typically 3-4 items
  ],
  
  // Materials users need to gather first
  whatYouNeed: [
    "Item 1 they need",
    "Item 2 they need",
    // ... typically 4 items
  ],
  
  // What users keep control of
  outputs: [
    "Output 1",
    "Output 2",
    "Output 3",
  ],
  
  // Frequently asked questions (pairs of [question, answer])
  faqs: [
    ["Question 1?", "Answer 1..."],
    ["Question 2?", "Answer 2..."],
  ],
  
  // Workflow step breakdown
  workflowSteps: [
    ["Upload document", "Add the source document"],
    ["Analyze", "Extract and confirm key details"],
    ["Build response", "Prepare correspondence"],
    ["Review", "Verify the complete packet"],
    ["Submit", "Mail or file the response"],
  ],
  
  // What users should have ready
  readyItems: [
    ["Document title", "Document description"],
    ["Evidence type", "What evidence to gather"],
  ],
} as const
```

**Key rules:**
- `id` must be unique, lowercase with hyphens
- `indexable: true` makes it searchable (use false for scaffolds)
- `contentStatus: "published"` for completed, "scaffold" for incomplete
- All arrays should be 3-5 items for balance
- FAQs must be pairs: [question, answer]

### 3. Update `manifest.ts`

Set the workflow metadata:

```typescript
export const myWorkflowManifest = {
  workflowId: "your-workflow-id",
  workflowName: "Your Workflow Name",
  workflowType: "notice-response",    // or "document-prep", "request", etc.
  category: "legal-notice",           // or "government", "financial", etc.
  version: "1.0",
  description: "What this workflow does...",
} as const
```

**Common workflowType values:**
- `notice-response` - Responding to notices or demands
- `document-prep` - Preparing documents
- `request-response` - Responding to requests
- `filing` - Filing documents with agencies

### 4. Update `domain.ts`

Define the business logic:

```typescript
export const myWorkflowDomain = {
  workflowId: "your-workflow-id",
  name: "Your Workflow Name",
  description: "What this workflow validates and controls...",
  extractionSchemaIds: ["your-extraction-schema-id"],
  
  // Validation rules (errors = block submission, warnings = alert user)
  validationRules: [
    {
      rule: "deadline_must_be_future",
      description: "Deadline must be in the future",
      severity: "error",
    },
    {
      rule: "evidence_is_relevant",
      description: "Evidence should relate to the case",
      severity: "warning",
    },
  ],
  
  // Readiness checks (all required items before submission)
  readinessChecks: [
    {
      check: "notice_provided",
      description: "Source notice or document is uploaded",
      required: true,
    },
    {
      check: "details_confirmed",
      description: "Key dates and facts confirmed",
      required: true,
    },
  ],
  
  // Possible dispute grounds or response types
  grounds: [
    { id: "factual", label: "Factual Dispute", description: "..." },
    { id: "legal", label: "Legal Challenge", description: "..." },
  ],
  
  // Response options available to users
  responseOptions: [
    { id: "opt1", label: "Option 1", description: "..." },
    { id: "opt2", label: "Option 2", description: "..." },
  ],
  
  // What the final output package must include
  outputPackageContents: [
    { item: "Response letter", required: true },
    { item: "Evidence packet", required: true },
  ],
} as const
```

### 5. Update `extraction-schema.ts`

Define what fields AI should extract from documents:

```typescript
export const myExtractionSchema = {
  schemaId: "your-extraction-schema-id",
  schemaVersion: "1.0",
  noticeType: "notice_type_name",
  extractionFields: {
    fieldName: {
      description: "What this field represents",
      required: true,      // or false if optional
      dataType: "string",  // or "date", "datetime", "number", "currency", etc.
    },
    deadline: {
      description: "When the response is due",
      required: true,
      dataType: "date",
    },
    // ... more fields as needed
  },
  instructions: "Overall guidance for AI extraction",
  examples: [
    {
      field: "deadline",
      example: "December 15, 2024",
    },
  ],
} as const
```

### 6. Verify & Commit

```bash
# Type check
npx tsc --noEmit

# Build
cd mailmypdf && pnpm run build

# If both pass, commit:
git add notice-respond/workflows/your-new-workflow/
git commit -m "feat: build your-workflow-name from shared components"
```

## What Auto-Wires

These files should NOT need changes - they auto-wire via shared components:

- **index.tsx** - Uses `WorkflowLandingPage` component with your `config.ts`
- **schema.ts** - Auto-generates SEO schema from `config.ts`
- **seo.ts** - Auto-generates SEO headers from `config.ts`
- **definition.ts** - Bundles your manifest, domain, and extraction schema

## Shared Components Reference

### `@mailmypdf/design-system`
- `WorkflowLandingPage` - Renders complete landing page from config
- `SectionLandingPage` - Renders vertical/section landing page from config

### `@mailmypdf/seo`
- `createWorkflowHead()` - Generates SEO metadata from config
- `createWorkflowSchema()` - Generates JSON-LD schema from config
- `createSectionHead()` - Generates section page SEO metadata

### `packages/workflows`
- Notice response domain profiles
- Workflow runtime contracts
- Evidence and ground definitions

## Reusable Patterns

### Config Content Structure

The config file is the "source of truth" for landing page content. Every section that appears on the landing page comes from one of these config arrays:

| Config Field | Landing Page Section | Min Items | Max Items |
|---|---|---|---|
| `whatYouDo` | "What this workflow helps you do" | 3 | 5 |
| `whatYouNeed` | "What to have ready" | 4 | 5 |
| `outputs` | "What you keep control of" | 3 | 4 |
| `workflowSteps` | "How it works" | 4 | 6 |
| `readyItems` | "Before you start" (with icons) | 3 | 4 |
| `faqs` | "Common questions" (expandable) | 2 | 8 |
| `workflowSteps` | "Step by step" process flow | 4 | 6 |

### Naming Conventions

- **Workflow IDs**: `lowercase-with-hyphens`, e.g. `cp14-response`, `benefits-appeal`
- **Schema IDs**: `lowercase-with-hyphens-analysis`, e.g. `cp14-notice-analysis`
- **Ground IDs**: `lowercase_with_underscores`, e.g. `dispute_facts`
- **Check IDs**: `lowercase_with_underscores`, e.g. `notice_provided`

### Validation Severity Levels

- **error** - Blocks workflow completion, must be resolved
- **warning** - Alerts user but allows continuation
- **info** - Informational only, no block

## FAQ Patterns

Good FAQ pairs follow this pattern:

**Q**: Question your users ask (use natural language, include question mark)
**A**: Direct answer that references the workflow's features

Examples:
```typescript
[
  "What is a CP14 notice?",
  "A CP14 is the first notice the IRS sends when its records show you have an unpaid balance...",
],
[
  "Can I appeal this?",
  "Yes. This workflow lets you organize your response path and supporting evidence...",
],
```

## Testing the Workflow

After creating your workflow:

```bash
# Check the landing page renders
npx wrangler dev --config mailmypdf/.output/server/wrangler.json

# Navigate to your workflow
# http://localhost:8787/notice-respond/workflows/your-workflow-id
```

The landing page should render with:
- ✅ Proper title in browser tab
- ✅ All sections from your config (steps, FAQs, ready items)
- ✅ Proper card styling and layout
- ✅ SEO metadata in page source

## Next Steps After Landing Page

Once the landing page is complete and working:

1. **Start Page Implementation** (optional for v2)
   - Create `start/index.tsx` with workflow UI
   - Implement data intake forms
   - Wire up to workflow runtime

2. **Acceptance Testing**
   - Register workflow in `packages/workflow-acceptance/registry/workflows.json`
   - Add test fixtures in `workflows/$id/tests/acceptance/`
   - Run `node packages/workflow-acceptance/bin/studio.mjs workflow test $id --fixture $scenario`

3. **Make It SEO-Complete**
   - Set `indexable: true` in config
   - Set `contentStatus: "published"`
   - Add to sitemap (auto-wired if indexable)
   - Verify appears in `/sitemap.xml`

## Troubleshooting

**Types not found?**
- Ensure you're using the correct property names (check the template)
- Run `npx tsc --noEmit` to see exact errors
- Check that you're using `as const satisfies WorkflowLandingConfig` in config.ts

**Landing page not rendering?**
- Verify the route path in config matches the directory structure
- Check browser console for JavaScript errors
- Ensure `mailmypdf/src/routes/notice-respond/workflows/` mount exists

**SEO metadata missing?**
- Confirm `seoTitle` and `seoDescription` are in config
- Run `pnpm run build` to regenerate SEO files
- Check page source: `view-source` in browser shows `<title>` and `<meta>` tags

**Build fails?**
- Run `npx tsc --noEmit` to find type errors
- Check that all required config fields are present
- Ensure config satisfies `WorkflowLandingConfig` type

## Example: Minimal Workflow

Here's the bare minimum to get a workflow landing page working:

```typescript
// config.ts - ONLY this is strictly required
export const workflowConfig = {
  id: "simple-workflow",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/simple-workflow",
  startPath: "/notice-respond/workflows/simple-workflow/start",
  title: "Simple Workflow",
  seoTitle: "Simple Workflow | Notice Respond | MailMyPDF",
  seoDescription: "A simple workflow",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Simple Workflow",
  heroDescription: "Get started with this workflow.",
  indexable: false,
  contentStatus: "scaffold",
  // No whatYouDo, whatYouNeed, etc. = sections won't render (that's OK)
} as const satisfies WorkflowLandingConfig
```

The remaining files (`manifest.ts`, `domain.ts`, `extraction-schema.ts`) are optional for landing page rendering but recommended for completeness.

## See Also

- [Administrative Hearing workflow](../notice-respond/workflows/administrative-hearing-notice-response/) - Complete template
- [CP14 Response workflow](../notice-respond/workflows/cp14-response/) - Full reference implementation
- [FACTORY_STATUS.md](./FACTORY_STATUS.md) - Current workflow progress tracking
