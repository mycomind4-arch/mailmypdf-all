import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/govreply")({
  head: () => ({ meta: [{ title: "GovReply | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="GovReply" route="/govreply" description="Government and agency response workflows." />,
});
