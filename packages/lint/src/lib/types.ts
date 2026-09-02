import type { OxlintConfig as OxlintNativeConfig } from "oxlint";
import type { RuleTester } from "oxlint/plugins-dev";

type OxRule = Parameters<RuleTester["run"]>[1];
type CreateRule = Extract<OxRule, { create: unknown }>;
type CreateOnceRule = Extract<OxRule, { createOnce: unknown }>;
type OxVisitor = ReturnType<CreateRule["create"]>;

/** A node in the AST oxlint hands JS plugins: a discriminated union on ESTree `type` names. */
export type AstNode = Parameters<NonNullable<OxVisitor[string]>>[0];

/** What a rule receives: `options`, `sourceCode`, `report`, `filename`. */
export type RuleContext = Parameters<CreateRule["create"]>[0];

export type Visitor = OxVisitor;

/**
 * oxlint's rule metadata plus the two fields this package reads: `defaultOff`
 * for rules a consumer opts into, `packages` for a rule gated on a dependency
 * of its own. Rule docs are required here — RULES.md is generated from them.
 */
export type RuleMeta = NonNullable<CreateRule["meta"]> & {
  docs: { description: string };
  defaultOff?: boolean;
  packages?: string[];
};

export type Rule = OxRule & { meta: RuleMeta };

/** A rule without its docs: what `problem()` takes before it adds the description. */
export type RuleBody = (Pick<CreateRule, "create"> | { createOnce: CreateOnceRule["createOnce"] }) & {
  meta?: Partial<RuleMeta>;
};

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

export type CoreOptions = {
  /** `@ashstack/zod/` rules — detected from `zod` */
  zod?: boolean;
};

export type ReactOptions = CoreOptions & {
  /** `@ashstack/query/` rules — detected from `@tanstack/react-query` */
  query?: boolean;
  /** `@ashstack/zustand/` rules — detected from `zustand` */
  zustand?: boolean;
  /** `@ashstack/i18n/` rules — detected from i18next/lingui/react-intl/use-intl/next-intl/expo-localization */
  i18n?: boolean;
  /** `@ashstack/tailwind/` rules — detected from `tailwindcss` */
  tailwind?: boolean;
  /** `@ashstack/tanstack-router/` rules — detected from `@tanstack/react-router` */
  tanstackRouter?: boolean;
};

/**
 * Every toggle is a rule module — one rule namespace each. Import bans and
 * package-gated single rules are auto-detect only; disable individual rules
 * by name in your `rules` block.
 */
export type ReactNativeOptions = ReactOptions & {
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
  /** `@ashstack/keyboard` import bans — `react-native-keyboard-controller` */
  keyboard?: boolean;
};

/** The config object an entry returns: oxlint's own shape, so `defineConfig({ extends: [core()] })` typechecks. */
export type OxlintConfig = OxlintNativeConfig;

/** The `rules` block of a config: oxlint's own map, so a built-in rule's options are checked. */
export type RuleMap = NonNullable<OxlintConfig["rules"]>;

export type JsPlugin = NonNullable<OxlintConfig["jsPlugins"]>[number];
