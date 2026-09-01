import { defineModule } from "../../../lib/module.js";
import { canvasOpaque } from "./canvas-opaque.js";

export default defineModule({
  meta: { name: "@ashstack/skia" },
  url: import.meta.url,
  packages: ["@shopify/react-native-skia"],
  option: "skia",
  docsWhen: "auto-enabled when `@shopify/react-native-skia` is a dependency",
  rules: {
    "canvas-opaque": canvasOpaque,
  },
  restrictedImports: {
    paths: [
      {
        name: "@shopify/react-native-skia",
        importNames: ["usePathValue", "usePathInterpolation"],
        message:
          "Keep one stable `SkPath` buffer and mutate it inside `useDerivedValue`, with consumers reading the driving shared value. These legacy path-value hooks self-dirty Reanimated mappers and re-record idle canvases.",
      },
    ],
  },
});
