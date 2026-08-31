// @ashstack/turbo-image — react-native-turbo-image rules, on when the package
// is a dependency.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.
import { defineModule } from "../../../lib/module.js";
import { requireCachePolicy } from "./require-cache-policy.js";
import { requireResize } from "./require-resize.js";

export default defineModule({
  meta: { name: "@ashstack/turbo-image" },
  url: import.meta.url,
  packages: ["react-native-turbo-image"],
  option: "turboImage",
  docsWhen: "auto-enabled when `react-native-turbo-image` is a dependency",
  rules: {
    "require-resize": requireResize,
    "require-cache-policy": requireCachePolicy,
  },
});
