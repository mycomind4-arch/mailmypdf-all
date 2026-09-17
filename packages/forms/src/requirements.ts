import type { OfficialFormDefinition } from "./definition";
import type { OfficialFormRegistry } from "./registry";
import { getOfficialForm } from "./registry";

export type OfficialFormRequirementRule<Context, Kind extends string = string> = {
  id: string;
  when: (context: Context) => boolean;
  require: readonly Kind[];
};

export function resolveRequiredOfficialForms<Context, Kind extends string>(
  registry: OfficialFormRegistry<Kind>,
  rules: readonly OfficialFormRequirementRule<Context, Kind>[],
  context: Context,
): OfficialFormDefinition<Kind>[] {
  const requiredKinds = new Set<Kind>();
  for (const rule of rules) {
    if (!rule.id.trim()) throw new Error("Official form requirement rules require a stable id.");
    if (!rule.when(context)) continue;
    for (const kind of rule.require) requiredKinds.add(kind);
  }
  return [...requiredKinds].map((kind) => getOfficialForm(registry, kind));
}
