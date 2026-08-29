import { useState, useMemo } from "react";
import {
  Calendar,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Eye,
  Search,
  ShieldQuestion,
  CalendarClock,
} from "lucide-react";
import type {
  TimelineResult,
  TimelineEvent,
  TimelineConflict,
  TimelineGap,
  DeadlineCalculation,
  EventStatus,
  EventCategory,
} from "../../domain/timeline";
import { EVENT_STATUS_META, EVENT_CATEGORY_LABELS, formatDate } from "../../domain/timeline";

/* ═══════════════════════════════════════════════════════════
   APPEAL TIMELINE™ VIEW
   The visual timeline interface. Shows events with integrity
   statuses, conflicts, gaps, and the deadline engine.
   ═══════════════════════════════════════════════════════════ */

interface TimelineViewProps {
  timeline: TimelineResult | null;
  onAddConflictToAppeal?: (conflict: TimelineConflict) => void;
  onSearchDocuments?: (gap: TimelineGap) => void;
  onExplainConflict?: (conflict: TimelineConflict) => void;
  onAddEvent?: (event: { date: string; description: string }) => void;
}

export function TimelineView({
  timeline,
  onAddConflictToAppeal,
  onSearchDocuments,
  onExplainConflict,
  onAddEvent,
}: TimelineViewProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"timeline" | "conflicts" | "gaps" | "deadline">("timeline");

  const toggleEvent = (id: string) => {
    const next = new Set(expandedEvents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedEvents(next);
  };

  const toggleConflict = (id: string) => {
    const next = new Set(expandedConflicts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedConflicts(next);
  };

  if (!timeline) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarClock className="h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-semibold text-slate-700">No timeline yet</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Upload your documents and run the X-Ray analysis first. The timeline will be reconstructed automatically from your documents.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "timeline" as const, label: "Timeline", icon: Calendar, count: timeline.summary.totalEvents },
    { id: "conflicts" as const, label: "Conflicts", icon: AlertTriangle, count: timeline.summary.totalConflicts },
    { id: "gaps" as const, label: "Gaps", icon: Search, count: timeline.summary.totalGaps },
    { id: "deadline" as const, label: "Deadline", icon: Clock, count: timeline.deadline ? 1 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ── */}
      <TimelineSummary timeline={timeline} />

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Timeline Tab ── */}
      {activeTab === "timeline" && (
        <div className="space-y-3">
          {timeline.events.map((evt) => (
            <TimelineEventCard
              key={evt.id}
              event={evt}
              expanded={expandedEvents.has(evt.id)}
              onToggle={() => toggleEvent(evt.id)}
            />
          ))}
          {onAddEvent && (
            <AddEventButton onClick={onAddEvent} />
          )}
        </div>
      )}

      {/* ── Conflicts Tab ── */}
      {activeTab === "conflicts" && (
        <div className="space-y-3">
          {timeline.conflicts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ShieldQuestion className="h-10 w-10 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-slate-600">No timeline conflicts detected</p>
              <p className="mt-1 text-xs text-slate-400">All events are consistent across your documents.</p>
            </div>
          ) : (
            timeline.conflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                expanded={expandedConflicts.has(conflict.id)}
                onToggle={() => toggleConflict(conflict.id)}
                onAddToAppeal={onAddConflictToAppeal}
                onExplain={onExplainConflict}
              />
            ))
          )}
        </div>
      )}

      {/* ── Gaps Tab ── */}
      {activeTab === "gaps" && (
        <div className="space-y-3">
          {timeline.gaps.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Search className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No significant gaps detected</p>
              <p className="mt-1 text-xs text-slate-400">Your timeline has good coverage between events.</p>
            </div>
          ) : (
            timeline.gaps.map((gap) => (
              <GapCard key={gap.id} gap={gap} onSearchDocuments={onSearchDocuments} />
            ))
          )}
        </div>
      )}

      {/* ── Deadline Tab ── */}
      {activeTab === "deadline" && (
        <DeadlinePanel deadline={timeline.deadline} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY STATS BAR
   ═══════════════════════════════════════════════════════════ */

function TimelineSummary({ timeline }: { timeline: TimelineResult }) {
  const stats = [
    { label: "Events", value: timeline.summary.totalEvents, color: "text-indigo-600" },
    { label: "Documented", value: timeline.summary.documented, color: "text-emerald-600" },
    { label: "Inferred", value: timeline.summary.inferred, color: "text-amber-600" },
    { label: "Conflicts", value: timeline.summary.conflicting, color: "text-red-600" },
    { label: "Gaps", value: timeline.summary.totalGaps, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="mt-1 text-xs text-slate-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TIMELINE EVENT CARD
   ═══════════════════════════════════════════════════════════ */

function TimelineEventCard({
  event,
  expanded,
  onToggle,
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = EVENT_STATUS_META[event.status];

  return (
    <div className={`rounded-lg border bg-white transition-all ${
    event.status === "conflicting" ? "border-red-300" :
    event.status === "documented" ? "border-slate-200" :
    event.status === "inferred" ? "border-amber-200" :
    event.status === "user_reported" ? "border-blue-200" :
    "border-slate-300"
  }`}>
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {/* Date column */}
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">{formatDate(event.date)}</p>
          {event.daysToNext !== undefined && event.daysToNext > 14 && (
            <p className="mt-0.5 text-xs text-orange-500">
              {event.daysToNext}d gap
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex-shrink-0">
          <div className={`mt-1 h-3 w-3 rounded-full ${
            event.status === "documented" ? "bg-emerald-500" :
            event.status === "conflicting" ? "bg-red-500" :
            event.status === "inferred" ? "bg-amber-500" :
            event.status === "user_reported" ? "bg-blue-500" :
            "bg-slate-400"
          }`} />
          {event.daysToNext !== undefined && (
            <div className="mx-auto mt-1 h-full w-px bg-slate-200" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{event.description}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs">{meta.icon}</span>
            <span className="text-xs text-slate-500">{meta.label}</span>
            {event.category !== "other" && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{EVENT_CATEGORY_LABELS[event.category]}</span>
              </>
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Evidence */}
          {event.evidence && (
            <div className="mb-3 rounded-md bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <FileText className="h-3.5 w-3.5" />
                Evidence
              </div>
              <p className="mt-1.5 text-sm italic text-slate-700">"{event.evidence.quote}"</p>
              <p className="mt-1 text-xs text-slate-500">
                — {event.evidence.sourceRef.documentName}
                {event.evidence.sourceRef.page ? `, p.${event.evidence.sourceRef.page}` : ""}
              </p>
            </div>
          )}

          {/* Conflicting claims */}
          {event.conflictingClaims && event.conflictingClaims.length > 0 && (
            <div className="mb-3 rounded-md bg-red-50 p-3 border border-red-200">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Conflicting Sources
              </div>
              <div className="mt-2 space-y-2">
                {event.conflictingClaims.map((claim, i) => (
                  <div key={i} className="text-sm text-slate-700">
                    <p className="italic">"{claim.text}"</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      — {claim.source.documentName}
                      {claim.source.page ? `, p.${claim.source.page}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source documents */}
          {event.sources.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              {event.sources.map((s, i) => (
                <span key={i}>
                  {s.documentName}{s.page ? `, p.${s.page}` : ""}
                  {i < event.sources.length - 1 ? "; " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Status description */}
          <p className="mt-2 text-xs text-slate-400">{meta.description}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFLICT CARD
   ═══════════════════════════════════════════════════════════ */

function ConflictCard({
  conflict,
  expanded,
  onToggle,
  onAddToAppeal,
  onExplain,
}: {
  conflict: TimelineConflict;
  expanded: boolean;
  onToggle: () => void;
  onAddToAppeal?: (conflict: TimelineConflict) => void;
  onExplain?: (conflict: TimelineConflict) => void;
}) {
  const [explanations, setExplanations] = useState<string[]>(conflict.alternativeExplanations);
  const [loadingExplanations, setLoadingExplanations] = useState(false);

  const handleExplain = () => {
    if (onExplain) {
      setLoadingExplanations(true);
      onExplain(conflict);
    } else {
      setExplanations([
        `The receipt establishes that the document was uploaded on ${formatDate(conflict.claimA.date)}, but does not establish that the agency successfully received or processed it.`,
        `The date in the decision may refer to when the document was logged into the agency's internal system, not when it was originally submitted.`,
        `The document may have been submitted to a different department or portal than the one that made the decision.`,
      ]);
    }
    setLoadingExplanations(false);
  };

  return (
    <div className={`rounded-lg border bg-white ${conflict.status === "added_to_appeal" ? "border-emerald-300" : "border-red-300"}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{conflict.title}</p>
          <p className="mt-1 text-xs text-slate-600">{conflict.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              {conflict.status === "added_to_appeal" ? "Added to appeal" : "Open"}
            </span>
          </div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Source A */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{conflict.claimA.source.documentName}</span>
              <span className="text-xs font-bold text-slate-700">{formatDate(conflict.claimA.date)}</span>
            </div>
            <p className="mt-1.5 text-sm italic text-slate-700">"{conflict.claimA.text}"</p>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-xs font-medium text-slate-400">vs.</span>
          </div>

          {/* Source B */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{conflict.claimB.source.documentName}</span>
              <span className="text-xs font-bold text-slate-700">{formatDate(conflict.claimB.date)}</span>
            </div>
            <p className="mt-1.5 text-sm italic text-slate-700">"{conflict.claimB.text}"</p>
          </div>

          {/* Why it matters */}
          <div className="mt-3 rounded-md bg-amber-50 p-3 border border-amber-200">
            <p className="text-xs font-medium text-amber-800">Why this matters</p>
            <p className="mt-1 text-sm text-amber-900">{conflict.whyItMatters}</p>
          </div>

          {/* Alternative explanations */}
          {explanations.length > 0 && (
            <div className="mt-3 rounded-md bg-blue-50 p-3 border border-blue-200">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                Could this have another explanation?
              </div>
              <ul className="mt-2 space-y-1.5">
                {explanations.map((exp, i) => (
                  <li key={i} className="text-sm text-blue-900 flex gap-2">
                    <span className="text-blue-400">•</span>
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onAddToAppeal?.(conflict)}
              disabled={conflict.status === "added_to_appeal"}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              {conflict.status === "added_to_appeal" ? "Added to appeal" : "Add to Appeal"}
            </button>
            <button
              onClick={handleExplain}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {loadingExplanations ? "Analyzing..." : "Test this conflict"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GAP CARD
   ═══════════════════════════════════════════════════════════ */

function GapCard({
  gap,
  onSearchDocuments,
}: {
  gap: TimelineGap;
  onSearchDocuments?: (gap: TimelineGap) => void;
}) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
            <Search className="h-4 w-4 text-orange-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">
            Timeline Gap Detected — {gap.daysUnaccounted} days unaccounted
          </p>
          <p className="mt-1 text-xs text-slate-600">
            There is a <strong>{gap.daysUnaccounted}-day gap</strong> between {formatDate(gap.fromDate)} and {formatDate(gap.toDate)}.
          </p>

          {/* Context */}
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-500">
              <span className="font-medium">Before:</span> {gap.precedingEventDescription}
            </p>
            <p className="text-xs text-slate-500">
              <span className="font-medium">After:</span> {gap.followingEventDescription}
            </p>
          </div>

          {/* Suggested records */}
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-700">Potentially useful records:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {gap.potentiallyUsefulRecords.map((record, i) => (
                <span key={i} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 border border-slate-200">
                  {record}
                </span>
              ))}
            </div>
          </div>

          {/* Action */}
          {onSearchDocuments && (
            <button
              onClick={() => onSearchDocuments(gap)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              <Search className="h-3.5 w-3.5" />
              Search Your Documents
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEADLINE PANEL
   ═══════════════════════════════════════════════════════════ */

function DeadlinePanel({ deadline }: { deadline: DeadlineCalculation | null }) {
  if (!deadline) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Clock className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">No deadline information found</p>
        <p className="mt-1 text-xs text-slate-400">Upload more documents or enter the deadline manually.</p>
      </div>
    );
  }

  const status = deadline.hasPassed
    ? { label: "Passed", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" }
    : (deadline.daysRemaining ?? 0) <= 7
    ? { label: "Urgent", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" }
    : (deadline.daysRemaining ?? 0) <= 30
    ? { label: "Soon", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" }
    : { label: "OK", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };

  return (
    <div className="space-y-4">
      {/* Main deadline card */}
      <div className={`rounded-lg border ${status.border} ${status.bg} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600">Appeal Deadline</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {deadline.deadlineDate ? formatDate(deadline.deadlineDate) : "Unknown"}
            </p>
          </div>
          <div className="text-right">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.color} bg-white`}>
              {status.label}
            </span>
            {deadline.daysRemaining !== null && !deadline.hasPassed && (
              <p className="mt-2 text-2xl font-bold text-slate-900">{deadline.daysRemaining}</p>
            )}
            {deadline.daysRemaining !== null && !deadline.hasPassed && (
              <p className="text-xs text-slate-500">days remaining</p>
            )}
          </div>
        </div>

        {/* Deadline source */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <span className={`rounded-md px-2 py-0.5 font-medium ${
            deadline.source === "extracted" ? "bg-emerald-100 text-emerald-700" :
            deadline.source === "user_provided" ? "bg-blue-100 text-blue-700" :
            "bg-amber-100 text-amber-700"
          }`}>
            {deadline.source === "extracted" ? "Extracted from document" :
             deadline.source === "user_provided" ? "User-provided" :
             "Inferred from decision date"}
          </span>
          {deadline.statedAppealPeriod && (
            <>
              <span className="text-slate-400">·</span>
              <span>Stated period: {deadline.statedAppealPeriod}</span>
            </>
          )}
          {deadline.decisionDate && (
            <>
              <span className="text-slate-400">·</span>
              <span>Decision: {formatDate(deadline.decisionDate)}</span>
            </>
          )}
        </div>

        {/* Reliability indicator */}
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
            deadline.isReliable ? "text-emerald-600" : "text-amber-600"
          }`}>
            {deadline.isReliable ? (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Reliable
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                Needs verification
              </>
            )}
          </span>
        </div>
      </div>

      {/* Warning */}
      {deadline.warning && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">Deadline Warning</p>
              <p className="mt-1 text-sm text-red-800">{deadline.warning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Conflicting deadlines */}
      {deadline.conflictingDeadlines && (
        <div className="rounded-lg border border-red-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-slate-800">Conflicting Deadlines</p>
          </div>
          <p className="text-xs text-slate-600 mb-3">Two documents appear to identify different appeal deadlines.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md bg-slate-50 p-2.5">
              <span className="text-xs text-slate-600">{deadline.conflictingDeadlines.deadlineA.source.documentName}</span>
              <span className="text-sm font-bold text-slate-900">{formatDate(deadline.conflictingDeadlines.deadlineA.date)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 p-2.5">
              <span className="text-xs text-slate-600">{deadline.conflictingDeadlines.deadlineB.source.documentName}</span>
              <span className="text-sm font-bold text-slate-900">{formatDate(deadline.conflictingDeadlines.deadlineB.date)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-red-700">
            Do not rely on the calculated date until verified.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD EVENT BUTTON
   ═══════════════════════════════════════════════════════════ */

function AddEventButton({ onClick }: { onClick: (event: { date: string; description: string }) => void }) {
  const [show, setShow] = useState(false);
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = () => {
    if (date && desc) {
      onClick({ date, description: desc });
      setDate("");
      setDesc("");
      setShow(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-600"
      >
        <Plus className="h-4 w-4" />
        Add event to timeline
      </button>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 p-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="What happened on this date?"
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        rows={2}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!date || !desc}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Add event
        </button>
        <button
          onClick={() => setShow(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TimelineView;
