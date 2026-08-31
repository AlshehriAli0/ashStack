// @ashstack/lint — Zod conventions.
import { defineModule } from "../../../lib/module.js";
import { preferEnum } from "./prefer-enum.js";

export default defineModule({
  meta: { name: "@ashstack/zod" },
  url: import.meta.url,
  packages: ["zod"],
  option: "zod",
  docsWhen: "auto-enabled when `zod` is a dependency",
  rules: {
    "prefer-enum": preferEnum,
  },
});
