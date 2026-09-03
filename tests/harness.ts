import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  /**
   * The file text after `oxlint --fix-suggestions`, which is how a rule's
   * suggestions get asserted: the JSON formatter never reports them, so the
   * only way to see one is to let oxlint apply it. Equal to `code` for a
   * diagnostic that deliberately offers no suggestion.
   */
  output?: string;
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

interface Linted {
  byPath: Map<string, Diagnostic[]>;
  fixedByPath: Map<string, string>;
}

const asCase = (input: string | ValidCase): ValidCase => (typeof input === "string" ? { code: input } : input);

const label = (testCase: ValidCase): string =>
  testCase.name ?? testCase.code.trim().replaceAll(/\s+/g, " ").slice(0, 72);

const spanOf = (diagnostic: Diagnostic): Span | undefined => diagnostic.labels?.[0]?.span;

const messageMatches = (actual: string, expected: string | RegExp): boolean =>
  typeof expected === "string" ? actual.includes(expected) : expected.test(actual);

const runOxlint = async (dir: string, config: object): Promise<Diagnostic[]> => {
  writeFileSync(join(dir, "oxlint.config.json"), JSON.stringify(config));
  const run = Bun.spawn([OXLINT, "-c", "oxlint.config.json", "--disable-nested-config", "--format", "json", "."], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text()]);
  try {
    return JSON.parse(stdout).diagnostics ?? [];
  } catch {
    throw new Error(`oxlint produced no JSON:\n${stdout.slice(0, 2000)}\n${stderr.slice(0, 2000)}`);
  }
};

/**
 * Rewrite `paths` with every suggestion their rules offer, reusing the config
 * `runOxlint` left in the bucket. Scoped to the paths a case asserts on, and only
 * ever called once the bucket's diagnostics are in hand, since it edits in place.
 */
const applySuggestions = async (root: string, bucket: string, paths: string[]): Promise<void> => {
  const config = join(bucket, "oxlint.config.json");
  const run = Bun.spawn([OXLINT, "-c", config, "--disable-nested-config", "--fix-suggestions", ...paths], {
    cwd: root,
    stdout: "ignore",
    stderr: "ignore",
  });
  await run.exited;
};

/**
 * Lint one file with a whole entry config and return the rule codes that
 * fired, for assertions about an entry rather than a module: whether an entry
 * turns a rule off is a fact about the config oxlint resolves, not about the
 * object the entry returns.
 */
export const codesFrom = async (config: object, code: string): Promise<string[]> => {
  const dir = mkdtempSync(join(tmpdir(), "ashstack-entry-"));
  try {
    writeFileSync(join(dir, "case.tsx"), code);
    return (await runOxlint(dir, config)).map(diagnostic => diagnostic.code);
  } finally {
    rmSync(dir, { recursive: true, force: true });
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
  /** Per bucket, the paths whose case asserts an `output` and so needs reading back once fixed. */
  const fixedByBucket = new Map<string, string[]>();

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
      return { bucket, path };
    };
    cases.valid.forEach((input, index) => {
      place("valid", index, input);
    });
    cases.invalid.forEach((testCase, index) => {
      const { bucket, path } = place("invalid", index, testCase);
      if (testCase.output === undefined) return;
      fixedByBucket.set(bucket, [...(fixedByBucket.get(bucket) ?? []), path]);
    });
  }

  /** The asserted files as the suggestion pass leaves them, which is the only way to see a suggestion. */
  const readSuggested = async (): Promise<Map<string, string>> => {
    await Promise.all([...fixedByBucket].map(([bucket, paths]) => applySuggestions(root, bucket, paths)));
    const fixed = [...fixedByBucket.values()].flat();
    return new Map(fixed.map(path => [path, readFileSync(join(root, path), "utf8")]));
  };

  const lintEveryBucket = async (): Promise<Linted> => {
    const byPath = new Map<string, Diagnostic[]>();
    try {
      const runs = [...bucketRules].map(async ([bucket, rules]) => {
        const config = { plugins: [], categories: CATEGORIES_OFF, jsPlugins: [fileURLToPath(module.url)], rules };
        return [bucket, await runOxlint(join(root, bucket), config)] as const;
      });
      for (const [bucket, diagnostics] of await Promise.all(runs)) {
        for (const diagnostic of diagnostics) {
          const path = join(bucket, diagnostic.filename);
          byPath.set(path, [...(byPath.get(path) ?? []), diagnostic]);
        }
      }
      return { byPath, fixedByPath: await readSuggested() };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  /**
   * Every bucket lints at once, and the first case to run waits on the lot.
   * Settled either way so a failure surfaces inside a test rather than as an
   * unhandled rejection before any test has started.
   */
  const linted: Promise<{ result: Linted } | { failure: unknown }> = lintEveryBucket().then(
    result => ({ result }),
    (failure: unknown) => ({ failure })
  );

  const settled = async (): Promise<Linted> => {
    const outcome = await linted;
    if ("failure" in outcome) throw outcome.failure;
    return outcome.result;
  };

  const firedOn = async (key: string): Promise<Diagnostic[]> => {
    const { byPath } = await settled();
    const placed = placedByKey.get(key)!;
    return (byPath.get(placed.path) ?? [])
      .filter(diagnostic => diagnostic.code === `${module.meta.name}(${placed.rule})`)
      .sort((a, b) => (spanOf(a)?.offset ?? 0) - (spanOf(b)?.offset ?? 0));
  };

  const suggestedFor = async (key: string): Promise<string> => {
    const { fixedByPath } = await settled();
    return fixedByPath.get(placedByKey.get(key)!.path)!;
  };

  const shown = (diagnostic: Diagnostic): string =>
    `${spanOf(diagnostic)?.line}:${spanOf(diagnostic)?.column} ${diagnostic.message}`;

  describe(module.meta.name, () => {
    for (const [rule, cases] of Object.entries(byRule)) {
      describe(rule, () => {
        cases.valid.forEach((input, index) => {
          it(`valid: ${label(asCase(input))}`, async () => {
            expect((await firedOn(`${rule}::valid::${index}`)).map(shown)).toEqual([]);
          });
        });

        cases.invalid.forEach((testCase, index) => {
          it(`invalid: ${label(testCase)}`, async () => {
            const fired = await firedOn(`${rule}::invalid::${index}`);
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

          const { output } = testCase;
          if (output !== undefined) {
            it(`suggests: ${label(testCase)}`, async () => {
              expect(await suggestedFor(`${rule}::invalid::${index}`)).toBe(output);
            });
          }
        });
      });
    }
  });
};
