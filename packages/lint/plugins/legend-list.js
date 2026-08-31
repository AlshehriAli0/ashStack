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

import { attributeName, findInSubtree, subtreeHas, tagIdentifier } from "./internal/ast.js";

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

const problem = visitors => ({ meta: { type: "problem" }, createOnce: visitors });

export default {
  meta: { name: "legend-list" },
  rules: {
    "required-props": problem(context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node) || hasSpread(node)) return;

        if (!attributeNamed(node, "keyExtractor")) {
          context.report({
            node: node.openingElement,
            message:
              "Add `keyExtractor` returning something that identifies the item. Without one the list falls back to the index, which attaches cached measurements and recycled row state to whatever is currently in that position - the cause of a row showing the previous row's data after a prepend.",
          });
        }

        if (!attributeNamed(node, "recycleItems")) {
          context.report({
            node: node.openingElement,
            message:
              "Make the recycling decision explicit: add `recycleItems` - it is where most of the list's speed comes from on native. If the row genuinely cannot be recycled, pass `recycleItems={false}` deliberately and say which part of the row required it.",
          });
        }
      },
    })),

    "no-index-key-extractor": problem(context => ({
      before: () => gate(context, "keyExtractor"),
      JSXAttribute(node) {
        if (attributeName(node) !== "keyExtractor") return;

        const fn = expressionOf(node);
        if (!isFunction(fn)) return;

        const indexParam = fn.params?.[1];
        if (indexParam?.type !== "Identifier") return;
        if (!subtreeHas(fn.body, current => current.type === "Identifier" && current.name === indexParam.name)) return;

        context.report({
          node: fn,
          message:
            "Return something that identifies the item, not its position. Legend List hangs cached sizes and recycled row state off this key, so an index key means one prepend re-points every cached measurement at the wrong item: rows show the wrong data and the scroll position jumps.",
        });
      },
    })),

    "no-remount-key": problem(context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        const key = attributeNamed(node, "key");
        if (!key) return;

        context.report({
          node: key,
          message:
            "A changing `key` remounts the list and throws away every measurement, cached size and scroll position. To re-initialise for a different dataset, pass `dataKey` instead - it does the same job inside the list, without the remount.",
        });
      },
    })),

    "no-inline-data": problem(context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        const data = attributeNamed(node, "data");
        if (!data || !findInSubtree(data.value, isInlineData)) return;

        context.report({
          node: data,
          message:
            "`data` is built inline, so every parent render hands the list a new array reference and it re-evaluates the whole dataset - diffing, re-keying and invalidating what it had cached. Hoist it to a `useMemo`, or compute it upstream.",
        });
      },
    })),

    "no-inline-extra-data": problem(context => ({
      before: () => gate(context, "extraData"),
      JSXAttribute(node) {
        if (attributeName(node) !== "extraData") return;

        const value = expressionOf(node);
        const kind = literalKind(value);
        if (kind === null) return;

        context.report({
          node: value,
          message: `This ${kind} is a new reference on every render, so every mounted row re-evaluates every time the parent renders - which is what \`extraData\` is for, and not what you meant. Pass the primitive that actually changed, or hoist the ${kind} if it is stable.`,
        });
      },
    })),

    "no-inline-render-item-props": problem(context => {
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
            message: `This ${kind} is a new reference on every render, so the row can never be skipped and typing anywhere on the screen re-renders every visible row. Pass \`item\` or its primitive fields and build the ${kind} inside the row, or hoist it to module scope if it is static.`,
          });
        },
        "JSXAttribute:exit"(node) {
          if (attributeName(node) === "renderItem") depth--;
        },
      };
    }),

    "no-mixed-children": problem(context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        if (!attributeNamed(node, "data")) return;
        if (!rendersRealChild(node)) return;

        context.report({
          node: node.openingElement,
          message:
            "Use either `data` with `renderItem`, or children mode. Passing both is unsupported and fails silently: one of the two is ignored and which one is not guaranteed.",
        });
      },
    })),

    // The stylesheet is usually declared below the component, so the styles are
    // collected across the whole file and the report happens at the end.
    "no-flex-in-content-container": problem(context => {
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
                "`flex` belongs on `style`, not on `contentContainerStyle`. Here it makes the scrolled content size to the viewport, so the list measures as zero height and renders nothing - a blank screen with no error. Use `contentContainerStyle` for padding inside the content.",
            });
          }
        },
      };
    }),

    // renderItem is usually a hoisted function declared elsewhere in the file, so
    // the row bodies are indexed first and the check runs at the end.
    "typed-items-need-item-type": problem(context => {
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
                "This row branches on `item.type`, so add `getItemType={item => item.type}`. Without it every layout shares one recycling pool and a header is handed to a photo row, which rebuilds most of the tree on reuse - the opposite of what recycling is for. It is also what makes a mixed list estimate well: the list keeps a measured-size average per type, so with one pool every unmeasured row gets one average of three different shapes.",
            });
          }
        },
      };
    }),

    "no-scrollview-map": problem(context => ({
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
              "Use LegendList from '@legendapp/list/react-native' instead. A ScrollView mounts every child up front, so a list of 200 rows mounts 200 components to show ten - the memory and the mount time are both paid whether or not anything is on screen.",
          });
          return;
        }
      },
    })),

    "no-unsupported-props": problem(context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;

        for (const attribute of attributesOf(node)) {
          if (attribute.type !== "JSXAttribute") continue;
          if (!UNSUPPORTED_PROPS.has(attributeName(attribute))) continue;

          context.report({
            node: attribute,
            message:
              "This FlashList/FlatList prop does not exist on Legend List v3, so it is silently ignored rather than rejected. Inverted chat lists are built from `maintainScrollAtEnd` / `initialScrollAtEnd` / `maintainVisibleContentPosition`.",
          });
        }
      },
    })),
  },
};
