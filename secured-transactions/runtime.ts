import type { SecuredTransactionWorkflowId } from "./shared/config/workflow-registry";

export interface SecuredTransactionStartRouteRegistration {
  workflowId: SecuredTransactionWorkflowId;
  path: string;
  load: () => Promise<unknown>;
}

export const securedTransactionStartRoutes = Object.freeze([
  {
    workflowId: "name-capacity-resolution",
    path: "/secured-transactions/workflows/name-capacity-resolution/start/",
    load: () => import("./workflows/name-capacity-resolution/start/index"),
  },
  {
    workflowId: "secured-transaction-eligibility",
    path: "/secured-transactions/workflows/secured-transaction-eligibility/start/",
    load: () => import("./workflows/secured-transaction-eligibility/start/index"),
  },
  {
    workflowId: "obligation-value",
    path: "/secured-transactions/workflows/obligation-value/start/",
    load: () => import("./workflows/obligation-value/start/index"),
  },
  {
    workflowId: "collateral-ownership-classification",
    path: "/secured-transactions/workflows/collateral-ownership-classification/start/",
    load: () => import("./workflows/collateral-ownership-classification/start/index"),
  },
  {
    workflowId: "governing-law-filing-jurisdiction",
    path: "/secured-transactions/workflows/governing-law-filing-jurisdiction/start/",
    load: () => import("./workflows/governing-law-filing-jurisdiction/start/index"),
  },
  {
    workflowId: "pre-filing-lien-priority-search",
    path: "/secured-transactions/workflows/pre-filing-lien-priority-search/start/",
    load: () => import("./workflows/pre-filing-lien-priority-search/start/index"),
  },
  {
    workflowId: "priority-strategy",
    path: "/secured-transactions/workflows/priority-strategy/start/",
    load: () => import("./workflows/priority-strategy/start/index"),
  },
  {
    workflowId: "security-agreement-generation",
    path: "/secured-transactions/workflows/security-agreement-generation/start/",
    load: () => import("./workflows/security-agreement-generation/start/index"),
  },
  {
    workflowId: "attachment-certification",
    path: "/secured-transactions/workflows/attachment-certification/start/",
    load: () => import("./workflows/attachment-certification/start/index"),
  },
  {
    workflowId: "perfection-method-selection",
    path: "/secured-transactions/workflows/perfection-method-selection/start/",
    load: () => import("./workflows/perfection-method-selection/start/index"),
  },
  {
    workflowId: "ucc1-preparation-authorization",
    path: "/secured-transactions/workflows/ucc1-preparation-authorization/start/",
    load: () => import("./workflows/ucc1-preparation-authorization/start/index"),
  },
  {
    workflowId: "perfection-execution",
    path: "/secured-transactions/workflows/perfection-execution/start/",
    load: () => import("./workflows/perfection-execution/start/index"),
  },
  {
    workflowId: "post-perfection-verification",
    path: "/secured-transactions/workflows/post-perfection-verification/start/",
    load: () => import("./workflows/post-perfection-verification/start/index"),
  },
  {
    workflowId: "first-priority-determination",
    path: "/secured-transactions/workflows/first-priority-determination/start/",
    load: () => import("./workflows/first-priority-determination/start/index"),
  },
  {
    workflowId: "priority-remediation",
    path: "/secured-transactions/workflows/priority-remediation/start/",
    load: () => import("./workflows/priority-remediation/start/index"),
  },
  {
    workflowId: "priority-preservation-monitoring",
    path: "/secured-transactions/workflows/priority-preservation-monitoring/start/",
    load: () => import("./workflows/priority-preservation-monitoring/start/index"),
  },
  {
    workflowId: "amendment-continuation-assignment-termination",
    path: "/secured-transactions/workflows/amendment-continuation-assignment-termination/start/",
    load: () => import("./workflows/amendment-continuation-assignment-termination/start/index"),
  },
] as const satisfies readonly SecuredTransactionStartRouteRegistration[]);

export function securedTransactionStartRouteFor(workflowId: string): SecuredTransactionStartRouteRegistration | null {
  return securedTransactionStartRoutes.find((route) => route.workflowId === workflowId) ?? null;
}
