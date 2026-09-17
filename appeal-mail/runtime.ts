import { getInsuranceAppealRuntimePolicy } from "@mailmypdf/workflows";

export interface AppealMailStartRouteRegistration {
  workflowId: string;
  path: string;
  load: () => Promise<unknown>;
}

export const appealMailStartRoutes = Object.freeze([
  {
    workflowId: "appeal-timely-filing-denial",
    path: "/appeal-mail/workflows/appeal-timely-filing-denial/start/",
    load: () => import("./workflows/appeal-timely-filing-denial/start/index"),
  },
  {
    workflowId: "appeal-car-insurance-claim",
    path: "/appeal-mail/workflows/appeal-car-insurance-claim/start/",
    load: () => import("./workflows/appeal-car-insurance-claim/start/index"),
  },
  {
    workflowId: "appeal-denied-claim",
    path: "/appeal-mail/workflows/appeal-denied-claim/start/",
    load: () => import("./workflows/appeal-denied-claim/start/index"),
  },
  {
    workflowId: "appeal-insurance-claim-denial",
    path: "/appeal-mail/workflows/appeal-insurance-claim-denial/start/",
    load: () => import("./workflows/appeal-insurance-claim-denial/start/index"),
  },
  {
    workflowId: "appeal-medical-insurance-denial",
    path: "/appeal-mail/workflows/appeal-medical-insurance-denial/start/",
    load: () => import("./workflows/appeal-medical-insurance-denial/start/index"),
  },
  {
    workflowId: "appeal-prior-authorization-denial",
    path: "/appeal-mail/workflows/appeal-prior-authorization-denial/start/",
    load: () => import("./workflows/appeal-prior-authorization-denial/start/index"),
  },
  {
    workflowId: "appeal-insurance-coverage-denial",
    path: "/appeal-mail/workflows/appeal-insurance-coverage-denial/start/",
    load: () => import("./workflows/appeal-insurance-coverage-denial/start/index"),
  },
  {
    workflowId: "appeal-medical-necessity-denial",
    path: "/appeal-mail/workflows/appeal-medical-necessity-denial/start/",
    load: () => import("./workflows/appeal-medical-necessity-denial/start/index"),
  },
  {
    workflowId: "appeal-out-of-network-denial",
    path: "/appeal-mail/workflows/appeal-out-of-network-denial/start/",
    load: () => import("./workflows/appeal-out-of-network-denial/start/index"),
  },
  {
    workflowId: "appeal-dental-insurance-denial",
    path: "/appeal-mail/workflows/appeal-dental-insurance-denial/start/",
    load: () => import("./workflows/appeal-dental-insurance-denial/start/index"),
  },
  {
    workflowId: "appeal-life-insurance-denial",
    path: "/appeal-mail/workflows/appeal-life-insurance-denial/start/",
    load: () => import("./workflows/appeal-life-insurance-denial/start/index"),
  },
] as const satisfies readonly AppealMailStartRouteRegistration[]);

export function appealMailStartRouteFor(
  workflowId: string,
): AppealMailStartRouteRegistration | null {
  return appealMailStartRoutes.find((route) => route.workflowId === workflowId) ?? null;
}

/**
 * Vertical-facing runtime policy provider. A replacement host can register this
 * provider with the shared WorkflowRuntimePolicyRegistry without hard-coding
 * Appeal Mail workflow IDs.
 */
export const appealMailRuntimePolicyFor = getInsuranceAppealRuntimePolicy;
