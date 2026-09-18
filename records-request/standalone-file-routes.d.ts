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
    "/records-request/workflows/public-records-request/": StandaloneRouteInfo<"/records-request/workflows/public-records-request/">;
    "/records-request/workflows/public-records-request/start/": StandaloneRouteInfo<"/records-request/workflows/public-records-request/start/">;
  }
}

export {};
