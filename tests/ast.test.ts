import { describe, expect, it } from "bun:test";

import {
  COMPONENT_OR_HOOK,
  FUNCTION_TYPES,
  ancestors,
  attributeName,
  calleeName,
  closestAncestor,
  crossesFunctionBefore,
  enclosingCall,
  findInSubtree,
  gate,
  hasAncestor,
  importedSpecifiers,
  isFunction,
  isMemberCall,
  isWithin,
  optionsOf,
  problem,
  receiverName,
  subtreeHas,
  tagIdentifier,
  tagPath,
} from "../packages/lint/dist/lib/ast.js";
import type { AstNode, RuleContext } from "../packages/lint/dist/lib/types.js";
import { linked, node, ruleContext } from "./nodes.js";

const identifier = (name: string) => node({ type: "Identifier", name });
const member = (object: AstNode, property: AstNode, computed = false) =>
  node({ type: "MemberExpression", object, property, computed, optional: false });
const call = (callee: AstNode, args: AstNode[] = []) =>
  node({ type: "CallExpression", callee, arguments: args, optional: false, typeArguments: null });

describe("findInSubtree", () => {
  it("finds a node nested inside arrays and objects", () => {
    const target = identifier("needle");
    const tree = node({
      type: "ArrayExpression",
      elements: [node({ type: "ObjectExpression", properties: [target] })],
    });
    expect(findInSubtree(tree, current => current.type === "Identifier")).toBe(target);
  });

  it("returns the outermost match, not a deeper one", () => {
    const inner = call(identifier("inner"));
    const outer = call(identifier("outer"), [inner]);
    expect(findInSubtree(outer, current => current.type === "CallExpression")).toBe(outer);
  });

  it("returns null when nothing matches", () => {
    expect(findInSubtree(node({ type: "ArrayExpression", elements: [] }), () => false)).toBeNull();
  });

  it("ignores non-object input", () => {
    expect(findInSubtree(null, () => true)).toBeNull();
    expect(findInSubtree("string", () => true)).toBeNull();
    expect(findInSubtree(42, () => true)).toBeNull();
  });

  it("ignores objects with no string type", () => {
    expect(findInSubtree({ notAType: 1 }, () => true)).toBeNull();
  });

  it("does not walk back up through parent links", () => {
    const child = identifier("child");
    linked(call(identifier("f"), [child]));
    expect(findInSubtree(child, current => current.type === "CallExpression")).toBeNull();
  });

  it("does not treat loc, range, start or end as children", () => {
    const decorated = { type: "Identifier", name: "a", loc: { type: "Identifier" }, range: [0, 1] };
    expect(findInSubtree(decorated, current => !("name" in current))).toBeNull();
  });

  it("searches every element of an array, not only the first", () => {
    const target = identifier("second");
    const tree = node({
      type: "ArrayExpression",
      elements: [node({ type: "ObjectExpression", properties: [] }), target],
    });
    expect(findInSubtree(tree, current => current.type === "Identifier")).toBe(target);
  });
});

describe("subtreeHas", () => {
  it("is true when findInSubtree finds something", () => {
    expect(subtreeHas(call(identifier("f")), current => current.type === "Identifier")).toBe(true);
  });

  it("is false when it does not", () => {
    expect(subtreeHas(call(identifier("f")), current => current.type === "JSXElement")).toBe(false);
  });
});

describe("calleeName", () => {
  it("reads a plain call", () => {
    expect(calleeName(call(identifier("useMemo")))).toBe("useMemo");
  });

  it("reads the last segment of a member call", () => {
    expect(calleeName(call(member(identifier("a"), identifier("b"))))).toBe("b");
  });

  it("reads through a nested member chain", () => {
    expect(calleeName(call(member(member(identifier("a"), identifier("b")), identifier("c"))))).toBe("c");
  });

  it("is empty for a computed member call", () => {
    expect(calleeName(call(member(identifier("a"), node({ type: "Literal", value: "b", raw: '"b"' }), true)))).toBe("");
  });

  it("is empty for a non-call node", () => {
    expect(calleeName(identifier("f"))).toBe("");
  });

  it("is empty for null and undefined", () => {
    expect(calleeName(null)).toBe("");
    expect(calleeName(undefined)).toBe("");
  });
});

