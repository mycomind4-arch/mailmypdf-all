/**
 * Appeal Mail — Site Header (re-exports from Ecosystem Shell)
 *
 * This file replaces the old site-header.tsx with the canonical ecosystem shell.
 * All routes that import { SiteHeader } from "@/components/site-header" will
 * automatically use the new shared navigation.
 */

import { EcosystemShell } from "./ecosystem-shell";
import { useShellConfig } from "./ecosystem-shell-config";

export function SiteHeader() {
  const config = useShellConfig();
  return <EcosystemShell config={config} />;
}

// Re-export for compatibility
export { ShellLogo as Logo } from "./ecosystem-shell";
