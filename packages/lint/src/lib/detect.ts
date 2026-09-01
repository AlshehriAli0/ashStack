import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const dependencyNamesIn = (dir: string): string[] => {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  } catch {
    return [];
  }
};

const isRepoBoundary = (dir: string): boolean => existsSync(join(dir, ".git"));

const dependenciesByStartDir = new Map<string, Set<string>>();

const dependenciesUpToRepoBoundary = (): Set<string> => {
  const start = process.cwd();
  const cached = dependenciesByStartDir.get(start);
  if (cached) return cached;

  const dependencies = new Set<string>();
  let dir = start;
  for (;;) {
    for (const name of dependencyNamesIn(dir)) dependencies.add(name);
    if (isRepoBoundary(dir)) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dependenciesByStartDir.set(start, dependencies);
  return dependencies;
};

/**
 * Should this rule group ship enabled? An explicit option wins; otherwise the
 * group is on when one of `packages` is a dependency, and always on when
 * `packages` is absent. Dependencies come from every package.json between the
 * current working directory and the repo boundary — the directory holding
 * `.git` — so in a monorepo the app package, the workspace root, or both
 * count, and a stray package.json above the repo cannot enable anything.
 */
export const detect = (option: boolean | undefined, packages: string[] | undefined): boolean =>
  option ?? (packages === undefined || packages.some(name => dependenciesUpToRepoBoundary().has(name)));
