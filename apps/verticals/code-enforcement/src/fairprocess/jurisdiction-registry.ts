import type { JurisdictionPack } from './types';

const packs = new Map<string, JurisdictionPack>();

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function registerJurisdictionPack(pack: JurisdictionPack): JurisdictionPack {
  packs.set(pack.id, pack);
  return pack;
}

export function getJurisdictionPack(id: string): JurisdictionPack | undefined {
  return packs.get(id);
}

export function listJurisdictionPacks(): JurisdictionPack[] {
  return [...packs.values()];
}

export function resolveJurisdictionPack(input: {
  state?: string;
  county?: string;
  municipality?: string;
  agency?: string;
  locationName?: string;
}): JurisdictionPack | undefined {
  const state = input.state ? normalize(input.state) : undefined;
  const localityTokens = [input.county, input.municipality, input.agency, input.locationName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalize);

  // State alone is intentionally insufficient. A California-wide match must never
  // silently select Humboldt County for an unknown county or municipality.
  if (localityTokens.length === 0) return undefined;

  return listJurisdictionPacks()
    .map((pack) => {
      const packState = normalize(pack.state);
      if (state && state !== packState) return { pack, score: 0 };

      const strongAliases = [pack.id, pack.name, pack.county, pack.municipality, ...pack.aliases]
        .filter((value): value is string => Boolean(value))
        .map(normalize);

      const score = localityTokens.reduce((total, token) => {
        if (strongAliases.includes(token)) return total + 5;
        if (strongAliases.some((alias) => alias.includes(token) || token.includes(alias))) return total + 2;
        return total;
      }, 0);

      return { pack, score };
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)[0]?.pack;
}

export function clearJurisdictionPacksForTests(): void {
  packs.clear();
}
