import type { Capability } from "./capabilities";

export type SkillContext = { businessId: string; input: Record<string, unknown> };
export type SkillResult = { output: Record<string, unknown>; warnings?: string[] };
export type Skill = Capability & { execute(context: SkillContext): Promise<SkillResult> };

const skills = new Map<string, Skill>();

export function registerSkill(skill: Skill): void {
  if (skill.kind !== "skill") throw new Error("Only skill capabilities can be registered as skills");
  if (skills.has(skill.id)) throw new Error(`Skill ${skill.id} is already registered`);
  skills.set(skill.id, skill);
}

export function getSkill(id: string): Skill | null { return skills.get(id) ?? null; }
export function listSkills(): Capability[] { return [...skills.values()].map(({ execute: _execute, ...capability }) => capability); }
