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
  const tokens = [
    input.state,
    input.county,
    input.municipality,
    input.agency,
    input.locationName,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalize);

  return listJurisdictionPacks()
    .map((pack) => {
      const aliases = [pack.id, pack.name, pack.state, pack.county, pack.municipality, ...pack.aliases]
        .filter((value): value is string => Boolean(value))
        .map(normalize);

      const score = tokens.reduce((total, token) => {
        if (aliases.includes(token)) return total + 3;
        if (aliases.some((alias) => alias.includes(token) || token.includes(alias))) return total + 1;
        return total;
      }, 0);

      return { pack, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.pack;
}

export function clearJurisdictionPacksForTests(): void {
  packs.clear();
}
