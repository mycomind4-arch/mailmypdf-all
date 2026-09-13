import { useState } from "react";
import { SectionCard, TimelineList, DataTable, StatusPill, TextField, RecommendedStepsRow, type TimelineEvent } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ContractorDisputeIntake } from "@/domain/step-workflows/contractor-dispute";

function defaultEvents(intake: ContractorDisputeIntake): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (intake.dateAgreementSigned) {
    events.push({ id: "signed", date: intake.dateAgreementSigned, title: "Agreement signed", tag: "Contract", description: `Written agreement executed${intake.contractorName ? ` with ${intake.contractorName}` : ""}.` });
  }
  if (intake.dateWorkBegan) {
    events.push({ id: "began", date: intake.dateWorkBegan, title: "Work began", tag: "Work start", description: "Contractor began site work under the agreed scope." });
  }
  if (intake.dateIssueDiscovered) {
    events.push({ id: "discovered", date: intake.dateIssueDiscovered, title: "Visible defects discovered", tag: "Defect", description: "Issues with the work were identified." });
  }
  return events;
}

export function TimelineStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
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
    { type: "Contract", count: events.filter((e) => e.tag === "Contract").length, status: "Ready" as const },
    { type: "Work progress", count: events.filter((e) => e.tag === "Work start" || e.tag === "Defect").length, status: "Ready" as const },
    { type: "Communications", count: events.filter((e) => !e.tag).length, status: "Needs review" as const },
  ];

  return (
    <>
      <SectionCard
        title="Timeline builder"
        description="Arrange the key dates, communications, work events, and issue discoveries into a clear sequence. These events will help frame your notice and support package."
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
        steps={[{ label: "Confirm dates" }, { label: "Clarify communications" }, { label: "Finalize event order" }]}
        continueLabel="Continue to Draft"
        continueDisabled={events.length === 0}
        onContinue={handleSave}
      />
    </>
  );
}
