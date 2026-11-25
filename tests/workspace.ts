import { afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

export interface Layout {
  /** Directory path relative to the workspace root, mapped to its package.json dependency block. */
  [dir: string]: Record<string, Record<string, string>>;
}

/**
 * Build a throwaway workspace and return the absolute path of each directory
 * in it. `.git` marks the repo boundary, exactly as `detect` looks for it.
 */
export const workspace = (layout: Layout, gitAt = "repo"): Record<string, string> => {
  const root = mkdtempSync(join(tmpdir(), "ashstack-detect-"));
  roots.push(root);
  mkdirSync(join(root, gitAt, ".git"), { recursive: true });
  const paths: Record<string, string> = { root };
  for (const [dir, pkg] of Object.entries(layout)) {
    const absolute = join(root, dir);
    mkdirSync(absolute, { recursive: true });
    writeFileSync(join(absolute, "package.json"), JSON.stringify({ name: dir.replaceAll("/", "-"), ...pkg }));
    paths[dir] = absolute;
  }
  return paths;
};

/** Put `name` at `version` in `dir/node_modules`, the way an install leaves it. */
export const install = (dir: string, name: string, version: string): void => {
  const at = join(dir, "node_modules", name);
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, "package.json"), JSON.stringify({ name, version }));
};

export const inDir = <T>(dir: string, body: () => T): T => {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return body();
  } finally {
    process.chdir(before);
  }
};
