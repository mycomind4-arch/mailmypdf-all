import {
  assertOfficialFormDefinition,
  type OfficialFormDefinition,
} from "./definition";

export type OfficialFormRegistry<Kind extends string = string> = readonly OfficialFormDefinition<Kind>[];

export function createOfficialFormRegistry<const Forms extends readonly OfficialFormDefinition[]>(
  forms: Forms,
): Forms {
  const kinds = new Set<string>();
  for (const form of forms) {
    assertOfficialFormDefinition(form);
    if (kinds.has(form.kind)) throw new Error(`Duplicate official form kind: ${form.kind}`);
    kinds.add(form.kind);
  }
  return Object.freeze(forms.map((form) => Object.freeze({ ...form }))) as unknown as Forms;
}

export function getOfficialForm<Kind extends string>(
  registry: OfficialFormRegistry<Kind>,
  kind: Kind,
): OfficialFormDefinition<Kind> {
  const form = registry.find((candidate) => candidate.kind === kind);
  if (!form) throw new Error(`Unknown official form kind: ${kind}`);
  return form;
}

export function selectOfficialForms<Kind extends string>(
  registry: OfficialFormRegistry<Kind>,
  kinds: readonly Kind[],
): OfficialFormDefinition<Kind>[] {
  return kinds.map((kind) => getOfficialForm(registry, kind));
}
