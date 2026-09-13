import { useState } from "react";
import { SectionCard, TimelineList, DataTable, StatusPill, TextField, RecommendedStepsRow, type TimelineEvent } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";

function defaultEvents(intake: NoidResponseIntake): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (intake.noidIssuedDate) {
    events.push({ id: "issued", date: intake.noidIssuedDate, title: "NOID issued", tag: "USCIS", description: `Notice of Intent to Deny issued for ${intake.formType ?? "the petition"}${intake.receiptNumber ? ` (receipt ${intake.receiptNumber})` : ""}.` });
  }
  if (intake.responseDeadline) {
    events.push({ id: "deadline", date: intake.responseDeadline, title: "Response deadline", tag: "Deadline", description: "Final date to submit your NOID response to USCIS." });
  }
  return events;
}

export function TimelineStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
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
    { type: "USCIS notices", count: events.filter((e) => e.tag === "USCIS").length, status: "Ready" as const },
    { type: "Deadlines", count: events.filter((e) => e.tag === "Deadline").length, status: events.some((e) => e.tag === "Deadline") ? ("Ready" as const) : ("Needs review" as const) },
  ];

  return (
    <>
      <SectionCard
        title="Timeline builder"
        description="Arrange the key USCIS dates and any related correspondence into a clear sequence. This helps frame your response and confirms your deadline."
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

      <SectionCard title="Timeline coverage" description="This shows whether your timeline captures the key dates.">
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
        steps={[{ label: "Confirm dates" }, { label: "Verify deadline" }, { label: "Finalize event order" }]}
        continueLabel="Continue to Draft"
        continueDisabled={events.length === 0}
        onContinue={handleSave}
      />
    </>
  );
}
