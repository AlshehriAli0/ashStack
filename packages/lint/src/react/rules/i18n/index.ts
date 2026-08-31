// @ashstack/lint — i18n conventions. Every user-visible string goes through t().
import { defineModule } from "../../../lib/module.js";
import { noBareAttrs } from "./no-bare-attrs.js";
import { noBareText } from "./no-bare-text.js";
import { noBareToast } from "./no-bare-toast.js";

export default defineModule({
  meta: { name: "@ashstack/i18n" },
  url: import.meta.url,
  packages: ["i18next", "react-i18next", "@lingui/core", "react-intl", "use-intl", "next-intl", "expo-localization"],
  option: "i18n",
  docsWhen:
    "auto-enabled by `react()` when an i18n library (i18next, lingui, react-intl, use-intl, next-intl, expo-localization) is a dependency",
  rules: {
    "no-bare-text": noBareText,
    "no-bare-attrs": noBareAttrs,
    "no-bare-toast": noBareToast,
  },
});
