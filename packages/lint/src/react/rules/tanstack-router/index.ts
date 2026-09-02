import { defineModule } from "../../../lib/module.js";
import { noSearchCasts } from "./no-search-casts.js";
import { requireSelector } from "./require-selector.js";

export default defineModule({
  meta: { name: "@ashstack/tanstack-router" },
  url: import.meta.url,
  packages: ["@tanstack/react-router"],
  option: "tanstackRouter",
  docsWhen: "auto-enabled by `react()` when `@tanstack/react-router` is a dependency",
  rules: {
    "require-selector": requireSelector,
    "no-search-casts": noSearchCasts,
  },
});
