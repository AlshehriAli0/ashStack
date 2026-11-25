import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface PackageJson {
  version?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
}

const readPackageJson = (dir: string): PackageJson | null => {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
};

/** Every dependency a package.json declares, mapped to the range it declares. */
const declaredRangesIn = (dir: string): [string, unknown][] => {
  const pkg = readPackageJson(dir);
  return Object.entries({ ...pkg?.peerDependencies, ...pkg?.devDependencies, ...pkg?.dependencies });
};

const isRepoBoundary = (dir: string): boolean => existsSync(join(dir, ".git"));

/** The current working directory and each parent up to the repo boundary, nearest first. */
const dirsUpToRepoBoundary = (start: string): string[] => {
  const dirs: string[] = [];
  let dir = start;
  for (;;) {
    dirs.push(dir);
    if (isRepoBoundary(dir)) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dirs;
};

interface Found {
  dirs: string[];
  /** Dependency name to the range the nearest package.json declares for it. */
  declared: Map<string, unknown>;
  majors: Map<string, number | null>;
}

const foundByStartDir = new Map<string, Found>();

const foundFromCwd = (): Found => {
  const start = process.cwd();
  const cached = foundByStartDir.get(start);
  if (cached) return cached;

  const dirs = dirsUpToRepoBoundary(start);
  const declared = new Map<string, unknown>();
  for (const dir of dirs) {
    for (const [name, range] of declaredRangesIn(dir)) if (!declared.has(name)) declared.set(name, range);
  }
  const found = { dirs, declared, majors: new Map() };
  foundByStartDir.set(start, found);
  return found;
};

/**
 * The lowest major a version or declared range allows: `3.5.0`, `^3.0.0`,
 * `~3.1`, `>=3 <4` and `npm:pkg@^3` all read as 3. `null` for anything that
 * names no number up front, such as `*`, `latest` or a git URL.
 */
const leadingMajor = (range: unknown): number | null => {
  if (typeof range !== "string") return null;
  const bare = range.startsWith("npm:") ? range.slice(range.lastIndexOf("@") + 1) : range.replace(/^workspace:/, "");
  const match = /^\s*(?:[~^]|>=?|=)?\s*v?(\d+)/.exec(bare);
  return match ? Number(match[1]) : null;
};

/** The installed package's major, from the nearest `node_modules`, or the declared range's minimum. */
const resolveMajor = (found: Found, name: string): number | null => {
  for (const dir of found.dirs) {
    const installed = readPackageJson(join(dir, "node_modules", name));
    if (installed !== null) {
      const major = leadingMajor(installed.version);
      if (major !== null) return major;
    }
  }
  return leadingMajor(found.declared.get(name));
};

const majorOf = (found: Found, name: string): number | null => {
  if (!found.majors.has(name)) found.majors.set(name, resolveMajor(found, name));
  return found.majors.get(name) ?? null;
};

const isPresent = (found: Found, name: string, minMajor: number | undefined): boolean => {
  if (!found.declared.has(name)) return false;
  if (minMajor === undefined) return true;
  const major = majorOf(found, name);
  return major !== null && major >= minMajor;
};

/**
 * Should this rule group ship enabled? An explicit option wins; otherwise the
 * group is on when one of `packages` is a dependency, and always on when
 * `packages` is absent. Dependencies come from every package.json between the
 * current working directory and the repo boundary — the directory holding
 * `.git` — so in a monorepo the app package, the workspace root, or both
 * count, and a stray package.json above the repo cannot enable anything.
 *
 * With `minMajor`, the dependency also has to be at that major or later. The
 * version is the installed one, read from the nearest
 * `node_modules/<name>/package.json` on the same walk; before an install it is
 * the lowest major the declared range allows. A version neither can tell
 * leaves the group off.
 */
export const detect = (option: boolean | undefined, packages: string[] | undefined, minMajor?: number): boolean =>
  option ?? (packages === undefined || packages.some(name => isPresent(foundFromCwd(), name, minMajor)));
