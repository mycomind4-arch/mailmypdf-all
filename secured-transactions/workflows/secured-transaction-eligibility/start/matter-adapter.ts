import {
  StepWorkflowService,
  assertStepMatterOwner,
  type StepMatterRepository,
  type StepMatterState,
  type StepWorkflowDefinition,
} from "@mailmypdf/step-workflow";
import {
  evaluateSecuredTransactionEligibility,
  type SecuredTransactionEligibilityResult,
} from "../rules/eligibility";
import {
  toEngineInput,
  validateSecuredTransactionEligibilityInput,
  type EligibilityIntakeInput,
} from "../runtime-policy";

export const SECURED_TRANSACTION_ELIGIBILITY_WORKFLOW_ID = "secured-transaction-eligibility";
export const ELIGIBILITY_INTAKE_STEP_ID = "eligibility-intake";

/**
 * One persisted evidence-evaluation step. The guided UI now groups intake
 * into six screens, but all nine gates are still evaluated together. This
 * adapter is not connected to that UI or its local draft files yet.
 */
export const eligibilityStepWorkflowDefinition: StepWorkflowDefinition = {
  id: SECURED_TRANSACTION_ELIGIBILITY_WORKFLOW_ID,
  title: "Secured-Transaction Eligibility",
  steps: [{ id: ELIGIBILITY_INTAKE_STEP_ID, label: "Eligibility evidence intake" }],
};

export interface EligibilityStepData {
  readonly intake: EligibilityIntakeInput;
  readonly engineResult: SecuredTransactionEligibilityResult;
  readonly evaluatedAt: string;
}

function readStepData(state: StepMatterState): EligibilityStepData | null {
  const stepState = state.steps[ELIGIBILITY_INTAKE_STEP_ID];
  const data = stepState?.data;
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (!record.intake || !record.engineResult) return null;
  return record as unknown as EligibilityStepData;
}

/**
 * Thin adapter over the generic StepWorkflowService: owns nothing eligibility
 * engine or persistence-specific itself. Ownership enforcement is the
 * repository's job (StepMatterRepository.get/commit are owner-scoped by
 * contract; the Supabase-backed implementation enforces it server-side via
 * the owner_id-filtered query and RPC). This adapter never trusts a
 * client-supplied ownerId beyond what the caller (the authenticated runtime
 * layer) already resolved.
 */
export class EligibilityMatterAdapter {
  private readonly service: StepWorkflowService;

  constructor(repository: StepMatterRepository) {
    this.service = new StepWorkflowService(repository, {
      [SECURED_TRANSACTION_ELIGIBILITY_WORKFLOW_ID]: eligibilityStepWorkflowDefinition,
    });
  }

  async create(ownerId: string): Promise<StepMatterState> {
    if (!ownerId.trim()) throw new Error("An authenticated owner id is required to create a matter.");
    return this.service.create(ownerId, SECURED_TRANSACTION_ELIGIBILITY_WORKFLOW_ID);
  }

  async load(ownerId: string, matterId: string): Promise<{
    matter: StepMatterState;
    eligibility: EligibilityStepData | null;
  } | null> {
    if (!ownerId.trim()) throw new Error("An authenticated owner id is required to load a matter.");
    const matter = await this.service.get(ownerId, matterId);
    if (!matter) return null;
    assertStepMatterOwner(matter, ownerId);
    return { matter, eligibility: readStepData(matter) };
  }

  /**
   * intake -> runtime validation -> shared eligibility engine ->
   * persisted findings, in one call. Returns the persisted matter and the
   * findings that were just computed and saved.
   */
  async saveIntake(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    rawInput: Record<string, unknown>;
  }): Promise<{ matter: StepMatterState; eligibility: EligibilityStepData }> {
    if (!input.ownerId.trim()) throw new Error("An authenticated owner id is required to save intake.");

    const intake = validateSecuredTransactionEligibilityInput(input.rawInput);
    const engineResult = evaluateSecuredTransactionEligibility(toEngineInput(intake));

    const stepData: EligibilityStepData = {
      intake,
      engineResult,
      evaluatedAt: new Date().toISOString(),
    };

    const matter = await this.service.updateStepData({
      ownerId: input.ownerId,
      matterId: input.matterId,
      expectedVersion: input.expectedVersion,
      stepId: ELIGIBILITY_INTAKE_STEP_ID,
      patch: stepData as unknown as Record<string, unknown>,
    });

    const eligibility = readStepData(matter);
    if (!eligibility) throw new Error("Persisted eligibility findings could not be read back.");
    return { matter, eligibility };
  }
}
