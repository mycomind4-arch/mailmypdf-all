import { getRecordsRequestRuntimePolicy } from "@mailmypdf/workflows";

export interface RecordsRequestStartRouteRegistration {
  workflowId: string;
  path: string;
  load: () => Promise<unknown>;
}

export const recordsRequestStartRoutes = Object.freeze([
  {
    workflowId: "agency-records-request",
    path: "/records-request/workflows/agency-records-request/start/",
    load: () => import("./workflows/agency-records-request/start/index"),
  },
  {
    workflowId: "government-documents-request",
    path: "/records-request/workflows/government-documents-request/start/",
    load: () => import("./workflows/government-documents-request/start/index"),
  },
  {
    workflowId: "open-records-request",
    path: "/records-request/workflows/open-records-request/start/",
    load: () => import("./workflows/open-records-request/start/index"),
  },
  {
    workflowId: "public-records-request",
    path: "/records-request/workflows/public-records-request/start/",
    load: () => import("./workflows/public-records-request/start/index"),
  },
] as const satisfies readonly RecordsRequestStartRouteRegistration[]);

export function recordsRequestStartRouteFor(
  workflowId: string,
): RecordsRequestStartRouteRegistration | null {
  return recordsRequestStartRoutes.find((route) => route.workflowId === workflowId) ?? null;
}

export const recordsRequestRuntimePolicyFor = getRecordsRequestRuntimePolicy;
