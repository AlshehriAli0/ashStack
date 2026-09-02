import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const OXLINT = join(root, "node_modules", ".bin", "oxlint");
const DIST = join(root, "packages", "lint", "dist");

const CORE_PLUGIN = join(DIST, "core", "rules", "core", "index.js");
const REACT_NATIVE_PLUGIN = join(DIST, "react-native", "rules", "react-native", "index.js");

const CATEGORIES_OFF = {
  correctness: "off",
  suspicious: "off",
  perf: "off",
  pedantic: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
};

const MARKED_MEMO = `import { memo, useMemo } from "react";

// why: rendered per list row, so the compiler cannot hoist it
export const Row = memo(() => null);

export const useTotals = (rows: number[]) =>
  // why: measured at 40ms on a Pixel 4a for 5k rows
  useMemo(() => rows.reduce((sum, row) => sum + row, 0), [rows]);
`;

const THREE_MARKED_MEMOS = `import { memo } from "react";

// why: rendered per list row, so the compiler cannot hoist it
export const First = memo(() => null);

// why: rendered per list row, so the compiler cannot hoist it
export const Second = memo(() => null);

// why: rendered per list row, so the compiler cannot hoist it
export const Third = memo(() => null);
`;

interface Diagnostic {
  message: string;
  code: string;
}

/**
 * Both rules at once, which the per-module harness cannot do: `no-comments`
 * and `no-manual-memo` live in different plugins, and the deadlock between
 * them only shows when oxlint loads the two together.
 */
const lintWithBothRules = (fixture: string, code: string, options: unknown = "error"): Diagnostic[] => {
  const dir = mkdtempSync(join(tmpdir(), "ashstack-interop-"));
  try {
    writeFileSync(
      join(dir, "oxlint.config.json"),
      JSON.stringify({
        plugins: [],
        categories: CATEGORIES_OFF,
        jsPlugins: [CORE_PLUGIN, REACT_NATIVE_PLUGIN],
        rules: {
          "@ashstack/core/no-comments": options,
          "@ashstack/react-native/no-manual-memo": "error",
        },
      })
    );
    mkdirSync(dirname(join(dir, fixture)), { recursive: true });
    writeFileSync(join(dir, fixture), code);

    const run = Bun.spawnSync(
      [OXLINT, "-c", "oxlint.config.json", "--disable-nested-config", "--format", "json", "."],
      {
        cwd: dir,
      }
    );
    const stdout = run.stdout.toString();
    try {
      return JSON.parse(stdout).diagnostics ?? [];
    } catch {
      throw new Error(`oxlint produced no JSON:\n${stdout.slice(0, 2000)}\n${run.stderr.toString().slice(0, 2000)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const shown = (diagnostics: Diagnostic[]): string[] => diagnostics.map(d => `${d.code}: ${d.message.slice(0, 80)}`);

describe("no-manual-memo and no-comments together", () => {
  it("says nothing about a marked memo", () => {
    expect(shown(lintWithBothRules("marked-memo.tsx", MARKED_MEMO))).toEqual([]);
  });

  it("says nothing about three marked memos in one file, past the comment budget", () => {
    expect(shown(lintWithBothRules("three-memos.tsx", THREE_MARKED_MEMOS))).toEqual([]);
  });

  it("says nothing with the comment hatch closed, which would leave no-manual-memo unsatisfiable", () => {
    expect(shown(lintWithBothRules("marked-memo.tsx", MARKED_MEMO, ["error", { escapeHatch: false }]))).toEqual([]);
  });

  it("says nothing with a comment budget of zero", () => {
    expect(shown(lintWithBothRules("three-memos.tsx", THREE_MARKED_MEMOS, ["error", { budget: 0 }]))).toEqual([]);
  });

  it("still reports a memo with no marker at all", () => {
    const code = `import { memo } from "react";\n\nexport const Row = memo(() => null);\n`;
    const fired = lintWithBothRules("bare-memo.tsx", code);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.code).toContain("no-manual-memo");
  });
});
