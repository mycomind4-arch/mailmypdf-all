import { Link } from "@tanstack/react-router";

export type ProductPlaceholderPageProps = {
  product: string;
  title: string;
  description: string;
  path: string;
};

/** Stable public fallback for routes whose owning vertical is not connected yet. */
export function ProductPlaceholderPage({ product, title, description, path }: ProductPlaceholderPageProps) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
        <div className="postmark w-fit">MailMyPDF / {product}</div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{path}</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
        <div className="mt-8 rounded-xl border border-rule bg-paper-deep/30 p-6">
          <h2 className="font-serif text-xl">Part of the MailMyPDF ecosystem</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This public URL is reserved for the {product} workflow and will keep the same address when its implementation is connected. Nothing on this page implies that an unfinished workflow is currently executable.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/ecosystem" className="rounded-full border border-rule px-5 py-3 text-sm font-medium hover:bg-muted/50">Explore Products</Link>
          <Link to="/send" className="rounded-full bg-cobalt px-5 py-3 text-sm font-medium text-white">Start Mailing</Link>
        </div>
      </main>
    </div>
  );
}