describe("ancestors", () => {
  it("yields every ancestor innermost first", () => {
    const leaf = identifier("leaf");
    linked(call(identifier("outer"), [call(identifier("inner"), [leaf])]));
    const chain = [...ancestors(leaf)].map(current => current.type);
    expect(chain).toEqual(["CallExpression", "CallExpression"]);
  });

  it("yields nothing for a root node", () => {
    expect([...ancestors(identifier("root"))]).toEqual([]);
  });

  it("does not yield the node itself", () => {
    const leaf = identifier("leaf");
    linked(call(identifier("f"), [leaf]));
    expect([...ancestors(leaf)]).not.toContain(leaf);
  });
});

describe("enclosingCall", () => {
  it("finds the nearest matching call", () => {
    const leaf = identifier("leaf");
    const inner = call(identifier("useMemo"), [leaf]);
    linked(call(identifier("useCallback"), [inner]));
    expect(enclosingCall(leaf, new Set(["useMemo", "useCallback"]))).toBe(inner);
  });

  it("skips calls whose name does not match", () => {
    const leaf = identifier("leaf");
    const outer = call(identifier("useCallback"), [call(identifier("map"), [leaf])]);
    linked(outer);
    expect(enclosingCall(leaf, new Set(["useCallback"]))).toBe(outer);
  });

  it("is null when no ancestor call matches", () => {
    const leaf = identifier("leaf");
    linked(call(identifier("map"), [leaf]));
    expect(enclosingCall(leaf, new Set(["useMemo"]))).toBeNull();
  });

  it("does not match the node itself", () => {
    const self = call(identifier("useMemo"));
    linked(node({ type: "ExpressionStatement", expression: self }));
    expect(enclosingCall(self, new Set(["useMemo"]))).toBeNull();
  });
});

describe("closestAncestor", () => {
  it("returns the innermost ancestor of a wanted type", () => {
    const leaf = identifier("leaf");
    const inner = node({ type: "ArrowFunctionExpression", params: [], body: leaf, async: false, expression: true });
    linked(node({ type: "FunctionDeclaration", id: null, params: [], body: inner, async: false, generator: false }));
    expect(closestAncestor(leaf, FUNCTION_TYPES)).toBe(inner);
  });

  it("is null when no ancestor matches", () => {
    const leaf = identifier("leaf");
    linked(call(identifier("f"), [leaf]));
    expect(closestAncestor(leaf, FUNCTION_TYPES)).toBeNull();
  });
});

describe("hasAncestor", () => {
  it("is true when some ancestor satisfies the predicate", () => {
    const leaf = identifier("leaf");
    linked(node({ type: "JSXExpressionContainer", expression: leaf }));
    expect(hasAncestor(leaf, current => current.type === "JSXExpressionContainer")).toBe(true);
  });

  it("is false for a root node", () => {
    expect(hasAncestor(identifier("root"), () => true)).toBe(false);
  });

  it("does not consider the node itself", () => {
    const self = identifier("self");
    linked(call(identifier("f"), [self]));
    expect(hasAncestor(self, current => current === self)).toBe(false);
  });
});

describe("isWithin", () => {
  it("is true for a descendant", () => {
    const leaf = identifier("leaf");
    const container = call(identifier("f"), [call(identifier("g"), [leaf])]);
    linked(container);
    expect(isWithin(leaf, container)).toBe(true);
  });

  it("is false for a sibling", () => {
    const leaf = identifier("leaf");
    const other = call(identifier("g"));
    linked(call(identifier("f"), [leaf, other]));
    expect(isWithin(leaf, other)).toBe(false);
  });

  it("is false for the node itself", () => {
    const self = identifier("self");
    linked(call(identifier("f"), [self]));
    expect(isWithin(self, self)).toBe(false);
  });
});

