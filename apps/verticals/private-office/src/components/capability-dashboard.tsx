/**
 * Capability Dashboard — "What can I do next?"
 *
 * Shows durable life state, unlocked workflow groups, next actions, and a
 * deterministic goal-to-capability path planner.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
  Circle,
} from "lucide-react";
import { capabilityGraph, getCapability } from "@/domain/capability-graph";
import {
  createInitialState,
  getLifeStateSummary,
  type UserCapabilityState,
} from "@/domain/state-engine";
import { businessWorkflowGroups } from "@/domain/workflow-groups";
import {
  evaluateWorkflowGroups,
  type WorkflowGroupEvaluation,
} from "@/domain/workflow-group-engine";
import {
  recommendNext,
  planPath,
  findGoalCapability,
} from "@/domain/workflow-orchestrator";

interface CapabilityDashboardProps {
  initialState?: UserCapabilityState;
}

export function CapabilityDashboard({ initialState }: CapabilityDashboardProps) {
  const [state, setState] = useState<UserCapabilityState>(
    initialState ?? createInitialState("unpersisted-user"),
  );
  const [goalText, setGoalText] = useState("");
  const [goalResult, setGoalResult] = useState<
    null | { capabilityId: string; path: ReturnType<typeof planPath> }
  >(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [groups, setGroups] = useState<WorkflowGroupEvaluation[]>(() =>
    evaluateWorkflowGroups(capabilityGraph, businessWorkflowGroups, state),
  );

  const summary = useMemo(() => getLifeStateSummary(capabilityGraph, state), [state]);
  const recommendations = useMemo(() => recommendNext(capabilityGraph, state), [state]);

  async function handleComplete(capabilityId: string) {
    setCompletionError(null);
    setCompletingId(capabilityId);
    try {
      const { completeCapability: completeCapabilityServer } = await import(
        "@/lib/fns/complete-capability"
      );
      const result = await completeCapabilityServer({ data: { capabilityId } });
      const nextState = result.state as UserCapabilityState;
      setState(nextState);
      setGroups(evaluateWorkflowGroups(capabilityGraph, businessWorkflowGroups, nextState));
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : "The capability could not be completed.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  function handlePlanGoal() {
    if (!goalText.trim()) return;
    const goalCapability = findGoalCapability(capabilityGraph, goalText);
    if (!goalCapability) {
      setGoalResult(null);
      return;
    }
    setGoalResult({
      capabilityId: goalCapability.id,
      path: planPath(capabilityGraph, state, goalCapability.id),
    });
  }

  const visibleGroups = groups.filter((evaluation) => evaluation.status !== "locked");
  const lockedGroups = groups.filter((evaluation) => evaluation.status === "locked");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brass" />
          <h2 className="text-2xl text-charcoal">Your capability state</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Completed" value={summary.totalCompleted} icon={<CheckCircle2 size={16} className="text-emerald-600" />} />
          <StatTile label="In Progress" value={summary.totalInProgress} icon={<Circle size={16} className="text-brass" />} />
          <StatTile label="Milestones" value={summary.reachedMilestones.length} icon={<TrendingUp size={16} className="text-navy" />} />
          <StatTile label="Available Now" value={summary.availableCapabilities.length} icon={<ArrowRight size={16} className="text-brass" />} />
        </div>
        {summary.reachedMilestones.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.reachedMilestones.map((milestone) => (
              <span key={milestone.id} className="rounded-full border border-brass/30 bg-brass/5 px-3 py-1 text-xs font-medium text-brass">
                ✓ {milestone.title}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-rule bg-paper p-6">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-navy" />
          <h3 className="text-lg text-charcoal">What are you trying to accomplish?</h3>
        </div>
        <p className="mt-1 text-sm text-stone">
          Describe a goal and Private Office will map the prerequisite path from your current state.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={goalText}
            onChange={(event) => setGoalText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handlePlanGoal()}
            placeholder="e.g. start a landscaping business, dispute a debt, sell my business..."
            className="flex-1 rounded-md border border-rule bg-ivory px-4 py-2 text-sm text-charcoal placeholder:text-stone-light focus:border-navy/40 focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
          <button onClick={handlePlanGoal} className="btn-primary whitespace-nowrap">
            Plan Path <ArrowRight size={15} />
          </button>
        </div>

        {goalText && !goalResult && (
          <p className="mt-3 text-xs text-stone">No matching capability found. Try different keywords.</p>
        )}
        {goalResult && goalResult.path.stepsRemaining > 0 && (
          <div className="mt-5">
            <div className="text-sm font-medium text-charcoal">
              Path to: {getCapability(capabilityGraph, goalResult.capabilityId)?.title}
            </div>
            <div className="mt-1 text-xs text-stone">
              {goalResult.path.stepsRemaining} step{goalResult.path.stepsRemaining === 1 ? "" : "s"} remaining
            </div>
            <ol className="mt-3 space-y-2">
              {goalResult.path.path.map((stepId, index) => {
                const capability = getCapability(capabilityGraph, stepId);
                const isAvailable = goalResult.path.nextAvailable.includes(stepId);
                const blockedBy = goalResult.path.blockedBy[stepId];
                return (
                  <li key={stepId} className={`flex items-start gap-3 rounded-lg border p-3 ${isAvailable ? "border-brass/30 bg-brass/5" : "border-rule bg-ivory"}`}>
                    <span className="mt-0.5 font-mono text-xs text-stone">{index + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-charcoal">{capability?.title ?? stepId}</div>
                      <div className="text-xs text-stone">{capability?.description}</div>
                      {isAvailable && <div className="mt-1 text-xs font-medium text-brass">Available now</div>}
                      {blockedBy && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-stone">
                          <Lock size={11} /> Blocked by: {blockedBy.join(", ")}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        {goalResult && goalResult.path.stepsRemaining === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm text-emerald-800">This goal is already completed.</span>
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brass" />
          <h3 className="text-lg text-charcoal">Workflow groups unlocked</h3>
        </div>
        <p className="mt-1 text-sm text-stone">
          Completing a group establishes a stronger state and can unlock the next class of work.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((evaluation) => (
            <div key={evaluation.group.id} className="rounded-xl border border-rule bg-paper p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-brass">{evaluation.status}</div>
              <h4 className="mt-2 text-base text-charcoal">{evaluation.group.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-stone">{evaluation.group.description}</p>
              <div className="mt-3 text-xs text-stone">
                {evaluation.completedWorkflowCount} of {evaluation.totalWorkflowCount} workflows completed
              </div>
              {evaluation.status === "completed" && (
                <div className="mt-3 text-xs font-medium text-emerald-700">Group complete — downstream state updated.</div>
              )}
              {evaluation.status !== "completed" && evaluation.missing.length > 0 && (
                <div className="mt-3 text-[11px] text-stone-light">
                  Remaining: {evaluation.missing.slice(0, 4).join(", ")}{evaluation.missing.length > 4 ? "…" : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {completionError && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {completionError}
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brass" />
          <h3 className="text-lg text-charcoal">What you can do next</h3>
        </div>
        <p className="mt-1 text-sm text-stone">
          These actions are currently available based on the capabilities already established.
        </p>
        {recommendations.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rule bg-paper p-4 text-sm text-stone">
            <CheckCircle2 size={16} className="text-emerald-600" /> All currently modeled capabilities are complete.
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((recommendation) => (
            <div key={recommendation.capability.id} className="group flex flex-col rounded-xl border border-rule bg-paper p-5 transition-all duration-200 hover:border-navy/30 hover:shadow-premium">
              <div className="font-mono text-[10px] uppercase tracking-widest text-brass">{recommendation.capability.family}</div>
              <h4 className="mt-2 text-base text-charcoal">{recommendation.capability.title}</h4>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-stone">{recommendation.capability.description}</p>
              <div className="mt-3 rounded-md bg-ivory px-3 py-2 text-xs text-stone">{recommendation.reason}</div>
              <div className="mt-4 flex items-center gap-2">
                {recommendation.capability.workflowId ? (
                  <Link
                    to={`/workflows/${recommendation.capability.workflowId}`}
                    className="text-sm font-medium text-navy transition-colors group-hover:text-brass"
                  >
                    Start workflow <ArrowRight size={14} className="inline transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <button
                    onClick={() => handleComplete(recommendation.capability.id)}
                    disabled={completingId === recommendation.capability.id}
                    className="text-sm font-medium text-navy transition-colors group-hover:text-brass disabled:opacity-50"
                  >
                    {completingId === recommendation.capability.id ? "Updating…" : "Mark established"} <ArrowRight size={14} className="inline" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {lockedGroups.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-stone-light" />
            <h3 className="text-lg text-stone">Workflow groups not yet unlocked</h3>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lockedGroups.map((evaluation) => (
              <div key={evaluation.group.id} className="rounded-lg border border-rule bg-ivory/50 p-4">
                <div className="text-xs font-medium text-stone">{evaluation.group.title}</div>
                <div className="mt-1 text-[10px] text-stone-light">
                  Requires: {evaluation.missing.slice(0, 4).join(", ")}{evaluation.missing.length > 4 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.lockedCapabilities.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-stone-light" />
            <h3 className="text-lg text-stone">Not yet available</h3>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {summary.lockedCapabilities.map((capability) => (
              <div key={capability.id} className="flex items-start gap-2 rounded-lg border border-rule bg-ivory/50 p-3">
                <Lock size={12} className="mt-0.5 text-stone-light" />
                <div>
                  <div className="text-xs font-medium text-stone">{capability.title}</div>
                  <div className="mt-0.5 text-[10px] text-stone-light">
                    Requires: {capability.prerequisites.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-rule bg-paper p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-charcoal">{value}</div>
    </div>
  );
}
