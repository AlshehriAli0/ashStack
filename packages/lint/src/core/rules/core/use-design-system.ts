import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

// The design system is whatever sits in the UI directory, read from disk rather
// than listed in config. A list would need editing every time a primitive is
// added, and the failure mode of forgetting is a rule that quietly protects less
// than it appears to.
const DESIGN_SYSTEM_DIR = "src/components/ui";
const DESIGN_SYSTEM_ALIAS = "@/components/ui";
const PLATFORM_SUFFIX = /\.(?:ios|android|native|web)$/;

// A primitive named X also covers the older React Native ways of doing X.
const ALSO_COVERS: Record<string, string[]> = {
  Pressable: ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback", "TouchableNativeFeedback"],
};

interface Replacement {
  name: string;
  from: string;
}

const toPascalCase = (name: string): string =>
  name
    .split("-")
    .filter(Boolean)
    .map(part => (part[0] as string).toUpperCase() + part.slice(1))
    .join("");

const readDesignSystem = (dir: string, alias: string): Map<string, Replacement> => {
  const banned = new Map<string, Replacement>();

  let files: string[];
  try {
    files = readdirSync(isAbsolute(dir) ? dir : join(process.cwd(), dir));
  } catch {
    return banned;
  }

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;

    const base = file.slice(0, -4).replace(PLATFORM_SUFFIX, "");
    if (base === "index") continue;

    const name = toPascalCase(base);
    const from = `${alias}/${base}`;

    banned.set(name, { name, from });
    for (const alternative of ALSO_COVERS[name] ?? []) banned.set(alternative, { name, from });
  }

  return banned;
};

const designSystems = new Map<string, Map<string, Replacement>>();

const designSystemFor = (dir: string, alias: string): Map<string, Replacement> => {
  const cacheKey = `${dir} ${alias}`;
  let banned = designSystems.get(cacheKey);
  if (banned === undefined) {
    banned = readDesignSystem(dir, alias);
    designSystems.set(cacheKey, banned);
  }
  return banned;
};

export const useDesignSystem: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Bans a react-native import whose name matches a component file in the project's own design-system directory.",
    },
    schema: [
      {
        type: "object",
        properties: { dir: { type: "string" }, alias: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    let banned = new Map<string, Replacement>();
    return {
      before() {
        const options = (context.options?.[0] as { dir?: string; alias?: string } | undefined) ?? {};
        banned = designSystemFor(options.dir ?? DESIGN_SYSTEM_DIR, options.alias ?? DESIGN_SYSTEM_ALIAS);
        return banned.size > 0;
      },
      ImportDeclaration(node: AstNode) {
        if ((node.source as AstNode | undefined)?.value !== "react-native") return;

        for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
          if (specifier.type !== "ImportSpecifier") continue;

          const imported = (specifier.imported as AstNode | undefined)?.name as string | undefined;
          const replacement = imported === undefined ? undefined : banned.get(imported);
          if (replacement === undefined) continue;

          context.report({
            node: specifier,
            message: `Import \`${replacement.name}\` from "${replacement.from}" instead of \`${imported}\` from react-native. That wrapper carries the theme colours, the typography tokens and the font-scaling cap, so the raw primitive renders unthemed.`,
          });
        }
      },
    };
  },
};
