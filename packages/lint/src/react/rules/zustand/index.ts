import { defineModule } from "../../../lib/module.js";
import { requireSelector } from "./require-selector.js";

export default defineModule({
  meta: { name: "@ashstack/zustand" },
  url: import.meta.url,
  packages: ["zustand"],
  option: "zustand",
  docsWhen: "auto-enabled by `react()` when `zustand` is a dependency",
  rules: {
    "require-selector": requireSelector,
  },
});
