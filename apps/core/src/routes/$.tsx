import { createFileRoute } from "@tanstack/react-router";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";

const PRODUCT_FAMILIES: Record<string, { product: string; title: string; description: string }> = {
  appeal: { product: "Appeal Mail", title: "Appeal workflow", description: "Prepare a documented appeal with the MailMyPDF workflow engine." },
  notice: { product: "Notice Respond", title: "Notice response workflow", description: "Organize a notice, understand its requirements, prepare a response, and preserve the mailing record." },
  immigration: { product: "Immigration Mail", title: "Immigration correspondence workflow", description: "Prepare immigration-related correspondence and supporting documents with source-grounded review." },
  dispute: { product: "Dispute Mail", title: "Dispute workflow", description: "Build an evidence-backed dispute, review it, and preserve what you sent." },
  business: { product: "Small Business Mail", title: "Business correspondence workflow", description: "Automate or prepare business correspondence with approval and audit controls." },
  records: { product: "Records Request", title: "Records request workflow", description: "Prepare a focused records or information request with recipient, deadline, and proof handling." },
  tenant: { product: "Tenant Reply", title: "Tenant response workflow", description: "Prepare a documented housing or tenant-related response." },
  permit: { product: "Permit Reply", title: "Permit response workflow", description: "Prepare a permit, licensing, or regulatory response with requirement-aware review." },
  benefits: { product: "Benefits Appeal", title: "Benefits appeal workflow", description: "Prepare a benefits-related appeal using source documents, evidence, deadlines, and review." },
  claim: { product: "Claim Proof", title: "Claim proof workflow", description: "Organize claim evidence and preserve a traceable proof package." },
  govreply: { product: "GovReply", title: "Government response workflow", description: "Prepare a response to a government notice, request, or agency action." },
  future: { product: "MailMyPDF", title: "MailMyPDF workflow", description: "This reserved MailMyPDF URL is part of the canonical future workflow graph." },
};

function familyFor(path: string) {
  const family = path.split("/").filter(Boolean)[0] ?? "future";
  return PRODUCT_FAMILIES[family];
}

export const Route = createFileRoute("/$")({
  component: ReservedPublicRoute,
  head: ({ params }) => {
    const path = `/${params._splat ?? ""}`;
    const family = familyFor(path);
    return {
      meta: [
        { title: `${family?.title ?? "MailMyPDF workflow"} — MailMyPDF` },
        { name: "description", content: family?.description ?? "A reserved MailMyPDF workflow URL." },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
});

function ReservedPublicRoute() {
  const { _splat } = Route.useParams();
  const path = `/${_splat ?? ""}`;
  const family = familyFor(path);

  if (!family) {
    return <ProductPlaceholderPage product="MailMyPDF" title="Page not found" description="The requested MailMyPDF URL does not exist." path={path} />;
  }

  return <ProductPlaceholderPage product={family.product} title={family.title} description={family.description} path={path} />;
}
