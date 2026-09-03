/**
 * Admin Analytics & Insights
 *
 * Provides real-time platform metrics and analytics data
 * for the chat agent to reason about and provide recommendations
 */

import { logger } from "@/lib/security";

/* ─────────────────────────────────────────────────────────────────────────── */
/* PLATFORM ANALYTICS                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface PlatformMetrics {
  totalWorkflows: number;
  totalVerticals: number;
  totalUsers: number;
  activeUsers24h: number;
  avgCompletionRate: number;
  topWorkflows: Array<{
    id: string;
    name: string;
    views: number;
    completions: number;
    conversionRate: number;
  }>;
  bottomWorkflows: Array<{
    id: string;
    name: string;
    views: number;
    completions: number;
    conversionRate: number;
  }>;
  byVertical: Record<
    string,
    {
      workflows: number;
      users: number;
      avgCompletion: number;
    }
  >;
  revenueMetrics: {
    totalRevenue: number;
    avgOrderValue: number;
    conversionRate: number;
  };
}

export interface WorkflowPerformance {
  workflowId: string;
  name: string;
  vertical: string;
  views: number;
  starts: number;
  completions: number;
  startRate: number; // % of viewers who start
  completionRate: number; // % of starters who complete
  avgTimeToComplete: number; // minutes
  abandonmentPoints: string[]; // Stages where users drop off
  commonIssues: string[];
  improvements: string[];
}

export interface UserSegment {
  name: string;
  size: number;
  avgCompletionRate: number;
  preferredWorkflows: string[];
  churnRate: number;
  ltv: number; // Lifetime value
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ANALYTICS QUERIES                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get overall platform metrics
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  logger.info("Fetching platform metrics");

  // In production, query from database
  // For now, return mock data
  return {
    totalWorkflows: 24,
    totalVerticals: 6,
    totalUsers: 1250,
    activeUsers24h: 342,
    avgCompletionRate: 0.68,
    topWorkflows: [
      {
        id: "uscis-gc-appeal",
        name: "USCIS Green Card Appeal",
        views: 2841,
        completions: 1932,
        conversionRate: 0.68,
      },
      {
        id: "cp2000-response",
        name: "CP2000 Response",
        views: 2156,
        completions: 1407,
        conversionRate: 0.65,
      },
      {
        id: "debt-collection-response",
        name: "Debt Collection Response",
        views: 1834,
        completions: 1301,
        conversionRate: 0.71,
      },
    ],
    bottomWorkflows: [
      {
        id: "visa-application",
        name: "Visa Application Response",
        views: 234,
        completions: 89,
        conversionRate: 0.38,
      },
      {
        id: "housing-eviction",
        name: "Housing Eviction Response",
        views: 167,
        completions: 42,
        conversionRate: 0.25,
      },
    ],
    byVertical: {
      "immigration-mail": {
        workflows: 4,
        users: 485,
        avgCompletion: 0.72,
      },
      "dispute-mail": {
        workflows: 3,
        users: 342,
        avgCompletion: 0.71,
      },
      "cp-correspondence": {
        workflows: 2,
        users: 263,
        avgCompletion: 0.65,
      },
      "appeal-mail": {
        workflows: 5,
        users: 98,
        avgCompletion: 0.58,
      },
      "records-request": {
        workflows: 6,
        users: 42,
        avgCompletion: 0.48,
      },
      "housing-mail": {
        workflows: 4,
        users: 20,
        avgCompletion: 0.35,
      },
    },
    revenueMetrics: {
      totalRevenue: 185400,
      avgOrderValue: 148.32,
      conversionRate: 0.28,
    },
  };
}

/**
 * Get detailed performance for a workflow
 */
export async function getWorkflowPerformance(
  workflowId: string
): Promise<WorkflowPerformance> {
  logger.info("Fetching workflow performance", { workflowId });

  // Mock data
  return {
    workflowId,
    name: "USCIS Green Card Appeal",
    vertical: "immigration-mail",
    views: 2841,
    starts: 1932,
    completions: 1932,
    startRate: 0.68,
    completionRate: 1.0,
    avgTimeToComplete: 45,
    abandonmentPoints: [],
    commonIssues: [
      "Users need more guidance on document gathering",
      "Some confusion about USCIS form references",
    ],
    improvements: [
      "Add video tutorials for document collection",
      "Create USCIS form lookup tool",
      "Include sample completed forms",
    ],
  };
}

/**
 * Get user segment analysis
 */
