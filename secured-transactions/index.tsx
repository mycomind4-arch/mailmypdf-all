import { createFileRoute } from "@tanstack/react-router";
import { SectionLandingPage } from "@mailmypdf/design-system";
import { createSectionHead } from "@mailmypdf/seo";
import securedTransactionsConfig from "./config";

export const Route = createFileRoute("/secured-transactions/")({
  head: () => createSectionHead(securedTransactionsConfig),
  component: () => <SectionLandingPage config={securedTransactionsConfig} />,
});
