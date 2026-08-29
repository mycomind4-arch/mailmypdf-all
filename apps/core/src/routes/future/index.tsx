import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/future/")({ component: () => <ProductFamilyPage product="Future Mail" route="/future" description="Reserved space for additional MailMyPDF workflows." /> });
