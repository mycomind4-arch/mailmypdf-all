import { useMemo, useState } from "react";
import {
  FindingsPanel,
  ReadinessChecklist,
  StatusPill,
  StepShell,
  type StatusPillTone,
  type WorkflowFinding,
} from "@mailmypdf/workflow-ui";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
  type EligibilityEvidenceStatus,
  type SecuredTransactionEligibilityGateId,
  type SecuredTransactionEligibilityInput,
} from "../rules/eligibility";
import { validateSecuredTransactionEligibilityInput } from "../runtime-policy";

const GATE_LABELS: Record<SecuredTransactionEligibilityGateId, string> = {
  "identifiable-debtor": "Identifiable debtor",
  "identifiable-secured-party": "Identifiable secured party",
  "actual-obligation": "Actual obligation",
  "actual-value": "Actual value given",
  "debtor-rights-in-collateral": "Debtor rights in collateral",
  "authenticated-security-agreement-or-valid-alternative":
    "Authenticated security agreement or valid alternative",
  "specific-collateral": "Specific, identified collateral",
  authorization: "Authorization to encumber the collateral",
  "correct-jurisdiction": "Correct governing jurisdiction identified",
};

type GateFormEntry = {
  status: EligibilityEvidenceStatus | "missing";
  sourceRefsText: string;
  note: string;
};

function emptyEntry(): GateFormEntry {
  return { status: "missing", sourceRefsText: "", note: "" };
}

function initialForm(): Record<SecuredTransactionEligibilityGateId, GateFormEntry> {
  const form = {} as Record<SecuredTransactionEligibilityGateId, GateFormEntry>;
  for (const gateId of SECURED_TRANSACTION_ELIGIBILITY_GATES) {
    form[gateId] = emptyEntry();
  }
  return form;
}

function toEngineInput(
  form: Record<SecuredTransactionEligibilityGateId, GateFormEntry>,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const gateId of SECURED_TRANSACTION_ELIGIBILITY_GATES) {
    const entry = form[gateId];
    if (entry.status === "missing") continue;
    raw[gateId] = {
      status: entry.status,
      sourceRefs: entry.sourceRefsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      ...(entry.note.trim() ? { note: entry.note.trim() } : {}),
    };
  }
  return raw;
}

function gateStatusTone(status: EligibilityEvidenceStatus | "missing"): StatusPillTone {
  if (status === "verified") return "success";
  if (status === "contradicted") return "danger";
  if (status === "unverified") return "warning";
  return "neutral";
}

function gateStatusLabel(status: EligibilityEvidenceStatus | "missing"): string {
  if (status === "missing") return "No evidence supplied";
  return status;
}

export type EligibilityOutcome =
  | "ELIGIBLE TO CONTINUE"
  | "HUMAN REVIEW REQUIRED"
  | "BLOCKED";

/**
 * Maps the shared engine's real status values to the workflow's three
 * user-facing outcome categories. "ELIGIBLE TO CONTINUE" means only that
 * there is sufficient evidence to proceed to the next secured-transaction
 * workflow -- it does not mean attachment, perfection, enforceability, or
 * priority has been established.
 */
function toOutcome(engineStatus: "ready-for-analysis" | "human-review-required" | "blocked"): EligibilityOutcome {
  if (engineStatus === "ready-for-analysis") return "ELIGIBLE TO CONTINUE";
  if (engineStatus === "human-review-required") return "HUMAN REVIEW REQUIRED";
  return "BLOCKED";
}

function outcomeTone(outcome: EligibilityOutcome): StatusPillTone {
  if (outcome === "ELIGIBLE TO CONTINUE") return "success";
  if (outcome === "HUMAN REVIEW REQUIRED") return "warning";
  return "danger";
}

