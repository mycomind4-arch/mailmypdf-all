import { useState } from "react";
import { SectionCard, TimelineList, DataTable, StatusPill, TextField, RecommendedStepsRow, type TimelineEvent } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";
import type { AdministrativeDecisionAppealIntake } from "@/domain/step-workflows/administrative-decision-appeal";

function defaultEvents(intake: AdministrativeDecisionAppealIntake): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (intake.decisionDate) {
    events.push({ id: "decision", date: intake.decisionDate, title: "Decision issued", tag: "Decision", description: `${intake.issuer ?? "The decision-maker"} issued the decision${intake.referenceNumber ? ` (Ref. ${intake.referenceNumber})` : ""}.` });
  }
  if (intake.deadline) {
    events.push({ id: "deadline", date: intake.deadline, title: "Appeal deadline", tag: "Deadline", description: "Date the appeal or response is due, as stated in the decision notice." });
  }
  return events;
}

export function TimelineStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;
  const saved = matter.steps.timeline?.data.events as TimelineEvent[] | undefined;
  const [events, setEvents] = useState<TimelineEvent[]>(saved ?? defaultEvents(intake));
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  function addEvent() {
    if (!newTitle.trim() || !newDate) return;
    setEvents((current) => [...current, { id: crypto.randomUUID(), title: newTitle.trim(), date: newDate }]);
    setNewTitle("");
    setNewDate("");
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  async function handleSave() {
    await onUpdateData({ events });
    await onComplete();
  }

  const eventsWithEdit = events.map((event) => ({ ...event, onEdit: () => removeEvent(event.id) }));
  const coverage = [
    { type: "Decision", count: events.filter((e) => e.tag === "Decision").length, status: "Ready" as const },
    { type: "Deadline", count: events.filter((e) => e.tag === "Deadline").length, status: "Ready" as const },
    { type: "Correspondence", count: events.filter((e) => !e.tag).length, status: "Needs review" as const },
  ];

  return (
    <>
      <SectionCard
        title="Timeline builder"
        description="Arrange the decision date, appeal deadline, and any correspondence into a clear sequence. These events will help frame your appeal and support package."
        headerAside={<span className="wf-pill wf-pill--info">Chronology record</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={handleSave}>
            Save timeline →
          </button>
        }
      >
        <TimelineList events={eventsWithEdit} />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField placeholder="Event title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ flex: 1, minWidth: "10rem" }} />
          <TextField type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="wf-btn wf-btn--outline" onClick={addEvent}>
            + Add event
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Timeline coverage" description="This shows the key event types and whether your timeline has good coverage.">
        <DataTable
          columns={[
            { key: "type", label: "Event type" },
            { key: "count", label: "Count" },
            { key: "status", label: "Status" },
          ]}
          rows={coverage.map((row) => ({
            type: row.type,
            count: row.count,
            status: <StatusPill tone={row.status === "Ready" ? "success" : "warning"} label={row.status} />,
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm dates" }, { label: "Clarify correspondence" }, { label: "Finalize event order" }]}
        continueLabel="Continue to Draft"
        continueDisabled={events.length === 0}
        onContinue={handleSave}
      />
    </>
  );
}
