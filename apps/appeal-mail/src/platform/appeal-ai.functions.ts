import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { analyzeDeniedClaim, draftDeniedClaim, validateDeniedClaim } from './control-plane-ai';

const input = z.object({ documentText: z.string().min(20).max(120000), facts: z.record(z.string(), z.string()).default({}), objective: z.string().max(10000).default('') });

export const runDeniedClaimAI = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const analysis = await analyzeDeniedClaim(data);
    if (analysis.result.blockingIssues?.length) return { analysis, draft: null, validation: { valid: false, issues: analysis.result.blockingIssues }, blocked: true };
    const draft = await draftDeniedClaim({ analysis: analysis.result, workflowFacts: data.facts, objective: data.objective });
    const validation = await validateDeniedClaim({ analysis: analysis.result, draft: draft.draft });
    return { analysis, draft, validation: validation.validation, validationProvider: validation.provider, validationModel: validation.model, blocked: !validation.validation?.valid };
  });
