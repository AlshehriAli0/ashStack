import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DESIGN_SYSTEM_DIR = "src/components/ui";
const DESIGN_SYSTEM_ALIAS = "@/components/ui";
const PLATFORM_SUFFIX = /\.(?:ios|android|native|web)$/;

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

const toPascalCase = (name: string): string =>
  name
    .split("-")
    .filter(Boolean)
    .map(part => (part[0] as string).toUpperCase() + part.slice(1))
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

const designSystems = new Map<string, Banned>();

const isExemptFile = (filename: string | undefined, exempt: string[]): boolean =>
  !!filename && exempt.some(fragment => filename.includes(fragment));

const designSystemFor = (options: Options): { banned: Banned; exempt: string[] } => {
  const dir = options.dir ?? DESIGN_SYSTEM_DIR;
  const alias = options.alias ?? DESIGN_SYSTEM_ALIAS;
  const exempt = options.exempt ?? [dir];

  const cacheKey = JSON.stringify([dir, alias, options.use]);
  let banned = designSystems.get(cacheKey);
  if (banned === undefined) {
    banned = new Map();
    scanDesignSystem(banned, dir, alias);
    if (options.use) applyUse(banned, alias, options.use);
    designSystems.set(cacheKey, banned);
  }
  return { banned, exempt };
};

export const useDesignSystem: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Bans importing a raw primitive your design system already wraps. Wrapped components come from scanning the design-system directory, plus the explicit `use` map for names, paths and source modules the scan cannot infer. Files under the design-system directory (or `exempt`) are skipped.",
    },
    schema: [
      {
        type: "object",
        properties: {
          dir: { type: "string" },
          alias: { type: "string" },
          use: { type: "object" },
          exempt: { type: "array", items: { type: "string" } },
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
        const options = (context.options?.[0] as Options | undefined) ?? {};
        const designSystem = designSystemFor(options);
        banned = designSystem.banned;
        if (banned.size === 0) return false;
        const filename = context.filename ?? context.physicalFilename;
        if (isExemptFile(filename, designSystem.exempt)) return false;
        return true;
      },
      ImportDeclaration(node: AstNode) {
        if (node.type !== "ImportDeclaration") return;
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
            message: `Import \`${replacement.name}\` from "${replacement.from}" instead of \`${imported.name}\` from ${source}. The wrapper is where the theme tokens and app behavior live.${reason}`,
          });
        }
      },
    };
  },
};