describe("crossesFunctionBefore", () => {
  const arrow = (body: AstNode) =>
    node({ type: "ArrowFunctionExpression", params: [], body, async: false, expression: true });

  it("is true when a function sits between the node and the container", () => {
    const leaf = identifier("leaf");
    const container = call(identifier("useEffect"), [arrow(leaf)]);
    linked(container);
    expect(crossesFunctionBefore(leaf, container, FUNCTION_TYPES)).toBe(true);
  });

  it("is false when the container is reached first", () => {
    const leaf = identifier("leaf");
    const container = call(identifier("useEffect"), [leaf]);
    linked(container);
    expect(crossesFunctionBefore(leaf, container, FUNCTION_TYPES)).toBe(false);
  });

  it("is false when the container is itself the function", () => {
    const leaf = identifier("leaf");
    const container = arrow(leaf);
    linked(container);
    expect(crossesFunctionBefore(leaf, container, FUNCTION_TYPES)).toBe(false);
  });

  it("is false when the container is not an ancestor at all", () => {
    const leaf = identifier("leaf");
    linked(call(identifier("f"), [leaf]));
    expect(crossesFunctionBefore(leaf, identifier("elsewhere"), FUNCTION_TYPES)).toBe(false);
  });
});

describe("isMemberCall", () => {
  it("matches a non-computed method call", () => {
    expect(isMemberCall(call(member(identifier("store"), identifier("get"))), "get")).toBe(true);
  });

  it("does not match a different method", () => {
    expect(isMemberCall(call(member(identifier("store"), identifier("get"))), "set")).toBe(false);
  });

  it("does not match a computed access", () => {
    expect(isMemberCall(call(member(identifier("store"), identifier("get"), true)), "get")).toBe(false);
  });

  it("does not match a bare call", () => {
    expect(isMemberCall(call(identifier("get")), "get")).toBe(false);
  });

  it("is false for null and undefined", () => {
    expect(isMemberCall(null, "get")).toBe(false);
    expect(isMemberCall(undefined, "get")).toBe(false);
  });
});

describe("receiverName", () => {
  it("reads the object of a method call", () => {
    expect(receiverName(call(member(identifier("store"), identifier("get"))))).toBe("store");
  });

  it("is null when the object is not an identifier", () => {
    expect(receiverName(call(member(member(identifier("a"), identifier("b")), identifier("get"))))).toBeNull();
  });

  it("is null for a bare call", () => {
    expect(receiverName(call(identifier("get")))).toBeNull();
  });

  it("is null for null and undefined", () => {
    expect(receiverName(null)).toBeNull();
    expect(receiverName(undefined)).toBeNull();
  });
});

describe("tagIdentifier", () => {
  const jsxIdentifier = (name: string) => node({ type: "JSXIdentifier", name });
  const jsxMember = (object: AstNode, property: AstNode) => node({ type: "JSXMemberExpression", object, property });

  it("reads a plain tag", () => {
    expect(tagIdentifier(jsxIdentifier("View"))).toBe("View");
  });

  it("reads a plain Identifier tag", () => {
    expect(tagIdentifier(identifier("View"))).toBe("View");
  });

  it("reads the last segment of a member tag", () => {
    expect(tagIdentifier(jsxMember(jsxIdentifier("Animated"), jsxIdentifier("View")))).toBe("View");
  });

  it("reads through a nested member tag", () => {
    expect(tagIdentifier(jsxMember(jsxMember(jsxIdentifier("A"), jsxIdentifier("B")), jsxIdentifier("C")))).toBe("C");
  });

  it("is empty for a namespaced tag", () => {
    const namespaced = node({
      type: "JSXNamespacedName",
      namespace: jsxIdentifier("svg"),
      name: jsxIdentifier("circle"),
    });
    expect(tagIdentifier(namespaced)).toBe("");
  });

  it("is empty for null and undefined", () => {
    expect(tagIdentifier(null)).toBe("");
    expect(tagIdentifier(undefined)).toBe("");
  });
});

