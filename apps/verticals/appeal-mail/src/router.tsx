import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function configuredBasePath() {
  const value = import.meta.env.VITE_APP_BASE_PATH?.trim();
  if (!value || value === "/") return undefined;
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export const getRouter = () => {
  const queryClient = new QueryClient();
  return createRouter({
    routeTree,
    basepath: configuredBasePath(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
