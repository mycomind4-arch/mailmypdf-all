import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/private-office")({
  head: () => ({ meta: [{ title: "Private Office | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Private Office" route="/private-office" description="Professional correspondence with evidence, approval gates, certified mailing, and durable proof." />,
});
