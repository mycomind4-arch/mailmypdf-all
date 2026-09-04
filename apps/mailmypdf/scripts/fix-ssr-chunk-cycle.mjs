#!/usr/bin/env node
/**
 * Break rolldown runtime-helper import cycles in the SSR build output.
 *
 * Rolldown sometimes splits the module-runtime helpers (__exportAll, __esmMin,
 * __toCommonJS, __toESM) into a small chunk that ALSO re-exports a binding from
 * a larger chunk — while that larger chunk imports the helpers back and calls
 * them at module-evaluation time:
 *
 *   shim.mjs    import { c as server_exports } from "./big.mjs"
 *               var __exportAll = (...) => {...}
 *               export { __exportAll as r, server_exports as t }
 *
 *   big.mjs     import { r as __exportAll } from "./shim.mjs"
 *               var server_exports = __exportAll({ ... })   // top level
 *
 * That is a cycle with a top-level call across it. Whichever module the runtime
 * evaluates first, the helper is still uninitialised when it is invoked, and
 * Cloudflare Workers fails the request with "__exportAll is not a function".
 * Node's loader happens to tolerate some orderings, which is why this can pass
 * locally and fail in production.
 *
 * The helpers are pure, stateless functions, so the fix is to inline the ones a
 * chunk actually uses and drop the import that closes the cycle. The remaining
 * edge (shim -> big) is one-directional and harmless.
 *
 * This finds the cycle by analysing the import graph rather than by matching
 * chunk names, because those carry content hashes that change every build.
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = process.argv[2] ?? ".output/server";

if (!existsSync(ROOT)) {
  // Different Nitro presets emit elsewhere (Pages uses dist/_worker.js). Nothing
  // to do rather than failing the build.
  console.log(`[fix-ssr-chunk-cycle] ${ROOT} not found — skipping`);
  process.exit(0);
}

const HELPERS = {
  __esmMin:
    "var __esmMin = (fn, res, err) => () => {\n\tif (err) throw err[0];\n\ttry {\n\t\treturn fn && (res = fn(fn = 0)), res;\n\t} catch (e) {\n\t\tthrow err = [e], e;\n\t}\n};",
  __exportAll:
    "var __exportAll = (all, no_symbols) => {\n\tlet target = {};\n\tfor (var name in all) Object.defineProperty(target, name, {\n\t\tget: all[name],\n\t\tenumerable: true\n\t});\n\tif (!no_symbols) Object.defineProperty(target, Symbol.toStringTag, { value: \"Module\" });\n\treturn target;\n};",
  __toESM:
    "var __toESM = (mod, isNodeMode, target) => (target = mod != null ? Object.create(Object.getPrototypeOf(mod)) : {}, __copyPropsShim(isNodeMode || !mod || !mod.__esModule ? Object.defineProperty(target, \"default\", {\n\tvalue: mod,\n\tenumerable: true\n}) : target, mod));",
  __toCommonJS:
    "var __toCommonJS = (mod) => Object.prototype.hasOwnProperty.call(mod, \"module.exports\") ? mod[\"module.exports\"] : __copyPropsShim(Object.defineProperty({}, \"__esModule\", { value: true }), mod);",
};

const COPY_PROPS =
  "var __copyPropsShim = (to, from, except, desc) => {\n\tif (from && typeof from === \"object\" || typeof from === \"function\") for (var keys = Object.getOwnPropertyNames(from), i = 0, n = keys.length, key; i < n; i++) {\n\t\tkey = keys[i];\n\t\tif (!Object.prototype.hasOwnProperty.call(to, key) && key !== except) Object.defineProperty(to, key, {\n\t\t\tget: ((k) => from[k]).bind(null, key),\n\t\t\tenumerable: !(desc = Object.getOwnPropertyDescriptor(from, key)) || desc.enumerable\n\t\t});\n\t}\n\treturn to;\n};";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".mjs") || entry.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Every relative specifier a file imports from, resolved to an absolute path. */
function importsOf(file, source) {
  const specifiers = [...source.matchAll(/from\s*["'](\.[^"']+)["']/g)].map((m) => m[1]);
  return new Set(specifiers.map((s) => resolve(dirname(file), s)));
}

// Keyed by absolute path throughout, so graph lookups match the resolved
// specifiers rather than silently missing on a relative/absolute mismatch.
const files = walk(ROOT).map((f) => resolve(f));
const sources = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const graph = new Map([...sources].map(([f, s]) => [f, importsOf(f, s)]));

let patched = 0;

for (const [file, source] of sources) {
  // Does this file import runtime helpers from another chunk?
  const importLine = source.match(
    /^import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["'];?$/m,
  );
  if (!importLine) continue;

  for (const match of source.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["'];?$/gm)) {
    const [statement, bindings, specifier] = match;
    const target = resolve(dirname(file), specifier);
    // Only care when the target imports us back — that is the cycle.
    if (!graph.get(target)?.has(file)) continue;

    const wanted = [...bindings.matchAll(/(\w+)\s+as\s+(\w+)/g)]
      .map(([, , local]) => local)
      .filter((local) => local in HELPERS);
    if (wanted.length === 0) continue;

    const needsCopyProps = wanted.some((w) => w === "__toESM" || w === "__toCommonJS");
    const inlined = [
      needsCopyProps ? COPY_PROPS : null,
      ...wanted.map((w) => HELPERS[w]),
    ]
      .filter(Boolean)
      .join("\n");

    const next = sources
      .get(file)
      .replace(
        statement,
        `/* cycle broken by scripts/fix-ssr-chunk-cycle.mjs */\n${inlined}`,
      );
    sources.set(file, next);
    writeFileSync(file, next);
    patched++;
    console.log(
      `[fix-ssr-chunk-cycle] inlined ${wanted.join(", ")} into ${relative(ROOT, file)} ` +
        `(cycle with ${relative(ROOT, target)})`,
    );
  }
}

console.log(
  patched === 0
    ? "[fix-ssr-chunk-cycle] no runtime-helper cycles found"
    : `[fix-ssr-chunk-cycle] broke ${patched} cycle(s)`,
);
