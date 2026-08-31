// Library detection: a rule group ships enabled only when the consumer actually
// depends on that library. Runs once at config-load time, reading every
// package.json from cwd up to the filesystem root (covers monorepos where deps
// live in the app package, the workspace root, or both).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const depsAt = dir => {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  } catch {
    return [];
  }
};

let cached;
const allDeps = () => {
  if (cached) return cached;
  cached = new Set();
  let dir = process.cwd();
  for (;;) {
    for (const name of depsAt(dir)) cached.add(name);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cached;
};

/** explicit option wins; otherwise on iff one of the packages is a dependency */
export const detect = (option, packages) => option ?? packages.some(name => allDeps().has(name));
