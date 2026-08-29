/**
 * Site Header — re-exports from the canonical Ecosystem Shell.
 * All navigation is standardized across the MailMyPDF ecosystem.
 *
 * Public:  [BRAND] Mail a PDF | Products ▾ | Workflows | How It Works | Pricing | Sign In | Start Now
 * Auth:    [BRAND] Mail a PDF | Products ▾ | Workflows | Recent ▾ | Dashboard | Start Now | Avatar ▾
 */
import { EcosystemShell } from "./ecosystem-shell";
import { useShellConfig } from "./ecosystem-shell-config";

export function SiteHeader() {
  const config = useShellConfig();
  return <EcosystemShell config={config} />;
}

export { ShellLogo as Logo } from "./ecosystem-shell";
