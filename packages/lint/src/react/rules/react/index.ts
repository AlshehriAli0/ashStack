import { defineModule } from "../../../lib/module.js";
import { noSvgWithoutTitle } from "./no-svg-without-title.js";
import { noUnlabeledIconButton } from "./no-unlabeled-icon-button.js";

export default defineModule({
  meta: { name: "@ashstack/react" },
  url: import.meta.url,
  docsWhen: "always on via `react()` and every entry above it",
  rules: {
    "no-unlabeled-icon-button": noUnlabeledIconButton,
    "no-svg-without-title": noSvgWithoutTitle,
  },
});
