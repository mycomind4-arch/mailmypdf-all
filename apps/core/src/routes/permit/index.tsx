import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/permit/")({ component: () => <ProductFamilyPage product="Permit Reply" route="/permit" description="Permit, licensing, deficiency, and regulatory response workflows." /> });
