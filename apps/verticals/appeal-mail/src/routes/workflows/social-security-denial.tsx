import { createFileRoute } from "@tanstack/react-router";
import { SocialSecurityDenialWorkspace } from "@/components/workflow/social-security-denial-workspace";
import { getWorkflow } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/social-security-denial")({
  head: () => ({ meta: [{ title: "Appeal a Social Security Denial — Appeal Mail" }, { name: "description", content: getWorkflow("social-security-denial").description }, { property: "og:title", content: `${getWorkflow("social-security-denial").title} — Appeal Mail` }, { property: "og:description", content: getWorkflow("social-security-denial").description }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: `${getWorkflow("social-security-denial").title} — Appeal Mail` }, { name: "twitter:description", content: getWorkflow("social-security-denial").description }], links: [{ rel: "canonical", href: "/workflows/social-security-denial" }] }),
  component: () => <SocialSecurityDenialWorkspace />,
});
