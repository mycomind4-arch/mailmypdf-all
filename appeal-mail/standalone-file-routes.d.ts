import type { AnyRoute } from "@tanstack/react-router";

/**
 * Standalone type map for the Appeal Mail vertical.
 *
 * The deployment host will generate its own concrete route tree. This file
 * exists so the independently testable vertical retains exact file-path
 * checking before it is mounted by that host.
 */
type StandaloneRouteInfo<TFilePath extends string> = {
  id: TFilePath;
  path: TFilePath;
  fullPath: TFilePath;
  preLoaderRoute: AnyRoute;
  parentRoute: AnyRoute;
};

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/appeal-mail/": StandaloneRouteInfo<"/appeal-mail/">;
    "/appeal-mail/workflows/appeal-car-insurance-claim/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-car-insurance-claim/">;
    "/appeal-mail/workflows/appeal-car-insurance-claim/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-car-insurance-claim/start/">;
    "/appeal-mail/workflows/appeal-denied-claim/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-denied-claim/">;
    "/appeal-mail/workflows/appeal-denied-claim/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-denied-claim/start/">;
    "/appeal-mail/workflows/appeal-dental-insurance-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-dental-insurance-denial/">;
    "/appeal-mail/workflows/appeal-dental-insurance-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-dental-insurance-denial/start/">;
    "/appeal-mail/workflows/appeal-edd-disqualification/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-edd-disqualification/">;
    "/appeal-mail/workflows/appeal-financial-aid-decision/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-financial-aid-decision/">;
    "/appeal-mail/workflows/appeal-government-decision/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-government-decision/">;
    "/appeal-mail/workflows/appeal-insurance-claim-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-insurance-claim-denial/">;
    "/appeal-mail/workflows/appeal-insurance-claim-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-insurance-claim-denial/start/">;
    "/appeal-mail/workflows/appeal-insurance-coverage-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-insurance-coverage-denial/">;
    "/appeal-mail/workflows/appeal-insurance-coverage-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-insurance-coverage-denial/start/">;
    "/appeal-mail/workflows/appeal-life-insurance-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-life-insurance-denial/">;
    "/appeal-mail/workflows/appeal-life-insurance-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-life-insurance-denial/start/">;
    "/appeal-mail/workflows/appeal-medicaid-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medicaid-denial/">;
    "/appeal-mail/workflows/appeal-medical-insurance-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medical-insurance-denial/">;
    "/appeal-mail/workflows/appeal-medical-insurance-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medical-insurance-denial/start/">;
    "/appeal-mail/workflows/appeal-medical-necessity-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medical-necessity-denial/">;
    "/appeal-mail/workflows/appeal-medical-necessity-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medical-necessity-denial/start/">;
    "/appeal-mail/workflows/appeal-medicare-claim-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-medicare-claim-denial/">;
    "/appeal-mail/workflows/appeal-out-of-network-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-out-of-network-denial/">;
    "/appeal-mail/workflows/appeal-out-of-network-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-out-of-network-denial/start/">;
    "/appeal-mail/workflows/appeal-prior-authorization-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-prior-authorization-denial/">;
    "/appeal-mail/workflows/appeal-prior-authorization-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-prior-authorization-denial/start/">;
    "/appeal-mail/workflows/appeal-social-security-decision/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-social-security-decision/">;
    "/appeal-mail/workflows/appeal-social-security-overpayment/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-social-security-overpayment/">;
    "/appeal-mail/workflows/appeal-ssdi-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-ssdi-denial/">;
    "/appeal-mail/workflows/appeal-ssdi-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-ssdi-denial/start/">;
    "/appeal-mail/workflows/appeal-ssi-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-ssi-denial/">;
    "/appeal-mail/workflows/appeal-timely-filing-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-timely-filing-denial/">;
    "/appeal-mail/workflows/appeal-timely-filing-denial/start/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-timely-filing-denial/start/">;
    "/appeal-mail/workflows/appeal-unemployment-denial/": StandaloneRouteInfo<"/appeal-mail/workflows/appeal-unemployment-denial/">;
    "/appeal-mail/workflows/dmv-suspension-revocation-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/dmv-suspension-revocation-appeal/">;
    "/appeal-mail/workflows/fafsa-special-circumstances-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/fafsa-special-circumstances-appeal/">;
    "/appeal-mail/workflows/financial-aid-reinstatement/": StandaloneRouteInfo<"/appeal-mail/workflows/financial-aid-reinstatement/">;
    "/appeal-mail/workflows/financial-aid-suspension-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/financial-aid-suspension-appeal/">;
    "/appeal-mail/workflows/license-suspension-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/license-suspension-appeal/">;
    "/appeal-mail/workflows/request-reconsideration/": StandaloneRouteInfo<"/appeal-mail/workflows/request-reconsideration/">;
    "/appeal-mail/workflows/respond-insurance-denial-letter/": StandaloneRouteInfo<"/appeal-mail/workflows/respond-insurance-denial-letter/">;
    "/appeal-mail/workflows/sap-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/sap-appeal/">;
    "/appeal-mail/workflows/scholarship-appeal/": StandaloneRouteInfo<"/appeal-mail/workflows/scholarship-appeal/">;
  }
}

export {};
