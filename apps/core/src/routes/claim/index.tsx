import { createFileRoute } from "@tanstack/react-router";
import { ProductFamilyPage } from "@/components/product-family-page";
export const Route = createFileRoute("/claim/")({ component: () => <ProductFamilyPage product="Claim Proof" route="/claim" description="Evidence-first claim documentation and proof packages." /> });
