import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { EFFECT_NAMESPACE, EFFECT_SPECIFIER } from "../packages/lint/dist/lib/effect-plugin.js";
import type { ModuleManifest, Rule } from "../packages/lint/dist/lib/types.js";

const repoRoot = join(import.meta.dir, "..");

const REACT_EFFECT_DOCS = "https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect";

/** GitHub's heading slug: lowercased, punctuation dropped, spaces hyphenated. */
export const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-");

/** What gates a rule, as plain sentences RULES.md quotes. */
export const ruleNotes = (meta: Rule["meta"]): string[] => [
  ...(meta.defaultOff === true ? ["Off by default — opt in per project."] : []),
  ...(meta.packages
    ? [`Enabled only when one of ${meta.packages.map(name => `\`${name}\``).join(", ")} is a dependency.`]
    : []),
];

interface VendoredRule {
  meta?: { docs?: { description?: string; url?: string } };
}

/**
 * The vendored effect rules as a module, so they render through the same
 * section and table-of-contents code as every other namespace.
 * They carry no fixtures, which the renderer already omits, and the
 * description keeps the upstream link the plugin ships.
 */
export const effectsModule = async (): Promise<ModuleManifest> => {
  const loaded: unknown = await import(EFFECT_SPECIFIER);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const plugin = loaded as { default?: { rules?: Record<string, VendoredRule> } };
  const vendored = Object.entries(plugin.default?.rules ?? {});

  const described = ([name, rule]: [string, VendoredRule]): [string, Rule] => {
    const docs = rule.meta?.docs ?? {};
    const description = docs.description ?? "";
    return [
      name,
      {
        meta: {
          type: "problem",
          docs: { description: docs.url === undefined ? description : `${description} [Why](${docs.url})` },
        },
        create: () => ({}),
      },
    ];
  };

  return {
    meta: { name: EFFECT_NAMESPACE },
    url: EFFECT_SPECIFIER,
    docsWhen: `always on via \`react()\` and every entry above it, from [eslint-plugin-react-you-might-not-need-an-effect](${REACT_EFFECT_DOCS}) (MIT)`,
    rules: Object.fromEntries(vendored.map(described)),
  };
};

/**
 * The text `oxfmt` would leave behind, so a staleness check compares like with
 * like instead of losing to the formatter. The path decides which config and
 * parser apply; nothing is written.
 */
export const formatGenerated = (path: string, text: string): string => {
  const run = Bun.spawnSync([join(repoRoot, "node_modules", ".bin", "oxfmt"), `--stdin-filepath=${path}`], {
    stdin: new TextEncoder().encode(text),
  });
  if (run.exitCode !== 0) throw new Error(`oxfmt could not format ${path}: ${run.stderr.toString()}`);
  return run.stdout.toString();
};

/** Every generator takes `--check` to assert instead of write, so CI fails on an uncommitted regeneration. */
export const CHECK = process.argv.includes("--check");

export type Generated = [path: string, text: string];

/**
 * Write what the generator produced, or under `--check` fail naming the files
 * that disagree and the command that fixes them.
 */
export const emit = (files: Generated[], label: string, regenerate: string): void => {
  const named = (path: string): string => relative(repoRoot, path);

  if (!CHECK) {
    for (const [path, text] of files) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
    console.log(`wrote ${files.map(([path]) => named(path)).join(", ")}`);
    return;
  }

  const stale = files
    .filter(([path, text]) => (existsSync(path) ? readFileSync(path, "utf8") : "") !== text)
    .map(([path]) => named(path));

  if (stale.length > 0) {
    console.error(`stale, run \`${regenerate}\` and commit the result: ${stale.join(", ")}`);
    process.exit(1);
  }
  console.log(`${label} ok`);
};
