import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/studio")({
  component: StudioMovedPage,
});

function StudioMovedPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">Studio moved</p>
        <h1 className="mt-4 text-4xl text-charcoal">Studio is an administrator workspace.</h1>
        <p className="mt-5 text-base leading-7 text-stone">
          Workflow authoring, testing, and publishing now live in the separate MailMyPDF Studio application. Private Office continues to provide matters and customer workflows here.
        </p>
        <Link to="/" className="btn-primary mt-8 inline-flex">Return to Private Office</Link>
      </main>
    </>
  );
}
