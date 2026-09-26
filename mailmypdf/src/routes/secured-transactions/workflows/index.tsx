import { createFileRoute } from "@tanstack/react-router"
import { SectionWorkflowDirectoryPage } from "@mailmypdf/design-system"
import securedTransactionsConfig from "../../../../../secured-transactions/config"
import { WORKFLOW_NAV_SECTIONS } from "@/lib/workflow-navigation"
import { absoluteUrl } from "@/lib/site-url"

const section = WORKFLOW_NAV_SECTIONS.find((item) => item.id === "secured-transactions")
const workflows = section?.workflows ?? []

export const Route = createFileRoute("/secured-transactions/workflows/")({
  head: () => {
    const canonical = absoluteUrl("/secured-transactions/workflows")
    const title = "Secured Transactions Workflows | MailMyPDF"
    const description = "Browse evidence-first workflows for identity, capacity, obligations, collateral, governing law, filing, perfection, priority, and secured-transaction lifecycle review."
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index,follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    }
  },
  component: () => <SectionWorkflowDirectoryPage config={securedTransactionsConfig} workflows={workflows} />,
})
