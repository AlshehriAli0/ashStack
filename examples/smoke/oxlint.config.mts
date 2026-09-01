// This is exactly what a consumer writes. Every module auto-detects from
// package.json — unistyles, legend-list, legend-state, reanimated, query,
// i18n and zod are dependencies, so their rules ship; turbo-image, skia and
// keyboard are not, so theirs don't.
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  // zustand IS a dependency — the boolean force-disables the module
  extends: [reactNative({ zustand: false })],
  rules: {
    // consumer overrides always win: one built-in, one custom rule
    "no-nested-ternary": "off",
    "@ashstack/unistyles/no-margin": "off",
    // opt-in rule, configured in place: raw imports get banned with a pointer
    // to your component; files under src/components/ui stay exempt
    "@ashstack/core/use-design-system": [
      "error",
      {
        alias: "@/components/ui",
        use: {
          Text: "Text",
          Pressable: ["Pressable", "TouchableOpacity"],
          Input: { replaces: "TextInput", reason: "It owns focus and keyboard handling." },
        },
      },
    ],
  },
});
