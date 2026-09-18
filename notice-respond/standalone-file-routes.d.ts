import type { AnyRoute } from "@tanstack/react-router";

type StandaloneRouteInfo<TFilePath extends string> = {
  id: TFilePath;
  path: TFilePath;
  fullPath: TFilePath;
  preLoaderRoute: AnyRoute;
  parentRoute: AnyRoute;
};

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/notice-respond/": StandaloneRouteInfo<"/notice-respond/">;
    "/notice-respond/workflows/administrative-hearing-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/administrative-hearing-notice-response/">;
    "/notice-respond/workflows/agency-action-response/": StandaloneRouteInfo<"/notice-respond/workflows/agency-action-response/">;
    "/notice-respond/workflows/appeal-after-notice/": StandaloneRouteInfo<"/notice-respond/workflows/appeal-after-notice/">;
    "/notice-respond/workflows/benefits-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/benefits-notice-response/">;
    "/notice-respond/workflows/civil-summons-response/": StandaloneRouteInfo<"/notice-respond/workflows/civil-summons-response/">;
    "/notice-respond/workflows/compliance-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/compliance-notice-response/">;
    "/notice-respond/workflows/court-summons-response/": StandaloneRouteInfo<"/notice-respond/workflows/court-summons-response/">;
    "/notice-respond/workflows/cp14-response/": StandaloneRouteInfo<"/notice-respond/workflows/cp14-response/">;
    "/notice-respond/workflows/cp2000-response/": StandaloneRouteInfo<"/notice-respond/workflows/cp2000-response/">;
    "/notice-respond/workflows/cp3219a-response/": StandaloneRouteInfo<"/notice-respond/workflows/cp3219a-response/">;
    "/notice-respond/workflows/cp504-response/": StandaloneRouteInfo<"/notice-respond/workflows/cp504-response/">;
    "/notice-respond/workflows/cp504-response/start/": StandaloneRouteInfo<"/notice-respond/workflows/cp504-response/start/">;
    "/notice-respond/workflows/cp90-collection-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/cp90-collection-notice-response/">;
    "/notice-respond/workflows/deadline-extension-request/": StandaloneRouteInfo<"/notice-respond/workflows/deadline-extension-request/">;
    "/notice-respond/workflows/document-request-response/": StandaloneRouteInfo<"/notice-respond/workflows/document-request-response/">;
    "/notice-respond/workflows/evidence-request-response/": StandaloneRouteInfo<"/notice-respond/workflows/evidence-request-response/">;
    "/notice-respond/workflows/follow-up-after-notice-submission/": StandaloneRouteInfo<"/notice-respond/workflows/follow-up-after-notice-submission/">;
    "/notice-respond/workflows/government-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/government-notice-response/">;
    "/notice-respond/workflows/irs-30-day-letter-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-30-day-letter-response/">;
    "/notice-respond/workflows/irs-audit-letter-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-audit-letter-response/">;
    "/notice-respond/workflows/irs-balance-due-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-balance-due-notice-response/">;
    "/notice-respond/workflows/irs-identity-information-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-identity-information-notice-response/">;
    "/notice-respond/workflows/irs-income-tax-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-income-tax-notice-response/">;
    "/notice-respond/workflows/irs-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-notice-response/">;
    "/notice-respond/workflows/irs-penalty-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-penalty-notice-response/">;
    "/notice-respond/workflows/irs-underreporter-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/irs-underreporter-notice-response/">;
    "/notice-respond/workflows/licensing-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/licensing-notice-response/">;
    "/notice-respond/workflows/notice-disagreement-response/": StandaloneRouteInfo<"/notice-respond/workflows/notice-disagreement-response/">;
    "/notice-respond/workflows/regulatory-deficiency-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/regulatory-deficiency-notice-response/">;
    "/notice-respond/workflows/state-revenue-department-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/state-revenue-department-notice-response/">;
    "/notice-respond/workflows/state-tax-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/state-tax-notice-response/">;
    "/notice-respond/workflows/unemployment-notice-response/": StandaloneRouteInfo<"/notice-respond/workflows/unemployment-notice-response/">;
    "/notice-respond/workflows/cp14-response/start/": StandaloneRouteInfo<"/notice-respond/workflows/cp14-response/start/">;
    "/notice-respond/workflows/cp2000-response/start/": StandaloneRouteInfo<"/notice-respond/workflows/cp2000-response/start/">;
  }
}

export {};
