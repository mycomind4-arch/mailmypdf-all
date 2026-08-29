import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/tenant/")({ component: () => <ProductFamilyPage product="Tenant Reply" route="/tenant" description="Tenant notices, repair correspondence, and housing responses." /> });
