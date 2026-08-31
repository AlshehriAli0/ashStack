// @ashstack/skia — React Native Skia rules, on when @shopify/react-native-skia
// is a dependency.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.
import { defineModule } from "../../../lib/module.js";
import { canvasOpaque } from "./canvas-opaque.js";
import { noLegacyPathHooks } from "./no-legacy-path-hooks.js";

export default defineModule({
  meta: { name: "@ashstack/skia" },
  url: import.meta.url,
  packages: ["@shopify/react-native-skia"],
  option: "skia",
  docsWhen: "auto-enabled when `@shopify/react-native-skia` is a dependency",
  rules: {
    "canvas-opaque": canvasOpaque,
    "no-legacy-path-hooks": noLegacyPathHooks,
  },
});
