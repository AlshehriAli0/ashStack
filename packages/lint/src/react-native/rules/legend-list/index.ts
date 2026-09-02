import { defineModule } from "../../../lib/module.js";
import { noFlexInContentContainer } from "./no-flex-in-content-container.js";
import { noIndexKeyExtractor } from "./no-index-key-extractor.js";
import { noInlineRenderItemProps } from "./no-inline-render-item-props.js";
import { noMixedChildren } from "./no-mixed-children.js";
import { noRemountKey } from "./no-remount-key.js";
import { noScrollviewMap } from "./no-scrollview-map.js";
import { noUnsupportedProps } from "./no-unsupported-props.js";
import { requiredProps } from "./required-props.js";
import { typedItemsNeedItemType } from "./typed-items-need-item-type.js";

export default defineModule({
  meta: { name: "@ashstack/legend-list" },
  rules: {
    "required-props": requiredProps,
    "no-index-key-extractor": noIndexKeyExtractor,
    "no-remount-key": noRemountKey,
    "no-inline-render-item-props": noInlineRenderItemProps,
    "no-mixed-children": noMixedChildren,
    "no-flex-in-content-container": noFlexInContentContainer,
    "typed-items-need-item-type": typedItemsNeedItemType,
    "no-scrollview-map": noScrollviewMap,
    "no-unsupported-props": noUnsupportedProps,
  },
  url: import.meta.url,
  packages: ["@legendapp/list"],
  option: "legendList",
  docsWhen: "auto-enabled when `@legendapp/list` is a dependency",
  restrictedImports: {
    paths: [
      {
        name: "react-native",
        importNames: ["FlatList", "SectionList", "VirtualizedList"],
        message:
          "Render this list with `LegendList` from `@legendapp/list/react-native`; a `ScrollView` plus `map` is fine for fewer than 20 static items.",
      },
      {
        name: "@shopify/flash-list",
        message:
          "Import `LegendList` from `@legendapp/list/react-native` — Legend List replaced FlashList in this stack.",
      },
    ],
    patterns: [
      {
        group: ["@legendapp/list"],
        message: "Import from the platform entrypoint `@legendapp/list/react-native`, not the package root.",
      },
    ],
  },
});
