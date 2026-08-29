import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { runDeniedClaimAI } from '@/platform/appeal-ai.functions';

export const Route = createFileRoute('/workflows/denied-claim-ai')({
  head: () => ({ meta: [{ title: 'Denied Claim AI Review — Appeal Mail' }, { name: 'description', content: 'Use the MailMyPDF ecosystem AI control plane to analyze, draft, and validate a denied-claim appeal.' }] }),
  component: DeniedClaimAI,
});

function DeniedClaimAI() {
  const [documentText, setDocumentText] = useState('');
  const [objective, setObjective] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await runDeniedClaimAI({ data: { documentText, facts: {}, objective } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'AI workflow failed'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-paper px-6 py-16"><div className="mx-auto max-w-4xl">
    <Link to="/workflows/denied-claim" className="text-sm text-slate-500">← Back to denied claim</Link>
    <h1 className="mt-6 font-serif text-4xl">Denied Claim — Multi-LLM AI Review</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">This workbench resolves the configured MailMyPDF provider/model for each task. Analysis, drafting, and validation can independently use Claude, OpenAI, or Gemini.</p>
    <div className="mt-8 space-y-5"><textarea value={documentText} onChange={e=>setDocumentText(e.target.value)} rows={14} placeholder="Paste the extracted denial/decision text here for this first AI wiring pass." className="w-full rounded-xl border p-4 text-sm"/><textarea value={objective} onChange={e=>setObjective(e.target.value)} rows={4} placeholder="What outcome are you requesting?" className="w-full rounded-xl border p-4 text-sm"/><button disabled={busy || documentText.length < 20} onClick={run} className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-40">{busy ? 'Running analysis → draft → validation…' : 'Run multi-LLM workflow'}</button></div>
    {error && <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {result && <section className="mt-8 space-y-6"><div className="rounded-xl border p-5"><h2 className="font-serif text-xl">Analysis</h2><p className="mt-2 text-xs text-slate-500">Provider: {result.analysis.provider} · {result.analysis.model}</p><pre className="mt-4 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(result.analysis.result,null,2)}</pre></div>{result.draft && <div className="rounded-xl border p-5"><h2 className="font-serif text-xl">Draft</h2><p className="mt-2 text-xs text-slate-500">Provider: {result.draft.provider} · {result.draft.model}</p><pre className="mt-4 whitespace-pre-wrap text-sm">{result.draft.draft}</pre></div>}<div className="rounded-xl border p-5"><h2 className="font-serif text-xl">Validation</h2><p className="mt-2 text-xs text-slate-500">Provider: {result.validationProvider} · {result.validationModel}</p><pre className="mt-4 whitespace-pre-wrap text-xs">{JSON.stringify(result.validation,null,2)}</pre><div className={`mt-4 font-semibold ${result.blocked?'text-rose-600':'text-emerald-700'}`}>{result.blocked?'Blocked — human review required':'AI validation passed — human review still required'}</div></div></section>}
  </div></main>;
}
