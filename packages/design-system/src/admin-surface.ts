import type { ElementFactory } from "./public-page.js";
import { createWorkspaceShell, type WorkspaceShellProps } from "./workspace.js";

export interface AdminShellProps extends Omit<WorkspaceShellProps, "productLabel"> {
  productLabel?: string;
}

/** Admin surface built on the same shell contract, with an explicit admin identity. */
export function createAdminShell(h: ElementFactory) {
  const WorkspaceShell = createWorkspaceShell(h);
  return function AdminShell({ productLabel = "Admin Control Plane", ...props }: AdminShellProps) {
    return WorkspaceShell({ ...props, productLabel });
  };
}
