import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/benefits-appeal")({
  head: () => ({ meta: [{ title: "Benefits Appeal | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Benefits Appeal" route="/benefits-appeal" description="Benefits denials, reconsideration, documentation, and review preparation." />,
});
