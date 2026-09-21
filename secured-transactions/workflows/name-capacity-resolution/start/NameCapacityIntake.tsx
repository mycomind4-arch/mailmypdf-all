import { useMemo, useState } from "react";
import {
  FindingsPanel,
  ReadinessChecklist,
  StatusPill,
  StepShell,
  type StatusPillTone,
  type WorkflowFinding,
} from "@mailmypdf/workflow-ui";
import type { Capacity, EntityClassification } from "@mailmypdf/identity-capacity";
import {
  resolveNameCapacity,
  type NameCapacityResolutionInput,
  type NameCapacitySourceType,
} from "../rules/resolution";

type FormState = Omit<NameCapacityResolutionInput, "alternateNames"> & { alternateNames: string };

const SOURCE_OPTIONS: readonly { value: NameCapacitySourceType; label: string }[] = [
  { value: "official-registry-record", label: "Official registry or public record" },
  { value: "government-issued-id", label: "Government-issued identification" },
  { value: "organizational-document", label: "Trust, estate, or organizational document" },
  { value: "executed-contract", label: "Signed agreement or contract" },
  { value: "court-order", label: "Court order or probate record" },
  { value: "user-statement", label: "My statement (needs corroboration)" },
];

const ENTITY_OPTIONS: readonly { value: EntityClassification; label: string }[] = [
  { value: "individual", label: "A person" },
  { value: "registered-organization", label: "A registered company or organization" },
  { value: "sole-proprietorship", label: "A sole proprietorship or trade name" },
  { value: "trust", label: "A trust" },
  { value: "estate", label: "An estate" },
  { value: "government-entity", label: "A government entity" },
];

const CAPACITY_OPTIONS: readonly { value: Capacity; label: string }[] = [
  { value: "individual", label: "For themselves" },
  { value: "officer", label: "As an officer" },
  { value: "manager", label: "As a manager" },
  { value: "member", label: "As a member" },
  { value: "trustee", label: "As a trustee" },
  { value: "executor", label: "As an executor" },
  { value: "administrator", label: "As an administrator" },
  { value: "agent", label: "As an agent or representative" },
  { value: "guarantor", label: "As a guarantor" },
];

const INITIAL_FORM: FormState = {
  primaryName: "",
  alternateNames: "",
  entityType: undefined,
  capacity: undefined,
  principalName: "",
  sourceLabel: "",
  sourceType: "official-registry-record",
  sourceId: "",
};

function toneFor(status: "ready-for-review" | "human-review-required" | "blocked"): StatusPillTone {
  if (status === "ready-for-review") return "success";
  if (status === "human-review-required") return "warning";
  return "danger";
}

function labelFor(status: "ready-for-review" | "human-review-required" | "blocked") {
  if (status === "ready-for-review") return "Ready for human review";
  if (status === "human-review-required") return "Human review required";
  return "More information needed";
}

