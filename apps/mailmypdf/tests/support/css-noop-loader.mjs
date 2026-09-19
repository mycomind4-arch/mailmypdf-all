// Minimal Node ESM loader that treats CSS imports as an empty module, so
// plain `node --test` (via tsx) can import real top-level workflow start
// components for wiring-verification tests without needing a full bundler.
// Used only by apps/mailmypdf's test script; production builds go through
// Vite, which already handles CSS imports normally.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css")) {
    return { url: `data:text/javascript,export default {}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
