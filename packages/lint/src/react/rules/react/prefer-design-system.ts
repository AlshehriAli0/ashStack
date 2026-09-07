import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { optionsOf } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const DESIGN_SYSTEM_DIR = "src/components/ui";
const DESIGN_SYSTEM_ALIAS = "@/components/ui";
const PLATFORM_SUFFIX = /\.(?:ios|android|native|web)$/;

/** A tsconfig path alias: `@/components/ui` and `@app/ui` both name a real folder further down. */
const ALIAS_PREFIX = /^[@~#][^/]*\//;

const LEGACY_EQUIVALENTS: Record<string, string[]> = {
  Pressable: ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback", "TouchableNativeFeedback"],
};

interface Replacement {
  name: string;
  from: string;
  reason?: string;
}

type UseEntry = string | string[] | { replaces: string | string[]; from?: string; path?: string; reason?: string };

interface Options {
  dir?: string;
  alias?: string;
  use?: Record<string, UseEntry>;
  exempt?: string[];
}

const NAME_OR_NAMES = { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] };

/** What one `use` entry may be. Declared here so oxlint rejects a typo'd key instead of silently dropping the ban. */
const USE_ENTRY_SCHEMA = {
  anyOf: [
    ...NAME_OR_NAMES.anyOf,
    {
      type: "object",
      properties: {
        replaces: NAME_OR_NAMES,
        from: { type: "string" },
        path: { type: "string" },
        reason: { type: "string" },
      },
      required: ["replaces"],
      additionalProperties: false,
    },
  ],
};

const toPascalCase = (name: string): string =>
  name
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const toKebabCase = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

type ReplacementByImportName = Map<string, Replacement>;
type Banned = Map<string, ReplacementByImportName>;

const addBan = (banned: Banned, sourceModule: string, imported: string, replacement: Replacement): void => {
  const byImportName = banned.get(sourceModule) ?? new Map<string, Replacement>();
  byImportName.set(imported, replacement);
  banned.set(sourceModule, byImportName);
};

const scanDesignSystem = (banned: Banned, dir: string, alias: string): void => {
  let files: string[];
  try {
    files = readdirSync(isAbsolute(dir) ? dir : join(process.cwd(), dir));
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;

    const base = file.slice(0, -4).replace(PLATFORM_SUFFIX, "");
    if (base === "index") continue;

    const name = toPascalCase(base);
    const from = `${alias}/${base}`;

    addBan(banned, "react-native", name, { name, from });
    for (const legacy of LEGACY_EQUIVALENTS[name] ?? []) addBan(banned, "react-native", legacy, { name, from });
  }
};

const applyUse = (banned: Banned, alias: string, use: Record<string, UseEntry>): void => {
  for (const [component, entry] of Object.entries(use)) {
    const config = typeof entry === "string" || Array.isArray(entry) ? { replaces: entry } : entry;
    const replacement: Replacement = {
      name: component,
      from: config.path ?? `${alias}/${toKebabCase(component)}`,
      reason: config.reason,
    };
    for (const imported of [config.replaces].flat()) {
      addBan(banned, config.from ?? "react-native", imported, replacement);
    }
  }
};

/**
 * Every folder a wrapper can live in. `dir` is only where the scan looks; a
 * project that lists its wrappers in `use` may set no `dir` at all, so the
 * alias and each entry's `path` count too. Without all three, the wrappers
 * report themselves for importing the primitive they exist to wrap.
 */
const wrapperFolders = (dir: string, alias: string, use: Record<string, UseEntry>): string[] => {
  const folders = [dir, alias.replace(ALIAS_PREFIX, "")];
  for (const entry of Object.values(use)) {
    if (typeof entry === "string" || Array.isArray(entry) || entry.path === undefined) continue;
    folders.push(entry.path.replace(ALIAS_PREFIX, ""));
  }
  return folders.filter(folder => folder.length > 0);
};

const designSystems = new Map<string, { banned: Banned; wrappers: string[] }>();

/**
 * A fragment has to start at a path segment, or a directory called `ui` would
 * be matched by any parent whose name merely ends in it.
 */
const isExemptFile = (filename: string | undefined, exempt: string[]): boolean => {
  if (!filename) return false;
  const path = filename.replaceAll("\\", "/");
  return exempt.some(fragment => path.includes(isAbsolute(fragment) ? fragment : `/${fragment}`));
};

const designSystemFor = (options: Options): { banned: Banned; exempt: string[] } => {
  const dir = options.dir ?? DESIGN_SYSTEM_DIR;
  const alias = options.alias ?? DESIGN_SYSTEM_ALIAS;
  const use = options.use ?? {};

  const cacheKey = JSON.stringify([dir, alias, options.use]);
  let designSystem = designSystems.get(cacheKey);
  if (designSystem === undefined) {
    const banned: Banned = new Map();
    scanDesignSystem(banned, dir, alias);
    applyUse(banned, alias, use);
    designSystem = { banned, wrappers: wrapperFolders(dir, alias, use) };
    designSystems.set(cacheKey, designSystem);
  }
  return { banned: designSystem.banned, exempt: [...designSystem.wrappers, ...(options.exempt ?? [])] };
};

export const preferDesignSystem: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing a raw primitive your design system already wraps. Wrappers come from scanning the design-system directory and from the `use` map. Files inside the design system are skipped.",
    },
    schema: [
      {
        type: "object",
        properties: {
          dir: {
            type: "string",
            minLength: 1,
            default: DESIGN_SYSTEM_DIR,
            description: "Directory scanned for wrapper components. Every `.tsx` file in it becomes a wrapper.",
          },
          alias: {
            type: "string",
            minLength: 1,
            default: DESIGN_SYSTEM_ALIAS,
            description: "Import prefix the diagnostic points at, and a second folder counted as the design system.",
          },
          use: {
            type: "object",
            additionalProperties: USE_ENTRY_SCHEMA,
            default: {},
            description: "Wrappers the scan cannot find, keyed by component name.",
            examples: [
              {
                Button: "Pressable",
                Text: ["Text", "RNText"],
                Sheet: { replaces: "Modal", from: "react-native", path: "@/ui/sheet", reason: "It owns insets." },
              },
            ],
          },
          exempt: {
            type: "array",
            items: { type: "string" },
            default: [],
            description: "Extra path fragments to skip, added to the design system's own folders.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    let banned: Banned = new Map();
    return {
      before() {
        const options = optionsOf<Options>(context, {});
        const designSystem = designSystemFor(options);
        banned = designSystem.banned;
        if (banned.size === 0) return false;
        return !isExemptFile(context.filename, designSystem.exempt);
      },
      ImportDeclaration(node) {
        const source = node.source.value;
        const bySource = banned.get(source);
        if (bySource === undefined) return;

        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;

          const { imported } = specifier;
          if (imported.type !== "Identifier") continue;
          const replacement = bySource.get(imported.name);
          if (replacement === undefined) continue;

          const reason = replacement.reason ? ` ${replacement.reason}` : "";
          context.report({
            node: specifier,
            message: `Import \`${replacement.name}\` from "${replacement.from}" instead of \`${imported.name}\` from ${source}.${reason}`,
          });
        }
      },
    };
  },
};
