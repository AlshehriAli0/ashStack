// @ashstack/lint — TanStack Query conventions.
import { defineModule } from "../../../lib/module.js";
import { nextPageParamUndefined } from "./next-page-param-undefined.js";
import { noDeprecatedFilters } from "./no-deprecated-filters.js";
import { noFetchInQueryFn } from "./no-fetch-in-query-fn.js";
import { noInlineKeys } from "./no-inline-keys.js";
import { requireDestructuredHooks } from "./require-destructured-hooks.js";

export default defineModule({
  meta: { name: "@ashstack/query" },
  url: import.meta.url,
  packages: ["@tanstack/react-query"],
  option: "query",
  docsWhen: "auto-enabled by `react()` when `@tanstack/react-query` is a dependency",
  rules: {
    "no-inline-keys": noInlineKeys,
    "no-deprecated-filters": noDeprecatedFilters,
    "require-destructured-hooks": requireDestructuredHooks,
    "no-fetch-in-query-fn": noFetchInQueryFn,
    "next-page-param-undefined": nextPageParamUndefined,
  },
});