describe("tagPath", () => {
  const jsxIdentifier = (name: string) => node({ type: "JSXIdentifier", name });
  const jsxMember = (object: AstNode, property: AstNode) => node({ type: "JSXMemberExpression", object, property });
  const namespaced = node({
    type: "JSXNamespacedName",
    namespace: node({ type: "JSXIdentifier", name: "svg" }),
    name: node({ type: "JSXIdentifier", name: "circle" }),
  });

  it("reads a plain tag whole", () => {
    expect(tagPath(jsxIdentifier("View"))).toBe("View");
  });

  it("reads a plain Identifier tag whole", () => {
    expect(tagPath(identifier("View"))).toBe("View");
  });

  it("keeps the object of a member tag, unlike tagIdentifier", () => {
    expect(tagPath(jsxMember(jsxIdentifier("Animated"), jsxIdentifier("View")))).toBe("Animated.View");
  });

  it("keeps every segment of a nested member tag", () => {
    expect(tagPath(jsxMember(jsxMember(jsxIdentifier("Ui"), jsxIdentifier("Layout")), jsxIdentifier("Row")))).toBe(
      "Ui.Layout.Row"
    );
  });

  it("is empty when the object is not a plain name", () => {
    expect(tagPath(jsxMember(namespaced, jsxIdentifier("View")))).toBe("");
  });

  it("is empty when the property is not a plain name", () => {
    expect(tagPath(jsxMember(jsxIdentifier("Animated"), namespaced))).toBe("");
  });

  it("is empty for a namespaced tag", () => {
    expect(tagPath(namespaced)).toBe("");
  });

  it("is empty for null and undefined", () => {
    expect(tagPath(null)).toBe("");
    expect(tagPath(undefined)).toBe("");
  });
});

describe("attributeName", () => {
  it("reads a plain attribute", () => {
    const attribute = node({
      type: "JSXAttribute",
      name: node({ type: "JSXIdentifier", name: "style" }),
      value: null,
    });
    expect(attributeName(attribute)).toBe("style");
  });

  it("reads the local half of a namespaced attribute", () => {
    const attribute = node({
      type: "JSXAttribute",
      name: node({
        type: "JSXNamespacedName",
        namespace: node({ type: "JSXIdentifier", name: "xlink" }),
        name: node({ type: "JSXIdentifier", name: "href" }),
      }),
      value: null,
    });
    expect(attributeName(attribute)).toBe("href");
  });

  it("is empty for a spread attribute", () => {
    expect(attributeName(node({ type: "JSXSpreadAttribute", argument: identifier("rest") }))).toBe("");
  });
});

describe("importedSpecifiers", () => {
  const declaration = (source: string, specifiers: AstNode[]) =>
    node({
      type: "ImportDeclaration",
      source: node({ type: "Literal", value: source, raw: `"${source}"` }),
      specifiers,
      attributes: [],
      importKind: "value",
    });

  it("returns the specifiers of a matching import", () => {
    const specifier = node({
      type: "ImportSpecifier",
      imported: identifier("View"),
      local: identifier("View"),
      importKind: "value",
    });
    expect(importedSpecifiers(declaration("react-native", [specifier]), "react-native")).toEqual([specifier]);
  });

  it("returns nothing for a different source", () => {
    expect(importedSpecifiers(declaration("react", []), "react-native")).toEqual([]);
  });

  it("returns nothing for a non-import node", () => {
    expect(importedSpecifiers(identifier("x"), "react-native")).toEqual([]);
  });

  it("returns a copy, not the live specifier array", () => {
    const specifiers: AstNode[] = [];
    expect(importedSpecifiers(declaration("react-native", specifiers), "react-native")).not.toBe(specifiers);
  });
});

