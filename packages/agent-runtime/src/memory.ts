/** Evidence-backed memory boundary for agents. */
export type MemoryKind = 'fact' | 'preference' | 'decision' | 'observation' | 'task';

export interface MemoryRecord<T = unknown> {
  id: string;
  caseId: string;
  kind: MemoryKind;
  value: T;
  confidence: number;
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
  supersedes?: string;
}

export interface AgentMemoryStore {
  put<T>(record: MemoryRecord<T>): Promise<void>;
  get(id: string): Promise<MemoryRecord | undefined>;
  list(caseId: string, kind?: MemoryKind): Promise<MemoryRecord[]>;
  supersede(id: string, replacement: MemoryRecord): Promise<void>;
}

export function createMemoryRecord<T>(input: Omit<MemoryRecord<T>, 'createdAt' | 'updatedAt'> & { now?: string }): MemoryRecord<T> {
  const now = input.now ?? new Date().toISOString();
  return { ...input, createdAt: now, updatedAt: now };
}

export function isEvidenceBacked(record: MemoryRecord): boolean {
  return record.sourceRefs.length > 0 && Number.isFinite(record.confidence);
}
