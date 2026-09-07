import { defineModule } from "../../../lib/module.js";
import { componentsTsxOnly } from "./components-tsx-only.js";
import { hoistIntl } from "./hoist-intl.js";
import { noSvgWithoutTitle } from "./no-svg-without-title.js";
import { noUnlabeledIconButton } from "./no-unlabeled-icon-button.js";
import { preferDesignSystem } from "./prefer-design-system.js";

export default defineModule({
  meta: { name: "@ashstack/react" },
  url: import.meta.url,
  docsWhen: "always on via `react()` and every entry above it",
  rules: {
    "no-unlabeled-icon-button": noUnlabeledIconButton,
    "no-svg-without-title": noSvgWithoutTitle,
    "hoist-intl": hoistIntl,
    "prefer-design-system": preferDesignSystem,
    "components-tsx-only": componentsTsxOnly,
  },
});
