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

import { attributeName, findInSubtree, subtreeHas, tagIdentifier } from "../../lib/ast.js";

const LIST = "LegendList";

// FlashList / FlatList props that do not exist on Legend List v3. Passing one is
// silently ignored, which reads as "the feature is broken".
const UNSUPPORTED_PROPS = new Set([
  "masonry",
  "optimizeItemArrangement",
  "inverted",
  "onBlankArea",
  "disableAutoLayout",
  "CellRendererComponent",
]);

const gate = (context, marker) => {
  const text = context.sourceCode?.getText?.();
  return text === null || text === undefined || text.includes(marker);
};

// Wrappers keep the contract: `UnistylesLegendList`, `Animated.LegendList`, …
const isLegendList = name => tagIdentifier(name).endsWith(LIST);

const isListElement = node => isLegendList(node.openingElement?.name);

const attributesOf = node => node.openingElement?.attributes ?? [];

const attributeNamed = (node, wanted) =>
  attributesOf(node).find(attribute => attribute.type === "JSXAttribute" && attributeName(attribute) === wanted);

const hasSpread = node => attributesOf(node).some(attribute => attribute.type === "JSXSpreadAttribute");

const expressionOf = attribute =>
  attribute?.value?.type === "JSXExpressionContainer" ? attribute.value.expression : null;

const isFunction = node => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const keyName = property => {
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal") return String(property.key.value);
  return null;
};

const objectHasFlex = node =>
  node?.type === "ObjectExpression" &&
  node.properties.some(property => property.type === "Property" && keyName(property) === "flex");

const literalKind = node => {
  if (node?.type === "ObjectExpression") return "object";
  if (node?.type === "ArrayExpression") return "array";
  return null;
};

const rendersRealChild = node =>
  (node.children ?? []).some(
    child =>
      child.type === "JSXElement" ||
      child.type === "JSXFragment" ||
      (child.type === "JSXText" && child.value.trim() !== "") ||
      (child.type === "JSXExpressionContainer" && child.expression?.type !== "JSXEmptyExpression")
  );

// `[...]` or `something.filter(…)` / `.map(…)` / `.slice(…)` anywhere inside the
// attribute value: both produce a fresh array reference on every render.
const isInlineData = node =>
  node.type === "ArrayExpression" || (node.type === "CallExpression" && node.callee?.type === "MemberExpression");

const branchesOnItemType = node =>
  subtreeHas(node, current => current.type === "MemberExpression" && current.property?.name === "type");

const isStyleSheetCreate = node =>
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.name === "StyleSheet" &&
  node.callee.property?.name === "create";

// StyleSheet.create accepts an object, or (unistyles) a theme function returning one.
const createdObject = node => {
  const argument = node.arguments?.[0];
  if (argument?.type === "ObjectExpression") return argument;
  if (!isFunction(argument)) return null;
  if (argument.body?.type === "ObjectExpression") return argument.body;
  if (argument.body?.type !== "BlockStatement") return null;
  const returned = argument.body.body?.find(statement => statement.type === "ReturnStatement");
  return returned?.argument?.type === "ObjectExpression" ? returned.argument : null;
};

const problem = (description, visitors) => ({
  meta: { type: "problem", docs: { description } },
  createOnce: visitors,
});

