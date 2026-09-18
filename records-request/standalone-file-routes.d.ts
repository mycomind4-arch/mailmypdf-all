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
    "/records-request/": StandaloneRouteInfo<"/records-request/">;
    "/records-request/workflows/agency-records-request/": StandaloneRouteInfo<"/records-request/workflows/agency-records-request/">;
    "/records-request/workflows/agency-records-request/start/": StandaloneRouteInfo<"/records-request/workflows/agency-records-request/start/">;
    "/records-request/workflows/arrest-records-request/": StandaloneRouteInfo<"/records-request/workflows/arrest-records-request/">;
    "/records-request/workflows/background-check-records-request/": StandaloneRouteInfo<"/records-request/workflows/background-check-records-request/">;
    "/records-request/workflows/birth-certificate-request/": StandaloneRouteInfo<"/records-request/workflows/birth-certificate-request/">;
    "/records-request/workflows/birth-records-request/": StandaloneRouteInfo<"/records-request/workflows/birth-records-request/">;
    "/records-request/workflows/code-enforcement-records-request/": StandaloneRouteInfo<"/records-request/workflows/code-enforcement-records-request/">;
    "/records-request/workflows/court-records-request/": StandaloneRouteInfo<"/records-request/workflows/court-records-request/">;
    "/records-request/workflows/criminal-history-request/": StandaloneRouteInfo<"/records-request/workflows/criminal-history-request/">;
    "/records-request/workflows/criminal-records-request/": StandaloneRouteInfo<"/records-request/workflows/criminal-records-request/">;
    "/records-request/workflows/death-records-request/": StandaloneRouteInfo<"/records-request/workflows/death-records-request/">;
    "/records-request/workflows/divorce-records-request/": StandaloneRouteInfo<"/records-request/workflows/divorce-records-request/">;
    "/records-request/workflows/education-records-request/": StandaloneRouteInfo<"/records-request/workflows/education-records-request/">;
    "/records-request/workflows/employment-records-request/": StandaloneRouteInfo<"/records-request/workflows/employment-records-request/">;
    "/records-request/workflows/foia-police-records-request/": StandaloneRouteInfo<"/records-request/workflows/foia-police-records-request/">;
    "/records-request/workflows/foia-request/": StandaloneRouteInfo<"/records-request/workflows/foia-request/">;
    "/records-request/workflows/government-documents-request/": StandaloneRouteInfo<"/records-request/workflows/government-documents-request/">;
    "/records-request/workflows/government-documents-request/start/": StandaloneRouteInfo<"/records-request/workflows/government-documents-request/start/">;
    "/records-request/workflows/marriage-records-request/": StandaloneRouteInfo<"/records-request/workflows/marriage-records-request/">;
    "/records-request/workflows/medical-records-request/": StandaloneRouteInfo<"/records-request/workflows/medical-records-request/">;
    "/records-request/workflows/military-records-request/": StandaloneRouteInfo<"/records-request/workflows/military-records-request/">;
    "/records-request/workflows/open-records-request/": StandaloneRouteInfo<"/records-request/workflows/open-records-request/">;
    "/records-request/workflows/open-records-request/start/": StandaloneRouteInfo<"/records-request/workflows/open-records-request/start/">;
    "/records-request/workflows/permit-records-request/": StandaloneRouteInfo<"/records-request/workflows/permit-records-request/">;
    "/records-request/workflows/police-records-request/": StandaloneRouteInfo<"/records-request/workflows/police-records-request/">;
    "/records-request/workflows/police-report-copy-request/": StandaloneRouteInfo<"/records-request/workflows/police-report-copy-request/">;
    "/records-request/workflows/police-report-request/": StandaloneRouteInfo<"/records-request/workflows/police-report-request/">;
    "/records-request/workflows/property-records-request/": StandaloneRouteInfo<"/records-request/workflows/property-records-request/">;
    "/records-request/workflows/public-information-request/": StandaloneRouteInfo<"/records-request/workflows/public-information-request/">;
    "/records-request/workflows/public-records-request/": StandaloneRouteInfo<"/records-request/workflows/public-records-request/">;
    "/records-request/workflows/public-records-request/start/": StandaloneRouteInfo<"/records-request/workflows/public-records-request/start/">;
    "/records-request/workflows/records-denial-appeal-request/": StandaloneRouteInfo<"/records-request/workflows/records-denial-appeal-request/">;
    "/records-request/workflows/records-follow-up-request/": StandaloneRouteInfo<"/records-request/workflows/records-follow-up-request/">;
    "/records-request/workflows/school-records-request/": StandaloneRouteInfo<"/records-request/workflows/school-records-request/">;
  }
}

export {};
