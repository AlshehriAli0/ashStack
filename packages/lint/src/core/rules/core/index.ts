import { defineModule } from "../../../lib/module.js";
import { maxComplexity } from "./max-complexity.js";
import { maxLines } from "./max-lines.js";
import { noComments } from "./no-comments.js";
import { noNamingConvention } from "./no-naming-convention.js";
import { noPackedCondition } from "./no-packed-condition.js";

export default defineModule({
  meta: { name: "@ashstack/core" },
  url: import.meta.url,
  docsWhen: "always on via `core()` and every entry above it",
  rules: {
    "no-comments": noComments,
    "no-naming-convention": noNamingConvention,
    "no-packed-condition": noPackedCondition,
    "max-lines": maxLines,
    "max-complexity": maxComplexity,
  },
});