export async function getUserSegments(): Promise<UserSegment[]> {
  logger.info("Fetching user segments");

  return [
    {
      name: "High-Value Immigration Users",
      size: 156,
      avgCompletionRate: 0.85,
      preferredWorkflows: ["uscis-gc-appeal", "visa-application"],
      churnRate: 0.05,
      ltv: 2840,
    },
    {
      name: "Tax/IRS Filers",
      size: 263,
      avgCompletionRate: 0.65,
      preferredWorkflows: ["cp2000-response"],
      churnRate: 0.12,
      ltv: 890,
    },
    {
      name: "Debt/Dispute Resolvers",
      size: 342,
      avgCompletionRate: 0.71,
      preferredWorkflows: ["debt-collection-response"],
      churnRate: 0.18,
      ltv: 645,
    },
    {
      name: "Trial Users",
      size: 489,
      avgCompletionRate: 0.32,
      preferredWorkflows: [],
      churnRate: 0.65,
      ltv: 0,
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* INTELLIGENT RECOMMENDATIONS                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface Recommendation {
  category: string; // "performance" | "revenue" | "user-experience" | "engagement"
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: string;
  action: string; // What to do about it
  metrics: {
    current: number | string;
    potential: number | string;
  };
}

/**
 * Generate intelligent recommendations based on analytics
 */
export async function generateRecommendations(): Promise<Recommendation[]> {
  logger.info("Generating analytics-based recommendations");

  const metrics = await getPlatformMetrics();
  const segments = await getUserSegments();
  const recommendations: Recommendation[] = [];

  // Recommendation 1: Low-performing workflows
  const lowPerformers = metrics.bottomWorkflows;
  if (lowPerformers.length > 0) {
    recommendations.push({
      category: "performance",
      priority: "high",
      title: "Improve Low-Converting Workflows",
      description: `${lowPerformers[0].name} has a ${(lowPerformers[0].conversionRate * 100).toFixed(1)}% conversion rate, compared to your average ${(metrics.avgCompletionRate * 100).toFixed(1)}%.`,
      expectedImpact: `If you improve this to your average, you could gain ~${Math.round((metrics.avgCompletionRate - lowPerformers[0].conversionRate) * lowPerformers[0].views)} additional completions`,
      action: `Review the workflow stages, add more guidance, or split into multiple specialized workflows.`,
      metrics: {
        current: `${lowPerformers[0].conversionRate * 100}%`,
        potential: `${metrics.avgCompletionRate * 100}%`,
      },
    });
  }

  // Recommendation 2: High-churn segments
  const highChurn = segments.filter((s) => s.churnRate > 0.4);
  if (highChurn.length > 0) {
    recommendations.push({
      category: "engagement",
      priority: "high",
      title: "Reduce Churn in Trial Segment",
      description: `Your trial users have a ${(highChurn[0].churnRate * 100).toFixed(0)}% churn rate. Most never complete their first workflow.`,
      expectedImpact: `Converting 20% of churners would add ${Math.round(highChurn[0].size * 0.2)} new customers`,
      action: `Send in-app guidance during critical stages, offer live support, or create a simpler onboarding workflow.`,
      metrics: {
        current: `${highChurn[0].churnRate * 100}% churn`,
        potential: `25% churn`,
      },
    });
  }

  // Recommendation 3: Underutilized verticals
  const underutilized = Object.entries(metrics.byVertical).filter(
    ([_, data]) => data.users < 100
  );
  if (underutilized.length > 0) {
    recommendations.push({
      category: "revenue",
      priority: "medium",
      title: "Grow Underutilized Verticals",
      description: `Housing Mail and Records Request have only ${underutilized[0][1].users} combined users. These are high-margin opportunities.`,
      expectedImpact: `At your current CAC, acquiring 100 users per vertical could generate $30-50K additional revenue`,
      action: `Launch targeted marketing campaigns, create case studies, or add missing workflow variants.`,
      metrics: {
        current: `${underutilized[0][1].users} users`,
        potential: `200+ users`,
      },
    });
  }

  // Recommendation 4: High-value segment retention
  const highValue = segments.find((s) => s.ltv > 1000);
  if (highValue) {
    recommendations.push({
      category: "revenue",
      priority: "high",
      title: "Upsell High-Value Users",
      description: `Your ${highValue.name} segment has an LTV of $${highValue.ltv} with only ${highValue.churnRate * 100}% churn. These are your best customers.`,
      expectedImpact: `A 5% LTV increase would add $${Math.round(highValue.size * highValue.ltv * 0.05)} annually`,
      action: `Create premium features, multi-case discounts, or dedicated support for this segment.`,
      metrics: {
        current: `$${highValue.ltv} LTV`,
        potential: `$${Math.round(highValue.ltv * 1.25)} LTV`,
      },
    });
  }

  return recommendations;
}

/**
 * Get comparative performance (workflow vs vertical average)
 */
export async function getComparativeAnalysis(
  workflowId: string,
  verticalId: string
): Promise<{
  workflow: WorkflowPerformance;
  verticalAverage: {
    completionRate: number;
    avgTimeToComplete: number;
  };
  analysis: string;
}> {
  const workflow = await getWorkflowPerformance(workflowId);
  const metrics = await getPlatformMetrics();
  const verticalData = metrics.byVertical[verticalId];

  const analysis =
    workflow.completionRate > (verticalData?.avgCompletion || 0)
      ? `This workflow outperforms your ${verticalId} vertical average by ${Math.round((workflow.completionRate - (verticalData?.avgCompletion || 0)) * 100)}%.`
      : `This workflow underperforms your ${verticalId} vertical average by ${Math.round(((verticalData?.avgCompletion || 0) - workflow.completionRate) * 100)}%.`;

  return {
    workflow,
    verticalAverage: {
      completionRate: verticalData?.avgCompletion || 0,
      avgTimeToComplete: 35,
    },
    analysis,
  };
}
