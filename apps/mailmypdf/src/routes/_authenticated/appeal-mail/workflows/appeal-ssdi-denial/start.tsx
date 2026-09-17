import { createFileRoute } from "@tanstack/react-router";
import SsdiDenialWorkflow from "../../../../../../../../appeal-mail/workflows/appeal-ssdi-denial/start";

export const Route = createFileRoute("/_authenticated/appeal-mail/workflows/appeal-ssdi-denial/start")({
  head: () => ({
    meta: [
      { title: "Appeal SSDI Denial — Secure Workflow | MailMyPDF" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SsdiDenialWorkflow,
});