export default {
  meta: { name: "@ashstack/legend-list" },
  rules: {
    "required-props": problem(
      "Require `keyExtractor` and an explicit `recycleItems` on a Legend List; without them the list keys rows by index and leaves the decision that most of its native speed depends on unstated.",
      context => ({
        before: () => gate(context, LIST),
        JSXElement(node) {
          if (!isListElement(node) || hasSpread(node)) return;

          if (!attributeNamed(node, "keyExtractor")) {
            context.report({
              node: node.openingElement,
              message:
                "Add `keyExtractor={item => item.id}` returning a stable per-item identity. The index fallback pins cached measurements and recycled row state to a position, so a prepend leaves rows showing the previous row's data.",
            });
          }

          if (!attributeNamed(node, "recycleItems")) {
            context.report({
              node: node.openingElement,
              message:
                "Add `recycleItems={true}` — recycling is where most of the list's native speed comes from. If a row genuinely cannot be recycled, pass `recycleItems={false}` and state which part of the row required it.",
            });
          }
        },
      })
    ),

    "no-index-key-extractor": problem(
      "Disallow a `keyExtractor` that uses its index parameter; Legend List hangs cached sizes and recycled row state off the key, so one prepend re-points every measurement at the wrong item.",
      context => ({
        before: () => gate(context, "keyExtractor"),
        JSXAttribute(node) {
          if (attributeName(node) !== "keyExtractor") return;

          const fn = expressionOf(node);
          if (!isFunction(fn)) return;

          const indexParam = fn.params?.[1];
          if (indexParam?.type !== "Identifier") return;
          if (!subtreeHas(fn.body, current => current.type === "Identifier" && current.name === indexParam.name))
            return;

          context.report({
            node: fn,
            message:
              "Return a stable per-item id from this `keyExtractor` instead of the index. Legend List hangs cached sizes and recycled row state off the key, so one prepend re-points every measurement at the wrong item.",
          });
        },
      })
    ),

    "no-remount-key": problem(
      "Disallow `key` on a Legend List; a changing key remounts it and throws away every measurement, cached size and scroll position — pass `dataKey` instead.",
      context => ({
        before: () => gate(context, LIST),
        JSXElement(node) {
          if (!isListElement(node)) return;
          const key = attributeNamed(node, "key");
          if (!key) return;

          context.report({
            node: key,
            message:
              "Pass `dataKey` instead of `key` here: it re-initialises the list for a different dataset from the inside, without the remount that discards every measurement, cached size and scroll position.",
          });
        },
      })
    ),

    "no-inline-data": problem(
      "Disallow building a Legend List's `data` inline; a fresh array reference each render makes the list re-diff, re-key and invalidate everything it had cached.",
      context => ({
        before: () => gate(context, LIST),
        JSXElement(node) {
          if (!isListElement(node)) return;
          const data = attributeNamed(node, "data");
          if (!data || !findInSubtree(data.value, isInlineData)) return;

          context.report({
            node: data,
            message:
              "Hoist this `data` into a `useMemo` or compute it upstream so its reference is stable. A new array each render makes the list re-diff, re-key and invalidate everything it had cached.",
          });
        },
      })
    ),

    "no-inline-extra-data": problem(
      "Disallow an inline object or array literal as `extraData`; its identity changes every render, so every mounted row re-evaluates whenever the parent renders.",
      context => ({
        before: () => gate(context, "extraData"),
        JSXAttribute(node) {
          if (attributeName(node) !== "extraData") return;

          const value = expressionOf(node);
          const kind = literalKind(value);
          if (kind === null) return;

          context.report({
            node: value,
            message: `Pass the primitive that actually changed as \`extraData\`, or hoist this ${kind} when it is stable. A fresh ${kind} reference each render re-evaluates every mounted row.`,
          });
        },
      })
    ),

    "no-inline-render-item-props": problem(
      "Disallow inline object or array literals on props nested inside `renderItem`; the new reference each render means a row can never be skipped, so typing anywhere re-renders every visible row.",
      context => {
        let depth = 0;
        return {
          before() {
            depth = 0;
            return gate(context, "renderItem");
          },
          JSXAttribute(node) {
            if (attributeName(node) === "renderItem") {
              depth++;
              return;
            }
            if (depth === 0) return;

            const value = node.value;
            if (value?.type !== "JSXExpressionContainer") return;
            const kind = literalKind(value.expression);
            if (kind === null) return;

            context.report({
              node: value,
              message: `Pass \`item\` or its primitive fields and build this ${kind} inside the row, or hoist it to module scope when it is static. A fresh ${kind} each render means the row can never be skipped, so typing anywhere re-renders every visible row.`,
            });
          },
          "JSXAttribute:exit"(node) {
            if (attributeName(node) === "renderItem") depth--;
          },
        };
      }
    ),

    "no-mixed-children": problem(
      "Disallow passing both `data` and real children to a Legend List; the combination is unsupported and fails silently, with no guarantee about which of the two is ignored.",
      context => ({
        before: () => gate(context, LIST),
        JSXElement(node) {
          if (!isListElement(node)) return;
          if (!attributeNamed(node, "data")) return;
          if (!rendersRealChild(node)) return;

          context.report({
            node: node.openingElement,
            message:
              "Keep either `data` with `renderItem` or children mode here, and remove the other. Passing both fails silently, with no guarantee about which one is ignored.",
          });
        },
      })
    ),

    // The stylesheet is usually declared below the component, so the styles are
    // collected across the whole file and the report happens at the end.
    "no-flex-in-content-container": problem(
      "Disallow `flex` in a Legend List's `contentContainerStyle`; it sizes the scrolled content to the viewport, so the list measures as zero height and renders a blank screen with no error.",
      context => {
        let flexStyles;
        let candidates;

        return {
          before() {
            flexStyles = new Set();
            candidates = [];
            return gate(context, "contentContainerStyle");
          },
          CallExpression(node) {
            if (!isStyleSheetCreate(node)) return;
            const object = createdObject(node);
            if (!object) return;

            for (const property of object.properties) {
              if (property.type !== "Property" || property.computed) continue;
              const name = keyName(property);
              if (name !== null && objectHasFlex(property.value)) flexStyles.add(name);
            }
          },
          JSXAttribute(node) {
            if (attributeName(node) !== "contentContainerStyle") return;

            const value = expressionOf(node);
            if (objectHasFlex(value)) {
              candidates.push({ node, named: null });
              return;
            }
            if (value?.type === "MemberExpression" && value.object?.name === "styles") {
              candidates.push({ node, named: value.property?.name ?? null });
            }
          },
          "Program:exit"() {
            for (const { node, named } of candidates) {
              if (named !== null && !flexStyles.has(named)) continue;

              context.report({
                node,
                message:
                  "Move `flex` onto `style` and keep `contentContainerStyle` for padding inside the content. On the content container it sizes the content to the viewport, so the list measures as zero height and renders a blank screen with no error.",
              });
            }
          },
        };
      }
    ),

    // renderItem is usually a hoisted function declared elsewhere in the file, so
    // the row bodies are indexed first and the check runs at the end.
    "typed-items-need-item-type": problem(
      "Require `getItemType` when a row branches on `item.type`; one recycling pool for several layouts rebuilds most of the tree on reuse and collapses the per-type size estimates into one average.",
      context => {
        let rowRenderers;
        let pending;

        return {
          before() {
            rowRenderers = new Map();
            pending = [];
            return gate(context, LIST);
          },
          FunctionDeclaration(node) {
            if (node.id?.type === "Identifier") rowRenderers.set(node.id.name, node);
          },
          VariableDeclarator(node) {
            if (node.id?.type !== "Identifier" || node.init === null || node.init === undefined) return;
            rowRenderers.set(node.id.name, node.init);
          },
          JSXElement(node) {
            if (!isListElement(node) || hasSpread(node)) return;
            if (attributeNamed(node, "getItemType")) return;

            const renderItem = attributeNamed(node, "renderItem");
            if (!renderItem) return;
            pending.push({ node, renderItem });
          },
          "Program:exit"() {
            for (const { node, renderItem } of pending) {
              const expression = expressionOf(renderItem);
              const body = expression?.type === "Identifier" ? rowRenderers.get(expression.name) : expression;
              if (body === undefined || body === null || !branchesOnItemType(body)) continue;

              context.report({
                node: node.openingElement,
                message:
                  "Add `getItemType={item => item.type}` to match the branch this row makes on `item.type`. It gives each layout its own recycling pool and its own measured-size average, instead of handing a header's view to a photo row.",
              });
            }
          },
        };
      }
    ),

    "no-scrollview-map": problem(
      "Disallow rendering a mapped collection as ScrollView children; a ScrollView mounts every child up front, so the memory and the mount time are paid whether or not a row is on screen.",
      context => ({
        before: () => gate(context, "ScrollView"),
        JSXElement(node) {
          if (tagIdentifier(node.openingElement?.name) !== "ScrollView") return;

          for (const child of node.children ?? []) {
            if (child.type !== "JSXExpressionContainer") continue;
            const call = child.expression;
            if (call?.type !== "CallExpression") continue;
            if (call.callee?.type !== "MemberExpression" || call.callee.property?.name !== "map") continue;

            context.report({
              node: child,
              message:
                "Render this collection with `LegendList` from '@legendapp/list/react-native', passing the array as `data` and the mapped body as `renderItem`. A ScrollView mounts every child up front, so 200 rows cost 200 mounts to show ten.",
            });
            return;
          }
        },
      })
    ),

    "no-unsupported-props": problem(
      "Disallow FlashList/FlatList props that do not exist on Legend List v3; they are silently ignored rather than rejected, so the feature simply reads as broken.",
      context => ({
        before: () => gate(context, LIST),
        JSXElement(node) {
          if (!isListElement(node)) return;

          for (const attribute of attributesOf(node)) {
            if (attribute.type !== "JSXAttribute") continue;
            if (!UNSUPPORTED_PROPS.has(attributeName(attribute))) continue;

            context.report({
              node: attribute,
              message:
                "Remove this prop: Legend List v3 has no such prop and ignores it silently rather than rejecting it. Build inverted chat lists from `maintainScrollAtEnd` / `initialScrollAtEnd` / `maintainVisibleContentPosition` instead.",
            });
          }
        },
      })
    ),
  },
};
