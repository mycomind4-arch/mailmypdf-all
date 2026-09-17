import type { OfficialFormDefinition } from "./definition";
import type { OfficialFormRegistry } from "./registry";
import { getOfficialForm } from "./registry";

export type OfficialFormRequirementRule<Context, Kind extends string = string> = {
  id: string;
  when: (context: Context) => boolean;
  require: readonly Kind[];
};

export function resolveRequiredOfficialFormKinds<Context, Kind extends string>(
  rules: readonly OfficialFormRequirementRule<Context, Kind>[],
  context: Context,
): Kind[] {
  const requiredKinds = new Set<Kind>();
  const ruleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule.id.trim()) throw new Error("Official form requirement rules require a stable id.");
    if (ruleIds.has(rule.id)) throw new Error(`Duplicate official form requirement rule id: ${rule.id}`);
    ruleIds.add(rule.id);
    if (!rule.when(context)) continue;
    for (const kind of rule.require) requiredKinds.add(kind);
  }

  return [...requiredKinds];
}

export function resolveRequiredOfficialForms<Context, Kind extends string>(
  registry: OfficialFormRegistry<Kind>,
  rules: readonly OfficialFormRequirementRule<Context, Kind>[],
  context: Context,
): OfficialFormDefinition<Kind>[] {
  return resolveRequiredOfficialFormKinds(rules, context).map((kind) => getOfficialForm(registry, kind));
}
