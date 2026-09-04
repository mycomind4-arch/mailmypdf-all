import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/dispute-mail")({
  head: () => ({ meta: [{ title: "Dispute Mail | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Dispute Mail" route="/dispute-mail" description="Debt, credit, billing, collections, and consumer disputes." />,
});
