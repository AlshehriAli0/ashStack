import { defineModule } from "../../../lib/module.js";
import { preferCn } from "./prefer-cn.js";
import { useLogicalClasses } from "./use-logical-classes.js";

export default defineModule({
  meta: { name: "@ashstack/tailwind" },
  url: import.meta.url,
  packages: ["tailwindcss"],
  option: "tailwind",
  docsWhen: "auto-enabled by `react()` when `tailwindcss` is a dependency",
  rules: {
    "prefer-cn": preferCn,
    "use-logical-classes": useLogicalClasses,
  },
});
