function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length > 2));
}

export function templateSimilarity(left: string, right: string): number {
  const a = tokens(left); const b = tokens(right);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function isNearDuplicate(left: string, right: string, threshold = 0.8): boolean {
  if (threshold < 0 || threshold > 1) throw new Error("Similarity threshold must be between 0 and 1.");
  return templateSimilarity(left, right) >= threshold;
}
