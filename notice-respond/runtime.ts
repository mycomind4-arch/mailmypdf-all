import { getNoticeResponseRuntimePolicy } from "@mailmypdf/workflows";

export interface NoticeRespondStartRouteRegistration {
  workflowId: string;
  path: string;
  load: () => Promise<unknown>;
}

export const noticeRespondStartRoutes = Object.freeze([
  {
    workflowId: "cp14-response",
    path: "/notice-respond/workflows/cp14-response/start/",
    load: () => import("./workflows/cp14-response/start/index"),
  },
  {
    workflowId: "cp2000-response",
    path: "/notice-respond/workflows/cp2000-response/start/",
    load: () => import("./workflows/cp2000-response/start/index"),
  },
] as const satisfies readonly NoticeRespondStartRouteRegistration[]);

export function noticeRespondStartRouteFor(
  workflowId: string,
): NoticeRespondStartRouteRegistration | null {
  return (
    noticeRespondStartRoutes.find((route) => route.workflowId === workflowId) ??
    null
  );
}

export const noticeRespondRuntimePolicyFor = getNoticeResponseRuntimePolicy;
