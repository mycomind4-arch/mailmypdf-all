import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Activity, ArrowUp, Bot, BrainCircuit, CircleAlert, Code2, ExternalLink, Loader2, Pause, Play, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { authenticatedHeaders } from "@/lib/authenticated-client";

type WorkMode = "research" | "develop";
type ResearchMode = "QUICK" | "STANDARD" | "DEEP" | "FORENSIC";
type Provider = "claude" | "codex";
type CaseListing = { id: string; question: string; phase: string; mode?: string; active?: boolean };
type Source = { id: string; title: string; url?: string; isPrimary: boolean };
type Evidence = { id: string; text: string; sourceId: string; independentConfirmation?: boolean };
type Hypothesis = { id: string; statement: string; supportLevel: string; unknowns?: string[] };
type Assessment = { summary?: string; confidenceLevel?: string; majorUnknowns?: string[]; majorAssumptions?: string[]; strongestCounterargument?: string };
type Case = {
  id: string; question: string; phase: string; mode?: string; converged?: boolean; paused?: boolean;
  evidence?: Evidence[]; sources?: Source[]; hypotheses?: Hypothesis[];
  contradictions?: unknown[]; assessment?: Assessment;
  budget?: { spentUSD: number; budgetUSD: number };
};
type ActivityEvent = { id: string; type: string; agentRole?: string; modelId?: string; message: string };
type ChatMessage = { id: string; role: "assistant" | "user" | "system"; content: string; provider?: string };
type DevSession = { sessionId: string; branch: string; provider: Provider; workflowId: string; messages: ChatMessage[]; status: string; closedAt?: string };
type Health = { status: string; providers?: { forceMock?: boolean; mock?: boolean; gemini?: boolean; openrouter?: boolean } };
type ChatListing = { sessions: DevSession[]; availability: Record<Provider, boolean> };

async function api(path: string, body?: Record<string, unknown>): Promise<any> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(await authenticatedHeaders()), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? ("Studio API error " + response.status));
  return result;
}
function researchUrl(action: string, id?: string): string {
  return "/api/studio/ruthless?action=" + encodeURIComponent(action) + (id ? "&id=" + encodeURIComponent(id) : "");
}
function safeLink(url?: string): string | null {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null; }
  catch { return null; }
}
function format(value?: string) { return (value ?? "NOT STARTED").replaceAll("_", " ").toLowerCase(); }

