// Pragmatic structural types for oxlint JS plugins. The AST is oxlint's
// (estree-shaped with `parent` links); we type it loosely on purpose — rules
// poke at many node shapes and a full estree typing would fight every visitor.
export interface AstNode {
  type: string;
  parent?: AstNode | null;
  [key: string]: unknown;
}

export interface RuleContext {
  options?: unknown[];
  report(descriptor: { node: AstNode; message: string; [key: string]: unknown }): void;
  [key: string]: unknown;
}

export type Visitor = Record<string, (node: AstNode) => void>;

export interface RuleMeta {
  type?: "problem" | "suggestion" | "layout";
  docs: { description: string };
  schema?: unknown[];
  /** rule ships disabled; consumers opt in per project */
  defaultOff?: boolean;
  /** rule (not just its module) is gated on one of these packages being a dependency */
  packages?: string[];
}

export interface Rule {
  meta: RuleMeta;
  create?(context: RuleContext): Visitor;
  createOnce?(context: RuleContext): Visitor & { before?(): boolean | void; after?(): void };
}

export interface RestrictedPath {
  name: string;
  importNames?: string[];
  message: string;
}

export interface RestrictedPattern {
  group: string[];
  message: string;
}

export interface RestrictedImports {
  paths?: RestrictedPath[];
  patterns?: RestrictedPattern[];
}

/**
 * A module is the unit of rule organization: one rule namespace, one plugin
 * file, one optional toggle. The default export of a module's index file IS
 * the oxlint plugin (meta + rules); the extra fields make it the single
 * source of truth for detection, bans, and docs (oxlint ignores them).
 */
export interface ModuleManifest {
  meta: { name: `@ashstack/${string}` };
  rules: Record<string, Rule>;
  /** import.meta.url of the module file — how entries hand oxlint an absolute plugin path */
  url: string;
  /** enable when one of these is a dependency; absent = always on */
  packages?: string[];
  /** key in the entry options that forces the module on/off; absent = auto-only */
  option?: string;
  /** activation line for RULES.md, e.g. "auto-enabled when `zod` is a dependency" */
  docsWhen: string;
  /** import bans that ship with (and only with) this module */
  restrictedImports?: RestrictedImports;
}

/** A ban-only group: import bans gated on a library, with no rules of its own. */
export interface BanGroup {
  packages: string[];
  restrictedImports: RestrictedImports;
}

export interface CoreOptions {
  /** `@ashstack/zod/` rules — detected from `zod` */
  zod?: boolean;
}

export interface ReactOptions extends CoreOptions {
  /** `@ashstack/query/` rules — detected from `@tanstack/react-query` */
  query?: boolean;
  /** `@ashstack/zustand/` rules — detected from `zustand` */
  zustand?: boolean;
  /** `@ashstack/i18n/` rules — detected from i18next/lingui/react-intl/use-intl/next-intl/expo-localization */
  i18n?: boolean;
}

/**
 * Every toggle is a rule module — one rule namespace each. Import bans and
 * package-gated single rules are auto-detect only; disable individual rules
 * by name in your `rules` block.
 */
export interface ReactNativeOptions extends ReactOptions {
  /** `@ashstack/unistyles/` rules + StyleSheet/Dimensions/SafeArea import bans — `react-native-unistyles` */
  unistyles?: boolean;
  /** `@ashstack/legend-list/` rules + FlatList/FlashList bans — `@legendapp/list` */
  legendList?: boolean;
  /** `@ashstack/legend-state/` rules + use$/useSelector ban — `@legendapp/state` */
  legendState?: boolean;
  /** `@ashstack/reanimated/` rules + Animated/runOnJS bans — `react-native-reanimated` */
  reanimated?: boolean;
  /** `@ashstack/turbo-image/` rules — `react-native-turbo-image` */
  turboImage?: boolean;
  /** `@ashstack/skia/` rules — `@shopify/react-native-skia` */
  skia?: boolean;
  /** `@ashstack/keyboard/` rules — `react-native-keyboard-controller` */
  keyboard?: boolean;
}

/** The oxlint config object an entry returns (schema owned by oxlint). */
export type OxlintConfig = Record<string, unknown>;
