/**
 * Workflow Intelligence Core
 *
 * Types and interfaces for the workflow analysis and generation system.
 * Foundation for all workflow intelligence features.
 */

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW SPECIFICATION                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowSpecification {
  id: string;
  name: string;
  description: string;
  goal: string;
  caseType: string;
  userProblem: string;
  successCriteria: string[];

  context: {
    agency?: string;
    jurisdiction?: string;
    applicableRules?: string[];
    deadlines?: string;
    precedent?: string[];
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW ANALYSIS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowAnalysis {
  workflowId: string;
  workflowName: string;
  analysisTimestamp: string;

  // Requirements
  requiredDocuments: RequiredDocument[];
  optionalDocuments: RequiredDocument[];
  requiredInformation: InformationRequirement[];

  // Success factors
  successFactors: string[];
  failurePatterns: string[];
  riskFactors: RiskFactor[];

  // Strategy
  strategyPrompt: string;
  draftingStyle: "formal_legal" | "professional" | "friendly" | "assertive";
  recommendedTone: "formal" | "professional" | "sympathetic" | "assertive";

  // User guidance
  userGuidance: {
    intake: string;
    intakeQuestions: Question[];
    documentGuidance: string;
    strategyExplanation: string;
  };

  // Validation
  validationRules: ValidationRule[];
  caseSurveyRules: CaseStrengthRule[];

  // Precedent
  successfulCasePatterns: CasePattern[];
  failedCasePatterns: CasePattern[];
}

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  examples: string[];
  acceptedFormats: string[];
  whyRequired: string;
  alternatives?: string[];
  minCount?: number;
  maxCount?: number;
}

export interface InformationRequirement {
  id: string;
  name: string;
  description: string;
  dataType: "text" | "date" | "number" | "boolean" | "select";
  required: boolean;
  whyNeeded: string;
  options?: string[];
}

export interface Question {
  id: string;
  question: string;
  type: "text" | "date" | "number" | "select" | "multiselect" | "yesno" | "textarea";
  required: boolean;
  whyMatters: string;
  examples?: string[];
  helpText?: string;
  placeholder?: string;
  validation?: ValidationConfig;
  followUp?: FollowUpQuestion[];
}

export interface FollowUpQuestion {
  condition: string; // "if answer === 'yes'"
  question: Question;
}

export interface ValidationConfig {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  allowedValues?: string[];
}

export interface RiskFactor {
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  howToMitigate: string;
  detectableVia: string; // Which stage/question detects this?
}

export interface CaseStrengthRule {
  id: string;
  name: string;
  weight: number; // 0-1: how much does this affect case strength?
  evaluate: (context: any) => boolean;
  strengthIfPresent: number; // 0-100: how much stronger is case if true?
  reasoning: string;
}

export interface ValidationRule {
  id: string;
  stage: string;
  rule: string;
  severity: "error" | "warning" | "info";
  validate: (context: any) => boolean | Promise<boolean>;
  onError: string;
  howToFix?: string;
  impact?: string; // "Affects success rate by -30%"
}

export interface CasePattern {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  successRate?: number;
  successReasons?: string[];
  failureReasons?: string[];
  recommendations?: string[];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* PIPELINE CONFIGURATION                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface PipelineStageConfig {
  id: string;
  name: string;
  description: string;
  order: number;
  type:
    | "intake"
    | "research"
    | "analysis"
    | "strategy"
    | "draft"
    | "review"
    | "assembly"
    | "approval"
    | "submission";

  // Input/output
  requires?: string[];
  produces?: string[];
  requiresUserInput?: boolean;
  requiresHumanReview?: boolean;

  // AI configuration
  aiAnalysisPrompt?: string;
  aiGenerationPrompt?: string;

  // Validation
  validates?: string[];
  validationRules?: ValidationRule[];

  // UI configuration
  userGuidance?: string;
  canRevise?: boolean;
  canSkip?: boolean;
}

export interface WorkflowPipelineConfig {
  workflowId: string;
  stages: PipelineStageConfig[];
  validation: ValidationRule[];
  successCriteria: string[];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW OUTCOME & LEARNING                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowOutcome {
  workflowRunId: string;
  workflowId: string;
  userId: string;
  caseStrength: "strong" | "moderate" | "weak" | "unknown";
  documentsIncluded: number;
  documentsRequired: number;
  questionsAnswered: number;
  questionsRequired: number;
  timeToComplete: number; // minutes
  success: boolean;
  successMetric?: string; // "appeal accepted", "benefits restored", etc.
  feedback?: string;
  userRating?: number; // 1-5
  completedAt: string;
}

export interface WorkflowLearnings {
  workflowId: string;
  totalCases: number;
  successRate: number; // 0-1
  averageCaseStrength: "strong" | "moderate" | "weak";

  // Patterns
  successFactors: SuccessFactor[];
  failurePatterns: FailurePattern[];
  strongDocumentCombinations: DocumentCombination[];

  // Recommendations
  recommendedDocuments: string[];
  criticalQuestions: string[];
  commonIssues: CommonIssue[];

  // Metrics
  averageTimeToComplete: number;
  dropoffStages: string[];
  revisionRates: Map<string, number>; // Stage -> revision rate
  successByDocumentCount: Map<number, number>; // Doc count -> success rate

  lastUpdated: string;
}

export interface SuccessFactor {
  name: string;
  impact: number; // 0-1: how much does this affect success?
  frequency: number; // 0-1: how often does this appear in successful cases?
  reasoning: string;
  howToEncourage: string;
}

export interface FailurePattern {
  name: string;
  impact: number; // How much does this reduce success?
  frequency: number; // How often does this cause failures?
  description: string;
  howToPrevent: string;
}

export interface DocumentCombination {
  documents: string[];
  successRate: number;
  frequency: number;
  recommendation: string;
}

export interface CommonIssue {
  issue: string;
  frequency: number; // % of cases affected
  stage: string;
  impact: number; // -1 to 0: how much does this reduce success?
  suggestedFix: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* RESEARCH & PRECEDENT                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface RegulatoryRequirement {
  id: string;
  title: string;
  source: string; // "42 USC 405", "20 CFR 404.900"
  text: string;
  applicableTo: string[];
  deadline?: string;
  requirements: string[];
  exceptions?: string[];
  penalties?: string[];
}

export interface LegalPrecedent {
  id: string;
  caseNumber?: string;
  jurisdiction: string;
  caseType: string;
  outcome: "success" | "failure" | "partial";
  keyFacts: string[];
  successfulArguments?: string[];
  failedArguments?: string[];
  reasoning: string;
  applicability: "high" | "medium" | "low";
  sourceUrl?: string;
}

export interface RegulatoryResearch {
  query: string;
  requirements: RegulatoryRequirement[];
  precedent: LegalPrecedent[];
  agencies: AgencyInfo[];
  deadlines: DeadlineInfo[];
}

export interface AgencyInfo {
  name: string;
  jurisdiction: string;
  procedures: string[];
  contactInfo?: {
    phone?: string;
    website?: string;
    address?: string;
  };
  responseTime?: string;
  appealDeadline?: string;
}

export interface DeadlineInfo {
  event: string;
  deadline: string;
  format: "days" | "calendar_date";
  fromEvent?: string; // "from denial date"
  consequences: string[];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW INTELLIGENCE SERVICE                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowIntelligenceService {
  // Analysis
  analyzeWorkflow(spec: WorkflowSpecification): Promise<WorkflowAnalysis>;
  researchRegulations(query: string, context: any): Promise<RegulatoryResearch>;

  // Generation
  generatePipeline(analysis: WorkflowAnalysis): Promise<PipelineStageConfig[]>;
  generateQuestions(analysis: WorkflowAnalysis): Promise<Question[]>;
  generateValidationRules(analysis: WorkflowAnalysis): Promise<ValidationRule[]>;

  // Learning
  learnFromOutcomes(workflowId: string): Promise<WorkflowLearnings>;
  updateWorkflowFromLearnings(
    workflowId: string,
    learnings: WorkflowLearnings
  ): Promise<void>;

  // Improvement
  analyzeAndImprove(workflowId: string): Promise<WorkflowImprovement[]>;
}

export interface WorkflowImprovement {
  area:
    | "user_experience"
    | "case_strength"
    | "user_guidance"
    | "documentation"
    | "validation"
    | "performance";
  issue: string;
  suggestion: string;
  evidence?: any;
  estimatedImpact?: string;
  implementationEffort?: "low" | "medium" | "high";
  priority?: number; // 1-10
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW DSL SPECIFICATION                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowDSL {
  workflow: {
    id: string;
    name: string;
    goal: string;
    problem_statement?: string;
    success_criteria?: string[];

    regulations?: string[];
    required_documents?: DSLDocument[];
    optional_documents?: DSLDocument[];
    intake_questions?: DSLQuestion[];
    pipeline_stages?: DSLStage[];
    validation_rules?: DSLValidationRule[];
    success_factors?: string[];
    risk_factors?: DSLRiskFactor[];
    outcomes_tracking?: DSLOutcomeMetric[];
  };
}

export interface DSLDocument {
  id: string;
  name: string;
  type?: string;
  why?: string;
  examples?: string[];
  min_count?: number;
}

export interface DSLQuestion {
  id: string;
  question: string;
  type?: string;
  required?: boolean;
  why_matters?: string;
  options?: string[];
}

export interface DSLStage {
  id: string;
  name: string;
  requires?: string | string[];
  auto_generated?: boolean;
  ai_analysis?: boolean;
  ai_generation?: boolean;
}

export interface DSLValidationRule {
  stage: string;
  rule: string;
  severity?: string;
  message?: string;
}

export interface DSLRiskFactor {
  name: string;
  description?: string;
  howto_fix?: string;
}

export interface DSLOutcomeMetric {
  metric: string;
  label: string;
}