function SuperAgentPage() {
  const [mode, setMode] = useState<WorkMode>("research");
  const [depth, setDepth] = useState<ResearchMode>("STANDARD");
  const [budget, setBudget] = useState(10);
  const [provider, setProvider] = useState<Provider>("claude");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [researchError, setResearchError] = useState("");
  const [cases, setCases] = useState<CaseListing[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [sessions, setSessions] = useState<DevSession[]>([]);
  const [session, setSession] = useState<DevSession | null>(null);
  const [availability, setAvailability] = useState<Record<Provider, boolean> | null>(null);
  const [devError, setDevError] = useState("");
  const [inspector, setInspector] = useState<"evidence" | "hypotheses" | "activity">("evidence");

  const loadResearch = useCallback(async () => {
    try {
      const [liveHealth, listing] = await Promise.all([
        api(researchUrl("health")) as Promise<Health>,
        api(researchUrl("list")) as Promise<CaseListing[]>,
      ]);
      setHealth(liveHealth);
      setCases(Array.isArray(listing) ? listing : []);
      setResearchError("");
    } catch (cause) {
      setHealth(null);
      setResearchError(cause instanceof Error ? cause.message : "Research service unavailable");
    }
  }, []);
  const loadDeveloper = useCallback(async () => {
    try {
      const result = await api("/api/studio/chat/sessions") as ChatListing;
      setSessions(result.sessions ?? []);
      setAvailability(result.availability);
      setDevError("");
    } catch (cause) {
      setAvailability(null);
      setDevError(cause instanceof Error ? cause.message : "Local agent session unavailable");
    }
  }, []);
  const loadCase = useCallback(async (id: string) => {
    try {
      const [state, activity] = await Promise.all([
        api(researchUrl("state", id)) as Promise<Case>,
        api(researchUrl("events", id)) as Promise<ActivityEvent[]>,
      ]);
      setCurrentCase(state);
      setEvents(Array.isArray(activity) ? activity : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to retrieve investigation"); }
  }, []);
  useEffect(() => { void loadResearch(); void loadDeveloper(); }, [loadResearch, loadDeveloper]);
  useEffect(() => {
    if (!caseId) return;
    setCurrentCase(null); setEvents([]);
    void loadCase(caseId);
    const timer = setInterval(() => void loadCase(caseId), 5000);
    return () => clearInterval(timer);
  }, [caseId, loadCase]);

  async function selectCase(item: CaseListing) {
    setError("");
    if (item.active === false) {
      setBusy(true);
      try { await api("/api/studio/ruthless", { action: "load", id: item.id }); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Could not restore investigation"); setBusy(false); return; }
      finally { setBusy(false); }
    }
    setCaseId(item.id); setPrompt("");
  }
  async function startDeveloper() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const data = await api("/api/studio/chat/start", { verticalId: "mailmypdf", workflowId: "studio-super-agent", provider });
      setSession(data.session as DevSession);
      await loadDeveloper();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start developer agent"); }
    finally { setBusy(false); }
  }
  async function closeDeveloper() {
    if (!session || busy || !window.confirm("Close this local development worktree? Unsaved changes in its worktree will be discarded.")) return;
    setBusy(true); setError("");
    try { await api("/api/studio/chat/close", { sessionId: session.sessionId }); setSession(null); await loadDeveloper(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not close developer worktree"); }
    finally { setBusy(false); }
  }
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || !prompt.trim()) return;
    const message = prompt.trim();
    setBusy(true); setError("");
    try {
      if (mode === "research") {
        if (!caseId) {
          const result = await api("/api/studio/ruthless", { action: "start", question: message, budgetUSD: budget, mode: depth });
          if (typeof result.id !== "string") throw new Error("Investigation did not return an ID");
          setCaseId(result.id);
          setNotes((old) => ({ ...old, [result.id]: [message] }));
          await loadResearch();
        } else {
          if (currentCase?.converged || currentCase?.phase === "CONVERGED") throw new Error("Reopen this investigation before adding new instructions.");
          await api("/api/studio/ruthless", { action: "intervene", id: caseId, instruction: message });
          setNotes((old) => ({ ...old, [caseId]: [...(old[caseId] ?? []), message] }));
          await loadCase(caseId);
        }
      } else {
        if (!session) throw new Error("Create a local development session first");
        const result = await api("/api/studio/chat/message", { sessionId: session.sessionId, message, provider });
        setSession(result.session);
        await loadDeveloper();
      }
      setPrompt("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Agent execution failed"); }
    finally { setBusy(false); }
  }
  async function changeCase(action: "pause" | "resume" | "reopen" | "refresh") {
    if (!caseId || busy) return;
    setBusy(true); setError("");
    try {
      await api("/api/studio/ruthless", { action, id: caseId });
      await loadCase(caseId);
      await loadResearch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not change investigation state"); }
    finally { setBusy(false); }
  }
  async function gate(kind: "tester" | "reviewer" | "seo") {
    if (!session || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api("/api/studio/chat/gate", { sessionId: session.sessionId, gate: kind, provider });
      setSession(result.session);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Agent quality gate failed"); }
    finally { setBusy(false); }
  }
  function prepareHandoff() {
    if (!currentCase?.assessment) return;
    setMode("develop");
    setPrompt("Use this research as an unverified planning brief. Verify cited evidence before using it and ask for approval before release. Question: " +
      currentCase.question + "\nSummary: " + (currentCase.assessment.summary ?? "Not available") +
      "\nUnknowns: " + (currentCase.assessment.majorUnknowns ?? []).join("; ") +
      "\nCounterargument: " + (currentCase.assessment.strongestCounterargument ?? "Not available"));
  }
  const mock = health?.providers?.forceMock === true;
  const online = health?.status === "ok";
  const paused = currentCase?.paused || currentCase?.phase === "PAUSED";
  return <main className="mx-auto max-w-[1740px] px-4 py-7">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><div className="postmark">Studio / Super Agent</div><h1 className="mt-2 font-serif text-4xl">Super Agent Chat</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Direct the Ruthless investigation council and local coding agents from one interface, with separate permissions and visible evidence.</p></div>
      <div className="flex items-center gap-3 text-xs">
        <span className="rounded-full border border-rule px-3 py-2">{online ? (mock ? "Research: MOCK" : "Research: connected") : "Research: unavailable"}</span>
        <Link to="/studio/engines" className="text-cobalt">Engine Workbench <ExternalLink size={12} className="inline" /></Link>
      </div>
    </header>
    <div className="grid min-h-[72vh] gap-4 xl:grid-cols-[235px_minmax(0,1fr)_320px]">
      <aside className="rounded-xl border border-rule bg-card p-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-deep p-1 text-xs font-semibold">
          <button type="button" onClick={()=>{setMode("research");setError("");setPrompt("");}} className={"rounded-md px-2 py-2 " + (mode==="research"?"bg-card shadow":"text-muted-foreground")}><BrainCircuit size={14} className="mr-1 inline"/>Research</button>
          <button type="button" onClick={()=>{setMode("develop");setError("");setPrompt("");}} className={"rounded-md px-2 py-2 " + (mode==="develop"?"bg-card shadow":"text-muted-foreground")}><Code2 size={14} className="mr-1 inline"/>Develop</button>
        </div>
        {mode==="research" ? <div className="mt-4 space-y-3">
          <button type="button" onClick={()=>{setCaseId(null);setCurrentCase(null);setPrompt("");setError("");}} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-3 py-2 text-sm font-semibold text-white"><Plus size={15}/>New investigation</button>
          <label className="block text-xs font-semibold">Investigation mode
            <select className="input-field mt-1 w-full" value={depth} onChange={(e)=>setDepth(e.target.value as ResearchMode)}>
              {(["QUICK","STANDARD","DEEP","FORENSIC"] as const).map((value)=><option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Max budget (USD)
            <input type="number" min={1} max={50} step={1} value={budget} onChange={(e)=>setBudget(Math.max(1,Math.min(50,Number(e.target.value)||1)))} className="input-field mt-1 w-full" />
          </label>
          <div className="flex items-center justify-between pt-3 text-xs font-semibold text-muted-foreground">INVESTIGATIONS
            <button type="button" title="Refresh" onClick={()=>void loadResearch()}><RefreshCw size={14}/></button>
          </div>
          <div className="max-h-[46vh] space-y-1 overflow-y-auto">{cases.map((item)=><button key={item.id} type="button" onClick={()=>void selectCase(item)} className={"w-full rounded-lg p-2 text-left text-xs " + (caseId===item.id?"bg-paper-deep font-semibold":"hover:bg-paper-deep")}>
            <span className="line-clamp-2 block">{item.question}</span><span className="mt-1 block text-[10px] text-muted-foreground">{format(item.phase)}{item.active===false?" · persisted":""}</span></button>)}</div>
        </div> : <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold">Coding provider
            <select className="input-field mt-1 w-full" value={provider} onChange={(e)=>setProvider(e.target.value as Provider)}>
              <option value="claude">Claude CLI</option><option value="codex">Codex CLI</option>
            </select>
          </label>
          <button type="button" disabled={busy || !availability?.[provider]} onClick={()=>void startDeveloper()} className="w-full rounded-lg bg-cobalt px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={14} className="mr-1 inline"/>New local worktree</button>
          <div className="pt-3 text-xs font-semibold text-muted-foreground">AGENT SESSIONS</div>
          <div className="max-h-[46vh] space-y-1 overflow-y-auto">{sessions.filter((s)=>!s.closedAt).map((s)=><button key={s.sessionId} type="button" onClick={()=>{setSession(s);setProvider(s.provider);}} className={"w-full rounded-lg p-2 text-left text-xs " + (session?.sessionId===s.sessionId?"bg-paper-deep font-semibold":"hover:bg-paper-deep")}>
            <span className="block truncate">{s.workflowId}</span><span className="mt-1 text-[10px] text-muted-foreground">{s.provider} · {s.messages.length} messages</span>
          </button>)}</div>
        </div>}
      </aside>
      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-rule bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule p-4">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-paper-deep p-2">{mode==="research"?<BrainCircuit size={19}/>:<Bot size={19}/>}</div>
            <div><h2 className="font-semibold">{mode==="research"?"Ruthless Investigator Council":"Studio Development Agent"}</h2><p className="text-xs text-muted-foreground">{mode==="research"?format(currentCase?.phase):(session?.branch??"No isolated workspace selected")}</p></div></div>
          {mode==="research" && currentCase && <div className="flex gap-2">
            <button type="button" title="Refresh visible status" disabled={busy} onClick={()=>void loadCase(currentCase.id)} className="rounded-lg border border-rule p-2"><RefreshCw size={14}/></button>
            <button type="button" title="Ask Director to refresh research" disabled={busy} onClick={()=>void changeCase("refresh")} className="rounded-lg border border-rule px-3 py-2 text-xs">Refresh research</button>
            <button type="button" disabled={busy} onClick={()=>void changeCase(paused?"resume":"pause")} className="rounded-lg border border-rule px-3 py-2 text-xs">{paused?<Play size={14} className="mr-1 inline"/>:<Pause size={14} className="mr-1 inline"/>}{paused?"Resume":"Pause"}</button>
            {(currentCase.converged||currentCase.phase==="CONVERGED") && <button type="button" disabled={busy} onClick={()=>void changeCase("reopen")} className="rounded-lg border border-rule px-3 py-2 text-xs">Reopen</button>}
          </div>}
        </div>
        <div className="min-h-[340px] flex-1 space-y-4 overflow-y-auto p-5">
          {mode==="research" ? <>
            {!online && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><CircleAlert size={15} className="mr-2 inline"/>{researchError||"Ruthless Investigator API not configured"}. Connect the server before launching research.</div>}
            {mock && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">MOCK provider active. Research outputs are simulated, not independently researched evidence.</div>}
            {!caseId && <div className="mx-auto max-w-md py-16 text-center"><BrainCircuit size={35} className="mx-auto text-cobalt"/><h3 className="mt-3 font-serif text-2xl">What should the council investigate?</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">The original Ruthless Investigator handles research, source lineage, adversarial critique, contradictions, alternative explanations and synthesis.</p></div>}
            {currentCase && <div className="rounded-lg border border-rule bg-paper-deep p-3"><div className="text-sm font-semibold">{currentCase.question}</div><div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>Phase: {format(currentCase.phase)}</span><span>{currentCase.evidence?.length??0} evidence items</span><span>{currentCase.hypotheses?.length??0} hypotheses</span><span>Spent USD {Number(currentCase.budget?.spentUSD??0).toFixed(2)} / {Number(currentCase.budget?.budgetUSD??0).toFixed(2)}</span></div></div>}
            {(caseId?notes[caseId]??[]:[]).map((note,i)=><div key={i} className="ml-auto max-w-[86%] rounded-xl bg-cobalt p-3 text-sm leading-6 text-white">{note}</div>)}
            {currentCase?.assessment ? <div className="rounded-xl border border-rule p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15}/>Evidence-weighted assessment</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7">{currentCase.assessment.summary??"No narrative summary supplied."}</div><p className="mt-2 text-xs text-muted-foreground">Confidence: {currentCase.assessment.confidenceLevel??"Unknown"}</p>
              {!!currentCase.assessment.majorUnknowns?.length && <div className="mt-3"><h4 className="text-xs font-semibold">Major unknowns</h4>{currentCase.assessment.majorUnknowns.map((x,i)=><p key={i} className="mt-1 text-sm">{x}</p>)}</div>}
              {currentCase.assessment.strongestCounterargument && <p className="mt-3 text-sm"><strong>Counterargument:</strong> {currentCase.assessment.strongestCounterargument}</p>}
              <button type="button" onClick={prepareHandoff} className="mt-4 rounded-lg border border-rule px-3 py-2 text-xs font-semibold">Prepare handoff to coding agent</button>
            </div> : currentCase && <div className="rounded-lg border border-dashed border-rule p-4 text-sm text-muted-foreground"><Activity size={15} className="mr-1 inline"/>Investigation in progress. No final assessment available yet.</div>}
          </> : <>
            {devError && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{devError}<p className="mt-2 text-xs">Local coding agents require the Studio development host and installed Claude/Codex CLI.</p></div>}
            {!session && <div className="mx-auto max-w-md py-16 text-center"><Code2 size={35} className="mx-auto text-cobalt"/><h3 className="mt-3 font-serif text-2xl">Work with coding agents</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Start a separate local git worktree. Use actual Claude or Codex sessions, then run existing tester, reviewer and SEO gates before considering a merge.</p></div>}
            {session?.messages.map((item)=><div key={item.id} className={item.role==="user"?"ml-auto max-w-[88%] rounded-xl bg-cobalt p-4 text-sm text-white":"mr-auto max-w-[92%] rounded-xl bg-paper-deep p-4 text-sm"}><p className="mb-2 text-[10px] font-semibold uppercase opacity-70">{item.provider??item.role}</p><div className="whitespace-pre-wrap leading-6">{item.content}</div></div>)}
            {session && <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4"><span className="text-xs text-muted-foreground">Quality checks:</span>{(["tester","reviewer","seo"] as const).map((kind)=><button type="button" key={kind} disabled={busy} onClick={()=>void gate(kind)} className="rounded-lg border border-rule px-3 py-1.5 text-xs capitalize disabled:opacity-50">{kind}</button>)}<button type="button" disabled={busy} onClick={()=>void closeDeveloper()} className="rounded-lg border border-rule px-3 py-1.5 text-xs text-red-700 disabled:opacity-50">Close worktree</button></div>}
          </>}
          {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        </div>
        <form className="border-t border-rule p-4" onSubmit={(event)=>void submit(event)}>
          <textarea rows={3} value={prompt} onChange={(e)=>setPrompt(e.target.value)}
            onKeyDown={(e:KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit();}}}
            disabled={busy||(mode==="research"&&!online)||(mode==="develop"&&!session)}
            aria-label="Super Agent chat message"
            placeholder={mode==="research"?(caseId?"Intervene with new information or research instructions…":"Ask the council an investigation question…"):"Describe the change or task for Claude or Codex…"}
            className="w-full rounded-lg border border-rule bg-paper p-3 text-sm outline-none focus:border-cobalt disabled:opacity-60"/>
          <div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{mode==="research"?"Council research · source-aware · budget-limited":"Local worktree · explicit review gates"}</span>
            <button type="submit" disabled={busy||!prompt.trim()||(mode==="research"&&!online)||(mode==="develop"&&!session)} className="flex items-center gap-2 rounded-lg bg-cobalt px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy?<Loader2 size={15} className="animate-spin"/>:<ArrowUp size={15}/>} {busy?"Working":"Send"}</button></div>
        </form>
      </section>
      <aside className="max-h-[86vh] overflow-hidden rounded-xl border border-rule bg-card">
        <div className="border-b border-rule p-4"><h2 className="font-serif text-xl">{mode==="research"?"Evidence & council":"Development supervision"}</h2><p className="mt-1 text-xs text-muted-foreground">{mode==="research"?"Evidence is not automatically independently verified.":"Changes remain in the isolated agent worktree."}</p></div>
        {mode==="research" ? <>
          <div className="grid grid-cols-3 gap-1 border-b border-rule p-2 text-xs">{(["evidence","hypotheses","activity"] as const).map((item)=><button key={item} type="button" onClick={()=>setInspector(item)} className={"rounded-md px-2 py-2 capitalize "+(item===inspector?"bg-paper-deep font-semibold":"text-muted-foreground")}>{item}</button>)}</div>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto p-3">
            {inspector==="evidence" && <>
              {!currentCase?.evidence?.length && <p className="text-sm text-muted-foreground">No evidence returned yet.</p>}
              {currentCase?.evidence?.slice(0,45).map((e)=><div key={e.id} className="rounded-lg border border-rule p-3 text-xs"><p className="leading-5">{e.text}</p><p className="mt-2 text-[10px] text-muted-foreground">Source: {e.sourceId}</p><p className="mt-1 text-[10px] text-muted-foreground">{e.independentConfirmation?"Independent lineage marked":"Independent corroboration not established"}</p></div>)}
              {!!currentCase?.sources?.length && <h4 className="pt-3 text-xs font-semibold">Source registry</h4>}
              {currentCase?.sources?.slice(0,30).map((source)=><div key={source.id} className="rounded-lg bg-paper-deep p-3 text-xs"><div>{source.title}</div><p className="mt-1 text-[10px] text-muted-foreground">{source.isPrimary?"Primary source":"Secondary or unspecified source"}</p>{safeLink(source.url) && <a href={safeLink(source.url)!} target="_blank" rel="noopener noreferrer" className="mt-2 block text-cobalt">View original <ExternalLink size={11} className="inline"/></a>}</div>)}
            </>}
            {inspector==="hypotheses" && <>
              {!currentCase?.hypotheses?.length && <p className="text-sm text-muted-foreground">No hypotheses generated yet.</p>}
              {currentCase?.hypotheses?.map((item)=><div key={item.id} className="rounded-lg border border-rule p-3 text-xs"><p className="font-semibold">{item.supportLevel}</p><p className="mt-2 leading-5">{item.statement}</p>{item.unknowns?.map((unknown,i)=><p key={i} className="mt-2 text-muted-foreground">Unknown: {unknown}</p>)}</div>)}
              <p className="text-xs text-muted-foreground">These are hypotheses, not verified accusations or findings.</p>
            </>}
            {inspector==="activity" && <>
              {!events.length && <p className="text-sm text-muted-foreground">No council events returned yet.</p>}
              {events.slice(-70).reverse().map((e)=><div key={e.id} className="border-b border-rule py-2 text-xs"><strong>{e.agentRole??e.type}</strong><p className="mt-1 leading-5">{e.message}</p>{e.modelId && <p className="mt-1 text-[10px] text-muted-foreground">Model: {e.modelId}</p>}</div>)}
            </>}
          </div>
        </> : <div className="p-4 text-sm"><h3 className="font-semibold">Isolated coding agent</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">Studio's existing agent swarm owns the development session, sandboxed worktree, code edits and quality checks. This interface does not automatically merge, deploy or publish anything.</p><p className="mt-4 break-all font-mono text-xs">{session?.branch??"No session yet"}</p><Link to="/studio/builder" className="mt-5 inline-block text-xs font-semibold text-cobalt">Open workflow builder →</Link></div>}
      </aside>
    </div>
  </main>;
}

export const Route = createFileRoute("/_authenticated/studio/super-agent")({
  head: () => ({ meta: [{ title: "Super Agent Chat — MailMyPDF Studio" }, { name: "robots", content: "noindex" }] }),
  component: SuperAgentPage,
});
