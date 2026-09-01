import { defineModule } from "../../../lib/module.js";
import { requireCachePolicy } from "./require-cache-policy.js";
import { requireResize } from "./require-resize.js";

export default defineModule({
  meta: { name: "@ashstack/turbo-image" },
  url: import.meta.url,
  packages: ["react-native-turbo-image"],
  option: "turboImage",
  docsWhen: "auto-enabled when `react-native-turbo-image` is a dependency",
  rules: {
    "require-resize": requireResize,
    "require-cache-policy": requireCachePolicy,
  },
});
