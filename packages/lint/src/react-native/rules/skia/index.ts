import { defineModule } from "../../../lib/module.js";
import { canvasOpaque } from "./canvas-opaque.js";
import { noLegacyPathHooks } from "./no-legacy-path-hooks.js";

export default defineModule({
  meta: { name: "@ashstack/skia" },
  url: import.meta.url,
  packages: ["@shopify/react-native-skia"],
  option: "skia",
  docsWhen: "auto-enabled when `@shopify/react-native-skia` is a dependency",
  rules: {
    "canvas-opaque": canvasOpaque,
    "no-legacy-path-hooks": noLegacyPathHooks,
  },
});
