import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";

export const Route = createFileRoute("/appeal-reply")({
  head: () => ({ meta: [{ title: "Appeal Mail | MailMyPDF" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductFamilyPage product="Appeal Mail" route="/appeal-reply" description="Appeals, reconsiderations, denials, and adverse decisions." />,
});
