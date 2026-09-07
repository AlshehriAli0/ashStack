import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

/** Publishable packages, by the directory they live in under `packages/`. */
const DIRS = ["lint", "fmt"] as const;

export type Dir = (typeof DIRS)[number];

const BUMPS = ["patch", "minor", "major"] as const;

export type Bump = (typeof BUMPS)[number];

const isBump = (value: string): value is Bump => BUMPS.some(bump => bump === value);

/** The `"version"` field of a package.json, matched in place so the file keeps its formatting. */
const VERSION_FIELD = /("version":\s*")([^"]+)(")/;

/**
 * The next version for a bump. `major.minor.patch` only: this repo has never
 * shipped a prerelease, and a release asking for one should say so out loud
 * rather than fall out of a regex.
 */
export const bumped = (version: string, bump: Bump): string => {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part) || part < 0)) {
    throw new Error(`${version} is not a major.minor.patch version.`);
  }
  const [major = 0, minor = 0, patch = 0] = parts;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

/** The packages a release asks for, where `both` means every one of them. */
export const requestedDirs = (requested: string): Dir[] => {
  const asked = requested.split(",");
  return DIRS.filter(dir => asked.includes("both") || asked.includes(dir));
};

const bumpPackage = (dir: Dir, bump: Bump): string => {
  const path = join(repoRoot, "packages", dir, "package.json");
  const text = readFileSync(path, "utf8");
  const current = VERSION_FIELD.exec(text)?.[2];
  if (current === undefined) throw new Error(`${path} has no version field.`);
  const next = bumped(current, bump);
  writeFileSync(path, text.replace(VERSION_FIELD, `$1${next}$3`));
  return next;
};

/**
 * Writing the files is the script's job, not the module's: tests import the
 * pure parts. `release-notes.ts` reads the bumped versions back out of the
 * package.json files, so this runs first and prints only what it changed.
 */
const main = (bump: string, requested: string): void => {
  if (!isBump(bump)) throw new Error(`Bump must be one of ${BUMPS.join(", ")}, not "${bump}".`);
  for (const dir of requestedDirs(requested)) {
    console.error(`@ashstack/${dir} -> ${bumpPackage(dir, bump)}`);
  }
};

if (import.meta.main) main(process.argv[2] ?? "patch", process.argv[3] ?? "both");