describe("isFunction", () => {
  it.each(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"])("is true for %s", type => {
    expect(isFunction(node({ type }))).toBe(true);
  });

  it.each(["ClassDeclaration", "Identifier", "Property", "ObjectExpression"])("is false for %s", type => {
    expect(isFunction(node({ type }))).toBe(false);
  });

  it("is false for null and undefined", () => {
    expect(isFunction(null)).toBe(false);
    expect(isFunction(undefined)).toBe(false);
  });
});

describe("COMPONENT_OR_HOOK", () => {
  it.each(["Panel", "P", "useTheme", "useX", "ScreenView"])("matches %s", name => {
    expect(COMPONENT_OR_HOOK.test(name)).toBe(true);
  });

  it.each(["panel", "use", "used", "useless", "_Panel", "", "user"])("does not match %s", name => {
    expect(COMPONENT_OR_HOOK.test(name)).toBe(false);
  });
});

describe("gate", () => {
  it("is true when any marker is present", () => {
    expect(gate(ruleContext({ text: "const a = StyleSheet.create({});" }), "Dimensions", "StyleSheet.create")).toBe(
      true
    );
  });

  it("is false when no marker is present", () => {
    expect(gate(ruleContext({ text: "const a = 1;" }), "Dimensions", "StyleSheet.create")).toBe(false);
  });

  it("is false with no markers at all", () => {
    expect(gate(ruleContext({ text: "anything" }))).toBe(false);
  });

  it("matches a marker inside a longer identifier", () => {
    expect(gate(ruleContext({ text: "const useThemeLike = 1;" }), "useTheme")).toBe(true);
  });
});

describe("optionsOf", () => {
  it("returns the first option object when present", () => {
    expect(optionsOf(ruleContext({ options: [{ max: 3 }] }), { max: 1 })).toEqual({ max: 3 });
  });

  it("falls back when no options were passed", () => {
    expect(optionsOf(ruleContext({ options: [] }), { max: 1 })).toEqual({ max: 1 });
  });

  it("returns an empty object as-is rather than the fallback", () => {
    expect(optionsOf<Record<string, number>>(ruleContext({ options: [{}] }), { max: 1 })).toEqual({});
  });

  it("ignores options past the first", () => {
    expect(optionsOf(ruleContext({ options: [{ max: 3 }, { max: 9 }] }), { max: 1 })).toEqual({ max: 3 });
  });
});

describe("problem", () => {
  const body = { create: (() => ({})) as never };

  it("sets the type and the description", () => {
    const rule = problem("Does a thing.", body);
    expect(rule.meta.type).toBe("problem");
    expect(rule.meta.docs.description).toBe("Does a thing.");
  });

  it("keeps the rule body", () => {
    expect(problem("Does a thing.", body)).toMatchObject({ create: body.create });
  });

  it("lets a rule override the type", () => {
    expect(problem("Does a thing.", { ...body, meta: { type: "suggestion" } }).meta.type).toBe("suggestion");
  });

  it("keeps extra meta fields", () => {
    const rule = problem("Does a thing.", { ...body, meta: { defaultOff: true, packages: ["zod"] } });
    expect(rule.meta.defaultOff).toBe(true);
    expect(rule.meta.packages).toEqual(["zod"]);
  });

  it("always wins on the description, even when meta carries docs", () => {
    const rule = problem("Wins.", { ...body, meta: { docs: { description: "Loses." } } });
    expect(rule.meta.docs.description).toBe("Wins.");
  });
});

describe("RuleContext shape", () => {
  it("is the shape the helpers read", () => {
    const context: RuleContext = ruleContext({ text: "x", options: [] });
    expect(context.sourceCode.text).toBe("x");
  });
});