export function SecuredTransactionEligibilityIntake() {
  const [form, setForm] = useState(initialForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateGate(gateId: SecuredTransactionEligibilityGateId, patch: Partial<GateFormEntry>) {
    setForm((previous) => ({
      ...previous,
      [gateId]: { ...previous[gateId], ...patch },
    }));
  }

  const result = useMemo(() => {
    const rawInput = toEngineInput(form);
    try {
      const validated = validateSecuredTransactionEligibilityInput(rawInput);
      setValidationError(null);
      return evaluateSecuredTransactionEligibility(
        validated as SecuredTransactionEligibilityInput,
      );
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Invalid eligibility input.");
      return evaluateSecuredTransactionEligibility({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const outcome = toOutcome(result.status);

  const readinessItems = SECURED_TRANSACTION_ELIGIBILITY_GATES.map((gateId) => ({
    id: gateId,
    label: GATE_LABELS[gateId],
    done: result.verified.includes(gateId),
  }));

  const findings: WorkflowFinding[] = result.gates.map((gate) => ({
    id: gate.id,
    title: GATE_LABELS[gate.id],
    description: gate.reasons.join(" ") || undefined,
    category: "Eligibility gate",
    sourceLabel: gate.sourceRefs.length > 0 ? gate.sourceRefs.join(", ") : undefined,
    detail: <StatusPill tone={gateStatusTone(form[gate.id].status)} label={gate.status} />,
  }));

  return (
    <StepShell
      breadcrumb={[
        { label: "Secured Transactions", href: "/secured-transactions" },
        { label: "Secured-Transaction Eligibility" },
      ]}
      title="Secured-Transaction Eligibility"
      subtitle="Record the evidence supporting each required element. Missing or contradicted evidence stays visible rather than being assumed."
      steps={[{ id: "intake", label: "Evidence intake" }]}
      currentStepId="intake"
      completedStepIds={[]}
      rail={
        <>
          <ReadinessChecklist title="Required elements" items={readinessItems} />
          <div className="wf-card">
            <div className="wf-card-eyebrow">Result</div>
            <StatusPill tone={outcomeTone(outcome)} label={outcome} />
            <p className="wf-finding-description">
              {outcome === "ELIGIBLE TO CONTINUE" &&
                "Sufficient evidence is present to proceed to the next secured-transaction workflow. This does not establish attachment, a valid security interest, enforceability, perfection, or priority."}
              {outcome === "HUMAN REVIEW REQUIRED" &&
                "Contradicted or unresolved evidence requires human review before this matter can proceed."}
              {outcome === "BLOCKED" &&
                "One or more required elements are missing evidence. This matter cannot proceed until they are supplied."}
            </p>
          </div>
        </>
      }
    >
      {validationError && (
        <div className="wf-card" role="alert">
          <StatusPill tone="danger" label="Invalid input" />
          <p className="wf-finding-description">{validationError}</p>
        </div>
      )}

      <div className="wf-card">
        <div className="wf-card-eyebrow">Evidence for each required element</div>
        {SECURED_TRANSACTION_ELIGIBILITY_GATES.map((gateId) => {
          const entry = form[gateId];
          return (
            <fieldset key={gateId} className="wf-finding">
              <legend className="wf-finding-title">{GATE_LABELS[gateId]}</legend>
              <StatusPill tone={gateStatusTone(entry.status)} label={gateStatusLabel(entry.status)} />

              <label className="wf-form-label">
                Status
                <select
                  className="wf-form-control"
                  value={entry.status}
                  onChange={(event) =>
                    updateGate(gateId, {
                      status: event.target.value as GateFormEntry["status"],
                    })
                  }
                >
                  <option value="missing">No evidence yet</option>
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified</option>
                  <option value="contradicted">Contradicted</option>
                </select>
              </label>

              <label className="wf-form-label">
                Source references (comma-separated)
                <input
                  className="wf-form-control"
                  type="text"
                  value={entry.sourceRefsText}
                  onChange={(event) => updateGate(gateId, { sourceRefsText: event.target.value })}
                  placeholder="e.g. document-12, matter-fact-3"
                />
              </label>

              <label className="wf-form-label">
                Note (optional)
                <input
                  className="wf-form-control"
                  type="text"
                  value={entry.note}
                  onChange={(event) => updateGate(gateId, { note: event.target.value })}
                />
              </label>
            </fieldset>
          );
        })}
      </div>

      <FindingsPanel
        title="Gate findings"
        description="Each required element's current evidence status, as evaluated by the shared eligibility engine."
        findings={findings}
      />
    </StepShell>
  );
}

export default SecuredTransactionEligibilityIntake;