export function NameCapacityIntake() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const result = useMemo(
    () => resolveNameCapacity({
      ...form,
      alternateNames: form.alternateNames.split("\n"),
    }),
    [form],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const readinessItems = [
    { id: "source", label: "A supporting record is identified", done: Boolean(form.sourceId.trim()) },
    { id: "name", label: "The main name is entered", done: Boolean(form.primaryName.trim()) },
    { id: "entity", label: "The type of party is identified", done: Boolean(form.entityType) },
    { id: "capacity", label: "The acting capacity is identified", done: Boolean(form.capacity) },
  ];

  const findings: WorkflowFinding[] = [
    {
      id: "authoritative-name",
      title: "Name comparison",
      category: "Name resolution",
      description: result.name.reasons.join(" "),
      sourceLabel: form.sourceLabel.trim() || form.sourceId.trim() || undefined,
      detail: <StatusPill tone={result.name.requiresHumanReview ? "warning" : result.name.authoritativeName ? "success" : "neutral"} label={result.name.authoritativeName ?? "Not resolved"} />,
    },
    {
      id: "entity-classification",
      title: "Party type",
      category: "Entity classification",
      description: result.entity.reasons.join(" "),
      detail: <StatusPill tone={result.entity.requiresHumanReview ? "warning" : result.entity.authoritativeType ? "success" : "neutral"} label={result.entity.authoritativeType ?? "Not resolved"} />,
    },
    {
      id: "capacity-resolution",
      title: "Acting capacity",
      category: "Capacity resolution",
      description: result.capacity.reasons.join(" "),
      detail: <StatusPill tone={result.capacity.requiresHumanReview ? "warning" : result.capacity.primaryCapacity ? "success" : "neutral"} label={result.capacity.primaryCapacity?.capacity ?? "Not resolved"} />,
    },
  ];

  return (
    <StepShell
      breadcrumb={[{ label: "Secured Transactions", href: "/secured-transactions" }, { label: "Name & Capacity Resolution" }]}
      title="Name & Capacity Resolution"
      subtitle="Tell us what the records say about the party. The system compares names and surfaces evidence gaps without deciding disputed identity for you."
      steps={[{ id: "intake", label: "Party and record intake" }]}
      currentStepId="intake"
      completedStepIds={[]}
      rail={
        <>
          <ReadinessChecklist title="What we need" items={readinessItems} />
          <div className="wf-card">
            <div className="wf-card-eyebrow">Current result</div>
            <StatusPill tone={toneFor(result.status)} label={labelFor(result.status)} />
            <p className="wf-finding-description">
              {result.status === "ready-for-review" && "The available record supports an initial deterministic comparison. A human still reviews the findings before they are reused elsewhere."}
              {result.status === "human-review-required" && "The record is useful, but the evidence or a conflict requires human review before a conclusion is relied on."}
              {result.status === "blocked" && "Add the missing record, name, or party details. The workflow will not infer them."}
            </p>
          </div>
        </>
      }
    >
      <div className="wf-card">
        <div className="wf-card-eyebrow">Start with the record in front of you</div>
        <h2 className="wf-finding-title">Who is named, and how are they acting?</h2>
        <p className="wf-finding-description">
          Use the exact wording from the record. If two records spell the name differently, put one version on each line. Differences are preserved for review.
        </p>
        <div className="wf-form-grid">
          <label className="wf-form-label">
            Main name on the record
            <input className="wf-form-control" value={form.primaryName} onChange={(event) => update("primaryName", event.target.value)} placeholder="Example: Example Holdings LLC" />
          </label>
          <label className="wf-form-label">
            Other name versions (optional)
            <textarea className="wf-form-control" rows={3} value={form.alternateNames} onChange={(event) => update("alternateNames", event.target.value)} placeholder="One name per line" />
          </label>
          <label className="wf-form-label">
            What kind of party is this?
            <select className="wf-form-control" value={form.entityType ?? ""} onChange={(event) => update("entityType", (event.target.value || undefined) as EntityClassification | undefined)}>
              <option value="">I’m not sure yet</option>
              {ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wf-form-label">
            How is the person acting?
            <select className="wf-form-control" value={form.capacity ?? ""} onChange={(event) => update("capacity", (event.target.value || undefined) as Capacity | undefined)}>
              <option value="">I’m not sure yet</option>
              {CAPACITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wf-form-label">
            If acting for someone else, who is the principal? (optional)
            <input className="wf-form-control" value={form.principalName} onChange={(event) => update("principalName", event.target.value)} placeholder="Example: Example Holdings LLC" />
          </label>
        </div>
      </div>

      <div className="wf-card">
        <div className="wf-card-eyebrow">Evidence</div>
        <h2 className="wf-finding-title">What record supports this?</h2>
        <p className="wf-finding-description">A record can be a contract, registry result, government ID, court order, or organizational document. A personal statement is still useful, but it will remain lower-authority evidence.</p>
        <div className="wf-form-grid">
          <label className="wf-form-label">
            Record name or reference
            <input className="wf-form-control" value={form.sourceId} onChange={(event) => update("sourceId", event.target.value)} placeholder="Example: State registry result dated June 12" />
          </label>
          <label className="wf-form-label">
            Record type
            <select className="wf-form-control" value={form.sourceType} onChange={(event) => update("sourceType", event.target.value as NameCapacitySourceType)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wf-form-label">
            Short note (optional)
            <input className="wf-form-control" value={form.sourceLabel} onChange={(event) => update("sourceLabel", event.target.value)} placeholder="Example: the officer listing is current" />
          </label>
        </div>
      </div>

      <FindingsPanel title="Shared-engine findings" description="These findings come from the shared identity and capacity rules. They are not a final legal conclusion." findings={findings} />
    </StepShell>
  );
}

export default NameCapacityIntake;
