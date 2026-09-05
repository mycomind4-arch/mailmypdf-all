import { z } from "zod";
import type { AuthenticatedUserContext } from "./auth.server";
import { CaseError, loadCase } from "./case.server";
import { resolveCaseWorkflow } from "./workflow-runtime";

const bounded = (max: number) => z.string().trim().max(max);
const optionalBounded = (max: number) => bounded(max).optional().default("");
const sharedNoticeIdentity = {
  taxpayerName: bounded(200).min(1),
  ssnOrItin: bounded(20).min(1),
  taxpayerAddress: bounded(800).min(1),
  returnAddress: optionalBounded(800),
};
const cp14Input = z.object({
  ...sharedNoticeIdentity,
  taxYear: bounded(20).min(1),
  responseMode: z.enum(["pay", "dispute", "request-arrangement", "request-oic", "request-cnc"]),
  amountDisputed: optionalBounded(100),
  monthlyPayment: optionalBounded(100),
  paymentStartDate: optionalBounded(40),
  firstTimeAbateConfirmed: z.boolean().default(false),
  penaltyReliefBasis: optionalBounded(3000),
  userFacts: optionalBounded(12000),
  requestedOutcome: optionalBounded(2000),
});
const cp2000Input = z.object({
  ...sharedNoticeIdentity,
  taxYear: bounded(20).min(1),
  responseMode: z.enum(["agree", "disagree", "partial-agreement"]),
  disputedItems: optionalBounded(6000),
  correctedAmounts: optionalBounded(4000),
  evidenceByItem: optionalBounded(6000),
  userFacts: optionalBounded(12000),
});

export type NoticeResponseInput = z.infer<typeof cp14Input> | z.infer<typeof cp2000Input>;

export function validateCaseInput(workflowId: string, value: unknown): NoticeResponseInput {
  const schema = workflowId === "cp14-response" ? cp14Input : workflowId === "cp2000-response" ? cp2000Input : null;
  if (!schema) throw new CaseError("This workflow does not accept notice-response inputs");
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new CaseError("The workflow information is incomplete or invalid");
  return parsed.data as NoticeResponseInput;
}

export async function saveCaseInput(
  caseId: string,
  value: unknown,
  context: AuthenticatedUserContext,
): Promise<number> {
  const workflowCase = await loadCase(caseId, context);
  resolveCaseWorkflow(workflowCase.workflow_id, workflowCase.vertical_id);
  const input = validateCaseInput(workflowCase.workflow_id, value);
  const { data: latest, error: latestError } = await context.supabase
    .from("workflow_case_inputs")
    .select("version")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new CaseError("Unable to read workflow information");
  const version = (latest?.version ?? 0) + 1;
  const { error } = await context.supabase.from("workflow_case_inputs").insert({
    case_id: caseId,
    owner_id: context.user.id,
    version,
    input: input as unknown as never,
  });
  if (error) throw new CaseError("Unable to save workflow information");
  return version;
}

export async function loadLatestCaseInput(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<{ version: number; input: NoticeResponseInput } | null> {
  const workflowCase = await loadCase(caseId, context);
  resolveCaseWorkflow(workflowCase.workflow_id, workflowCase.vertical_id);
  const { data, error } = await context.supabase
    .from("workflow_case_inputs")
    .select("version, input")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new CaseError("Unable to read workflow information");
  if (!data) return null;
  return { version: data.version, input: validateCaseInput(workflowCase.workflow_id, data.input) };
}
