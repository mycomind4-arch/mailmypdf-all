import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route=createFileRoute('/appeal-a-decision')({head:()=>({meta:[{title:'How to Appeal a Decision | Build and Send an Appeal | Appeal Mail'},{name:'description',content:'Organize a decision, deadline, evidence, and appeal grounds in one workflow. Draft, review, stress-test, and mail an appeal with a documented filing record.'}],links:[{rel:'canonical',href:'/appeal-a-decision'}]}),component:Page});
function Page(){return <div className="min-h-screen"><SiteHeader/><main>
<section className="relative overflow-hidden border-b border-rule/60">
  <div className="absolute inset-0 -z-10" style={{backgroundImage:"url(https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/5a2f48786_generated_image.png)",backgroundSize:"cover",backgroundPosition:"center",opacity:0.20}}/>
  <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
    <div className="postmark w-fit">Appeal a decision</div>
    <h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Appeal a Decision Without Starting From a Blank Page</h1>
    <p className="mt-7 max-w-2xl text-xl text-ink-soft">Upload the decision and supporting documents. Appeal Mail helps reconstruct the record, identify evidence-backed appeal grounds, test the draft, and prepare the final mailing.</p>
    <Link to="/workflows/government-decision" className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground">Start an appeal →</Link>
  </div>
</section>
<section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">A stronger appeal workflow</h2><div className="mt-10 grid gap-5 md:grid-cols-4">{[['01','Decision','Identify the decision, stated reasons, dates, and review pathway.'],['02','Evidence','Connect documents and facts to each proposed ground.'],['03','Stress test','Look for unsupported claims, contradictions, gaps, and weak arguments before sending.'],['04','Proof','Mail the reviewed appeal and preserve the filing and delivery record.']].map(([n,t,d])=><article className="envelope-card p-6" key={n}><b className="font-mono text-xs text-stamp">{n}</b><h3 className="mt-3 font-serif text-2xl">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></article>)}</div></div></section><section><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Built for consequential decisions</h2><p className="mt-5 text-lg text-ink-soft">Government decisions, denied claims, benefits decisions, licensing decisions, and other administrative outcomes can involve different rules and deadlines. The system should surface the source and uncertainty instead of inventing a universal deadline.</p></div></section></main><SiteFooter/></div>}
