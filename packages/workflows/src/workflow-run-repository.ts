/**
 * Workflow Run Repository
 *
 * Persistent durable state for workflow executions.
 * Extends the Matter pattern with pipeline-specific tracking.
 */

import type { PipelineResult, PipelineStage, StageResult } from "./gold-standard-pipeline.js";

export interface WorkflowRunInput {
  ownerId: string;
  matterId: string;
  workflowId: string;
  pipelineId: string;
}

export interface WorkflowRun {
  id: string;
  ownerId: string;
  matterId: string;
  workflowId: string;
  pipelineId: string;
  status: "running" | "paused" | "blocked" | "completed" | "failed";
  currentStep: PipelineStage | null;
  completedStages: PipelineStage[];
  stageResults: StageResult[];
  pipelineResult: PipelineResult | null;
  errorMessage: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunRepository {
  create(input: WorkflowRunInput): Promise<WorkflowRun>;
  get(ownerId: string, runId: string): Promise<WorkflowRun | null>;
  getByMatter(ownerId: string, matterId: string): Promise<WorkflowRun[]>;
  update(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    patch: Partial<Omit<WorkflowRun, "id" | "ownerId" | "matterId" | "createdAt">>,
  ): Promise<WorkflowRun>;
  recordStage(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    stageResult: StageResult,
  ): Promise<WorkflowRun>;
  setBlocked(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    reason: string,
  ): Promise<WorkflowRun>;
  setPipelineResult(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    result: PipelineResult,
  ): Promise<WorkflowRun>;
}

export class WorkflowRunVersionConflictError extends Error {
  constructor() {
    super("Workflow run changed since it was loaded; refresh and retry.");
    this.name = "WorkflowRunVersionConflictError";
  }
}

export class WorkflowRunOwnershipError extends Error {
  constructor() {
    super("Workflow run is not accessible for this owner.");
    this.name = "WorkflowRunOwnershipError";
  }
}
