import { isAbsolute } from "node:path";

export const DESIGN_SYSTEM_DIR = "src/components/ui";
export const DESIGN_SYSTEM_ALIAS = "@/components/ui";

/** A tsconfig path alias: `@/components/ui` and `@app/ui` both name a real folder further down. */
const ALIAS_PREFIX = /^[@~#][^/]*\//;

export interface DesignSystemOptions {
  dir?: string;
  alias?: string;
}

/** The `dir`/`alias` options of every rule that reads the design-system folders. */
export const DESIGN_SYSTEM_SCHEMA = {
  type: "object",
  properties: {
    dir: {
      type: "string",
      minLength: 1,
      default: DESIGN_SYSTEM_DIR,
      description: "Folder holding the design system, whose files own the peer contract.",
    },
    alias: {
      type: "string",
      minLength: 1,
      default: DESIGN_SYSTEM_ALIAS,
      description: "Import prefix that names the design system.",
    },
  },
  additionalProperties: false,
};

/**
 * Every path fragment that counts as inside the design system: `dir`, the
 * `alias` without its tsconfig prefix, and any extra folder a caller adds.
 */
export const designSystemFolders = (options: DesignSystemOptions, extra: string[] = []): string[] =>
  [options.dir ?? DESIGN_SYSTEM_DIR, options.alias ?? DESIGN_SYSTEM_ALIAS, ...extra]
    .map(fragment => fragment.replace(ALIAS_PREFIX, ""))
    .filter(fragment => fragment.length > 0);

/**
 * Whether a file path or import specifier sits inside one of `folders`. A
 * fragment has to start at a path segment, or a directory called `ui` would be
 * matched by any parent whose name merely ends in it.
 */
export const isInsideDesignSystem = (path: string | undefined, folders: string[]): boolean => {
  if (path === undefined) return false;
  const normalized = path.replaceAll("\\", "/");
  return folders.some(folder => normalized.includes(isAbsolute(folder) ? folder : `/${folder}`));
};
