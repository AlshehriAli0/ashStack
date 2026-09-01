import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { detect } from "../packages/lint/dist/lib/detect.js";

const roots: string[] = [];

interface Layout {
  /** Directory path relative to the workspace root, mapped to its package.json dependency block. */
  [dir: string]: Record<string, Record<string, string>>;
}

/**
 * Build a throwaway workspace and return the absolute path of each directory
 * in it. `.git` marks the repo boundary, exactly as `detect` looks for it.
 */
const workspace = (layout: Layout, gitAt = "repo"): Record<string, string> => {
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

const inDir = <T>(dir: string, body: () => T): T => {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return body();
  } finally {
    process.chdir(before);
  }
};

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe("detect", () => {
  it("is on when the package is a dependency of the current directory", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("is off when no listed package is a dependency", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["react-native-unistyles"]))).toBe(false);
  });

  it("is on when any one of several packages matches", () => {
    const paths = workspace({ repo: { dependencies: { "use-intl": "^3.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["i18next", "use-intl", "lingui"]))).toBe(true);
  });

  it("is on when packages is absent", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, undefined))).toBe(true);
  });

  it("is off for an empty package list", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, []))).toBe(false);
  });

  it("reads devDependencies", () => {
    const paths = workspace({ repo: { devDependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("reads peerDependencies", () => {
    const paths = workspace({ repo: { peerDependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("finds a dependency declared at the workspace root from a nested package", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/apps/mobile": {} });
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("finds a dependency declared in the nested package itself", () => {
    const paths = workspace({ repo: {}, "repo/apps/mobile": { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("stops at the repo boundary and ignores a package.json above it", () => {
    const paths = workspace({ "": { dependencies: { zod: "^4.0.0" } }, repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });

  it("includes the boundary directory's own package.json", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/apps": {} });
    expect(inDir(paths["repo/apps"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("survives a directory with no package.json on the way up", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/a/b/c": {} });
    expect(inDir(paths["repo/a/b/c"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("survives an unparseable package.json", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/broken": {} });
    writeFileSync(join(paths["repo/broken"]!, "package.json"), "{ not json");
    expect(inDir(paths["repo/broken"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("lets an explicit true win over a missing dependency", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(true, ["zod"]))).toBe(true);
  });

  it("lets an explicit false win over a present dependency", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(false, ["zod"]))).toBe(false);
  });

  it("lets an explicit false win even when packages is absent", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(false, undefined))).toBe(false);
  });

  it("gives different answers in different directories of the same run", () => {
    const withZod = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    const without = workspace({ repo: {} });
    expect(inDir(withZod.repo!, () => detect(undefined, ["zod"]))).toBe(true);
    expect(inDir(without.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });

  it("caches per directory, so a package.json written after the first read is not seen", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
    writeFileSync(join(paths.repo!, "package.json"), JSON.stringify({ dependencies: { zod: "^4.0.0" } }));
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });
});
