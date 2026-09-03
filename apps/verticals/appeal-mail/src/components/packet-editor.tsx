import { useEffect, useMemo, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { FileText, GripVertical, Image as ImageIcon, Plus, RotateCw, Trash2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PacketPageOp = { partId: string; sourcePageIndex: number; rotation: number; removed?: boolean };
export type PacketEditorFile = { id: string; file: File; kind: "source" | "supporting" };

type Item = { id: string; label: string; partId: string; pageIndex: number; rotation: number; fileId: string; thumbnail: string };

interface Props {
  draft: string;
  onDraftChange: (value: string) => void;
  sourceFile: File;
  onAssemble: (draft: string, files: PacketEditorFile[], ops: PacketPageOp[]) => Promise<void>;
  busy?: boolean;
}

async function renderPdfPages(file: File, partId: string): Promise<Item[]> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: Item[] = [];
  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 0.22 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create PDF preview canvas.");
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({ id: `${partId}:${pageIndex}`, label: `${file.name} · Page ${pageIndex + 1}`, partId, pageIndex, rotation: 0, fileId: partId, thumbnail: canvas.toDataURL("image/jpeg", 0.78) });
  }
  return pages;
}

async function renderImagePage(file: File, partId: string): Promise<Item> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Unable to preview ${file.name}.`)); image.src = url; });
    const scale = Math.min(1, 180 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(image.width * scale));
    canvas.height = Math.max(1, Math.ceil(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create image preview canvas.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { id: `${partId}:0`, label: `${file.name} · Page 1`, partId, pageIndex: 0, rotation: 0, fileId: partId, thumbnail: canvas.toDataURL("image/jpeg", 0.78) };
  } finally { URL.revokeObjectURL(url); }
}

async function renderFilePages(file: File, partId: string): Promise<Item[]> {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? renderPdfPages(file, partId) : [await renderImagePage(file, partId)];
}

function SortablePage({ item, removed, onDragStart, onDragOver, onDrop, onRotate, onRemove }: { item: Item; removed: boolean; onDragStart: () => void; onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void; onDrop: () => void; onRotate: () => void; onRemove: () => void }) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} style={{ opacity: removed ? 0.45 : 1 }} className="flex cursor-grab items-center gap-3 rounded-lg border border-rule bg-paper p-3 active:cursor-grabbing">
      <button type="button" aria-label={`Drag ${item.label}`} className="cursor-grab p-1 text-muted-foreground"><GripVertical size={18} /></button>
      <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-rule bg-paper-deep"><img src={item.thumbnail} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${item.rotation}deg)` }} /></div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{item.label}</div><div className="text-xs text-muted-foreground">Source page {item.pageIndex + 1}{item.rotation ? ` · ${item.rotation}°` : ""}{removed ? " · removed" : ""}</div></div>
      <button type="button" onClick={onRotate} disabled={removed} className="rounded-md border border-rule p-2 text-muted-foreground hover:text-foreground disabled:opacity-40" title="Rotate 90 degrees"><RotateCw size={16} /></button>
      <button type="button" onClick={onRemove} className="rounded-md border border-rule p-2 text-muted-foreground hover:text-red-600" title={removed ? "Restore page" : "Remove page"}><Trash2 size={16} /></button>
    </div>
  );
}

export function PacketEditor({ draft, onDraftChange, sourceFile, onAssemble, busy = false }: Props) {
  const sourceId = "source";
  const [supporting, setSupporting] = useState<PacketEditorFile[]>([]);
  const [order, setOrder] = useState<Item[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setMessage(null); setRemoved(new Set()); setSupporting([]); setOrder([]);
    renderFilePages(sourceFile, sourceId).then((pages) => { if (!cancelled) setOrder(pages); }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to render the source PDF."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sourceFile]);

  async function addSupporting(files: FileList | null) {
    if (!files) return;
    setMessage(null);
    const additions = Array.from(files).map((file, index) => ({ file, id: `support-${Date.now()}-${index}`, kind: "supporting" as const }));
    try {
      const pages = (await Promise.all(additions.map((item) => renderFilePages(item.file, item.id)))).flat();
      setSupporting((current) => [...current, ...additions]); setOrder((current) => [...current, ...pages]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to preview the supporting document."); }
  }

  function moveDragged(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setOrder((items) => { const from = items.findIndex((item) => item.id === draggedId); const to = items.findIndex((item) => item.id === targetId); if (from < 0 || to < 0) return items; const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
    setDraggedId(null);
  }

  async function assemble() {
    const files: PacketEditorFile[] = [{ id: sourceId, file: sourceFile, kind: "source" }, ...supporting];
    const ops = order.map((item) => ({ partId: item.partId, sourcePageIndex: item.pageIndex, rotation: item.rotation, removed: removed.has(item.id) }));
    try { setMessage(null); await onAssemble(draft, files, ops); setMessage("Final packet assembled and locked."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to assemble packet."); }
  }

  const activeCount = useMemo(() => order.filter((item) => !removed.has(item.id)).length, [order, removed]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-rule bg-paper p-6"><div className="flex items-center justify-between gap-4"><div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Final review</div><h3 className="mt-1 font-serif text-2xl">Edit the letter and arrange every page</h3><p className="mt-2 text-sm text-muted-foreground">Every PDF page is rendered as a thumbnail. Reorder, rotate, remove, or insert pages before the packet is locked.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-foreground px-4 py-2 text-sm"><Plus size={15} /> Add document<input type="file" accept="application/pdf,image/png,image/jpeg" multiple className="sr-only" onChange={(e) => void addSupporting(e.target.files)} /></label></div><textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} className="mt-6 min-h-[300px] w-full rounded-lg border border-rule bg-paper-deep p-4 text-sm leading-7 outline-none" aria-label="Final appeal draft" /></div>
      <div className="rounded-xl border border-rule bg-paper p-6"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Packet workspace</div><p className="mt-1 text-sm text-muted-foreground">Drag individual pages into their final order. Each page can be rotated or removed before locking.</p></div><div className="text-xs text-muted-foreground">{loading ? "Rendering pages…" : `${activeCount} active / ${order.length} total`}</div></div><div className="mt-5">{loading ? <div className="rounded-lg border border-dashed border-rule p-8 text-center text-sm text-muted-foreground">Rendering every PDF page…</div> : <div className="space-y-2">{order.map((item) => <SortablePage key={item.id} item={item} removed={removed.has(item.id)} onDragStart={() => setDraggedId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveDragged(item.id)} onRotate={() => setOrder((items) => items.map((x) => x.id === item.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x))} onRemove={() => setRemoved((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} />)}</div>}</div></div>
      <div className="flex items-center justify-between gap-3"><div className="text-xs text-muted-foreground">Final assembly creates a locked, hashed document stored with your case. Rebuild is required after any later edit.</div><button type="button" onClick={() => void assemble()} disabled={busy || loading || !draft.trim() || activeCount === 0} className="rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40">{busy ? "Assembling packet…" : "Build & lock final packet"}</button></div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
