// Legend List contracts, one rule per contract so a project can turn any single
// one off without losing the rest.
//
// Most of these catch SILENT failures: a list that renders nothing, a row showing
// the previous row's data, a remount that discards every cached measurement, a
// recycling pool shared between two layouts, a prop that simply does not exist on
// v3. None of them throw at runtime.
//
// Every rule gates on the source text first, so a file with no list in it is
// skipped before its AST is walked. Gates fail OPEN.
import { defineModule } from "../../../lib/module.js";
import { noFlexInContentContainer } from "./no-flex-in-content-container.js";
import { noIndexKeyExtractor } from "./no-index-key-extractor.js";
import { noInlineData } from "./no-inline-data.js";
import { noInlineExtraData } from "./no-inline-extra-data.js";
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
    "no-inline-data": noInlineData,
    "no-inline-extra-data": noInlineExtraData,
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
