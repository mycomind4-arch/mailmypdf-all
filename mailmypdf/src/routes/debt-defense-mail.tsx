import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/debt-defense-mail")({
  head: () => ({ meta: [{ title: "DebtDefense Mail | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Dispute Mail" route="/debt-defense-mail" description="Debt validation, collection responses, credit reporting disputes, and related evidence workflows." />,
});
