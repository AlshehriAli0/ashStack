import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ModuleManifest } from "../packages/lint/dist/lib/types.js";

const OXLINT = join(import.meta.dir, "..", "node_modules", ".bin", "oxlint");
const CATEGORIES_OFF = {
  correctness: "off",
  suspicious: "off",
  perf: "off",
  pedantic: "off",
  style: "off",
  restriction: "off",
  nursery: "off",
};

/** One expected diagnostic. `line` and `column` are 1-based, as oxlint reports them. */
export interface Expected {
  /** Substring when a string, pattern test when a regex. */
  message?: string | RegExp;
  line?: number;
  column?: number;
}

export interface ValidCase {
  /** Test label; defaults to the code itself. */
  name?: string;
  code: string;
  /** Path relative to the case directory. Rules that read `context.filename` need this. */
  filename?: string;
  /** Rule options. A case that passes options gets its own oxlint run unless it names a `bucket`. */
  options?: unknown;
  /**
   * Name of the oxlint run to place this case in. Cases sharing a bucket are
   * linted together, which is how per-file state that outlives `before()`
   * becomes visible. Option-less cases already share one bucket.
   */
  bucket?: string;
}

export interface InvalidCase extends ValidCase {
  /** An exact count, or one entry per diagnostic in source order. */
  errors: number | Expected[];
}

export interface RuleCases {
  valid: (string | ValidCase)[];
  invalid: InvalidCase[];
}

interface Span {
  line: number;
  column: number;
  offset: number;
}

interface Diagnostic {
  message: string;
  code: string;
  filename: string;
  labels?: { span: Span }[];
}

interface Placed {
  rule: string;
  path: string;
}

const asCase = (input: string | ValidCase): ValidCase => (typeof input === "string" ? { code: input } : input);

const label = (testCase: ValidCase): string =>
  testCase.name ?? testCase.code.trim().replaceAll(/\s+/g, " ").slice(0, 72);

const spanOf = (diagnostic: Diagnostic): Span | undefined => diagnostic.labels?.[0]?.span;

const messageMatches = (actual: string, expected: string | RegExp): boolean =>
  typeof expected === "string" ? actual.includes(expected) : expected.test(actual);

const runOxlint = (dir: string, config: object): Diagnostic[] => {
  writeFileSync(join(dir, "oxlint.config.json"), JSON.stringify(config));
  const run = Bun.spawnSync([OXLINT, "-c", "oxlint.config.json", "--disable-nested-config", "--format", "json", "."], {
    cwd: dir,
  });
  const stdout = run.stdout.toString();
  try {
    return JSON.parse(stdout).diagnostics ?? [];
  } catch {
    throw new Error(`oxlint produced no JSON:\n${stdout.slice(0, 2000)}\n${run.stderr.toString().slice(0, 2000)}`);
  }
};

/**
 * Run every case for one module through real oxlint and assert per case.
 *
 * Cases go into a temp directory and are linted in as few runs as possible:
 * one shared run for every case that passes no options, plus one run per case
 * that does. Diagnostics match back by file and rule code, so rules sharing a
 * run never interfere.
 */
export const moduleTests = (module: ModuleManifest, byRule: Record<string, RuleCases>): void => {
  for (const rule of Object.keys(byRule)) {
    if (!(rule in module.rules)) throw new Error(`${module.meta.name}: no such rule "${rule}"`);
  }

  const root = mkdtempSync(join(tmpdir(), `ashstack-${module.meta.name.replaceAll(/\W+/g, "-")}-`));
  const placedByKey = new Map<string, Placed>();
  const bucketRules = new Map<string, Record<string, unknown>>();

  for (const [rule, cases] of Object.entries(byRule)) {
    const place = (kind: "valid" | "invalid", index: number, input: string | ValidCase) => {
      const testCase = asCase(input);
      const { options } = testCase;
      const bucket = testCase.bucket ?? (options === undefined ? "shared" : `${rule}-${kind}-${index}`);
      const path = join(bucket, rule, `${kind}-${index}`, testCase.filename ?? "case.tsx");

      placedByKey.set(`${rule}::${kind}::${index}`, { rule, path });
      bucketRules.set(bucket, {
        ...bucketRules.get(bucket),
        [`${module.meta.name}/${rule}`]: options === undefined ? "error" : ["error", options],
      });
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), testCase.code);
    };
    cases.valid.forEach((input, index) => {
      place("valid", index, input);
    });
    cases.invalid.forEach((input, index) => {
      place("invalid", index, input);
    });
  }

  const byPath = new Map<string, Diagnostic[]>();
  try {
    for (const [bucket, rules] of bucketRules) {
      const config = { plugins: [], categories: CATEGORIES_OFF, jsPlugins: [fileURLToPath(module.url)], rules };
      for (const diagnostic of runOxlint(join(root, bucket), config)) {
        const path = join(bucket, diagnostic.filename);
        byPath.set(path, [...(byPath.get(path) ?? []), diagnostic]);
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const firedOn = (key: string): Diagnostic[] => {
    const placed = placedByKey.get(key)!;
    return (byPath.get(placed.path) ?? [])
      .filter(diagnostic => diagnostic.code === `${module.meta.name}(${placed.rule})`)
      .sort((a, b) => (spanOf(a)?.offset ?? 0) - (spanOf(b)?.offset ?? 0));
  };

  const shown = (diagnostic: Diagnostic): string =>
    `${spanOf(diagnostic)?.line}:${spanOf(diagnostic)?.column} ${diagnostic.message}`;

  describe(module.meta.name, () => {
    for (const [rule, cases] of Object.entries(byRule)) {
      describe(rule, () => {
        cases.valid.forEach((input, index) => {
          it(`valid: ${label(asCase(input))}`, () => {
            expect(firedOn(`${rule}::valid::${index}`).map(shown)).toEqual([]);
          });
        });

        cases.invalid.forEach((testCase, index) => {
          it(`invalid: ${label(testCase)}`, () => {
            const fired = firedOn(`${rule}::invalid::${index}`);
            const want = testCase.errors;
            expect(fired.map(shown)).toHaveLength(typeof want === "number" ? want : want.length);
            if (typeof want === "number") return;

            want.forEach((expected, position) => {
              const got = fired[position]!;
              if (expected.message !== undefined && !messageMatches(got.message, expected.message)) {
                throw new Error(`error ${position}: ${JSON.stringify(got.message)} does not match ${expected.message}`);
              }
              if (expected.line !== undefined) expect(spanOf(got)?.line).toBe(expected.line);
              if (expected.column !== undefined) expect(spanOf(got)?.column).toBe(expected.column);
            });
          });
        });
      });
    }
  });
};
