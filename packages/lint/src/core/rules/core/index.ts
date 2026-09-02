import { defineModule } from "../../../lib/module.js";
import { componentsTsxOnly } from "./components-tsx-only.js";
import { hoistIntl } from "./hoist-intl.js";
import { noComments } from "./no-comments.js";
import { noNamingConvention } from "./no-naming-convention.js";
import { noPackedCondition } from "./no-packed-condition.js";
import { useDesignSystem } from "./use-design-system.js";

export default defineModule({
  meta: { name: "@ashstack/core" },
  url: import.meta.url,
  docsWhen: "always on via `core()` and every entry above it (opt-in rules noted per rule)",
  rules: {
    "no-comments": noComments,
    "no-naming-convention": noNamingConvention,
    "no-packed-condition": noPackedCondition,
    "use-design-system": useDesignSystem,
    "components-tsx-only": componentsTsxOnly,
    "hoist-intl": hoistIntl,
  },
});
