// @ashstack/lint — ash oxlint JS plugin. Rules that apply to any file in the
// stack: comments, naming, and project structure.
import { defineModule } from "../../../lib/module.js";
import { commentEscapeHatch } from "./comment-escape-hatch.js";
import { componentsTsxOnly } from "./components-tsx-only.js";
import { hoistIntl } from "./hoist-intl.js";
import { noComments } from "./no-comments.js";
import { noNamingConvention } from "./no-naming-convention.js";
import { useDesignSystem } from "./use-design-system.js";

export default defineModule({
  meta: { name: "@ashstack/core" },
  url: import.meta.url,
  docsWhen: "always on via `core()` and every entry above it (opt-in rules noted per rule)",
  rules: {
    "no-comments": noComments,
    "comment-escape-hatch": commentEscapeHatch,
    "no-naming-convention": noNamingConvention,
    "use-design-system": useDesignSystem,
    "components-tsx-only": componentsTsxOnly,
    "hoist-intl": hoistIntl,
  },
});
