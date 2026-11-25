import { defineModule } from "../../../lib/module.js";
import { componentsTsxOnly } from "./components-tsx-only.js";
import { hoistIntl } from "./hoist-intl.js";
import { noContextProvider } from "./no-context-provider.js";
import { noSvgWithoutTitle } from "./no-svg-without-title.js";
import { noUnlabeledIconButton } from "./no-unlabeled-icon-button.js";
import { noUseNoMemo } from "./no-use-no-memo.js";
import { preferDesignSystem } from "./prefer-design-system.js";
import { requireDestructuredRouter } from "./require-destructured-router.js";
import { requireEffectCleanup } from "./require-effect-cleanup.js";

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
    "no-use-no-memo": noUseNoMemo,
    "no-context-provider": noContextProvider,
    "require-destructured-router": requireDestructuredRouter,
    "require-effect-cleanup": requireEffectCleanup,
  },
});
