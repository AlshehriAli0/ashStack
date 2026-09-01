import { describe, expect, it } from "bun:test";

import type { AstNode } from "../packages/lint/dist/lib/types.js";
import {
  CREATE_MARKER,
  isStyleSheetCreate,
  propertyName,
  stylesObjectOf,
} from "../packages/lint/dist/react-native/stylesheet.js";
import type { StylesObject } from "../packages/lint/dist/react-native/stylesheet.js";
import { node } from "./nodes.js";

const identifier = (name: string) => node({ type: "Identifier", name });
const literal = (value: unknown) => node({ type: "Literal", value, raw: JSON.stringify(value) });
const member = (object: AstNode, property: AstNode, computed = false) =>
  node({ type: "MemberExpression", object, property, computed, optional: false });
const call = (callee: AstNode, args: AstNode[] = []) =>
  node({ type: "CallExpression", callee, arguments: args, optional: false, typeArguments: null });
const object = (properties: AstNode[] = []) => node({ type: "ObjectExpression", properties }) as StylesObject;
const property = (key: AstNode, value: AstNode, computed = false) =>
  node({ type: "Property", key, value, computed, kind: "init", method: false, shorthand: false });
const arrow = (body: AstNode) =>
  node({ type: "ArrowFunctionExpression", params: [], body, async: false, expression: true });
const parenthesized = (expression: AstNode) => node({ type: "ParenthesizedExpression", expression });

describe("CREATE_MARKER", () => {
  it("is the source text every gated stylesheet rule looks for", () => {
    expect(CREATE_MARKER).toBe("StyleSheet");
  });

  it("still matches when the call is split across lines", () => {
    expect("const styles = StyleSheet\n  .create({});".includes(CREATE_MARKER)).toBe(true);
  });
});

describe("isStyleSheetCreate", () => {
  it("matches StyleSheet.create(...)", () => {
    expect(isStyleSheetCreate(call(member(identifier("StyleSheet"), identifier("create"))))).toBe(true);
  });

  it("rejects a different method on StyleSheet", () => {
    expect(isStyleSheetCreate(call(member(identifier("StyleSheet"), identifier("flatten"))))).toBe(false);
  });

  it("rejects create on a different object", () => {
    expect(isStyleSheetCreate(call(member(identifier("Styles"), identifier("create"))))).toBe(false);
  });

  it("rejects a nested member chain", () => {
    const callee = member(member(identifier("RN"), identifier("StyleSheet")), identifier("create"));
    expect(isStyleSheetCreate(call(callee))).toBe(false);
  });

  it("rejects a bare create call", () => {
    expect(isStyleSheetCreate(call(identifier("create")))).toBe(false);
  });

  it("rejects a member expression that is not called", () => {
    expect(isStyleSheetCreate(member(identifier("StyleSheet"), identifier("create")))).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isStyleSheetCreate(null)).toBe(false);
    expect(isStyleSheetCreate(undefined)).toBe(false);
  });
});

describe("propertyName", () => {
  it("reads an identifier key", () => {
    expect(propertyName(property(identifier("container"), object()))).toBe("container");
  });

  it("reads a string literal key", () => {
    expect(propertyName(property(literal("content-container"), object()))).toBe("content-container");
  });

  it("stringifies a numeric literal key", () => {
    expect(propertyName(property(literal(12), object()))).toBe("12");
  });

  it("is empty for a computed key", () => {
    expect(propertyName(property(member(identifier("keys"), identifier("a")), object(), true))).toBe("");
  });

  it("is empty for a spread element", () => {
    expect(propertyName(node({ type: "SpreadElement", argument: identifier("base") }))).toBe("");
  });

  it("is empty for a non-property node", () => {
    expect(propertyName(identifier("container"))).toBe("");
  });
});

describe("stylesObjectOf", () => {
  it("returns an inline object literal", () => {
    const styles = object([property(identifier("container"), object())]);
    expect(stylesObjectOf(styles)).toBe(styles);
  });

  it("returns an expression body that is already an object", () => {
    const styles = object();
    expect(stylesObjectOf(arrow(styles))).toBe(styles);
  });

  it("returns the object a block-bodied theme function returns", () => {
    const styles = object([property(identifier("container"), object())]);
    const body = node({
      type: "BlockStatement",
      body: [node({ type: "ReturnStatement", argument: styles })],
    });
    expect(stylesObjectOf(arrow(body))).toBe(styles);
  });

  it("handles a function expression as well as an arrow", () => {
    const styles = object();
    const factory = node({
      type: "FunctionExpression",
      id: null,
      params: [],
      body: node({ type: "BlockStatement", body: [node({ type: "ReturnStatement", argument: styles })] }),
      async: false,
      generator: false,
    });
    expect(stylesObjectOf(factory)).toBe(styles);
  });

  it("is null for a theme function whose body holds no object", () => {
    expect(stylesObjectOf(arrow(identifier("shared")))).toBeNull();
  });

  it("is null for an identifier argument", () => {
    expect(stylesObjectOf(identifier("sharedStyles"))).toBeNull();
  });

  it("is null for null and undefined", () => {
    expect(stylesObjectOf(null)).toBeNull();
    expect(stylesObjectOf(undefined)).toBeNull();
  });

  it("is null for an inline object wrapped in parentheses outside a function", () => {
    expect(stylesObjectOf(parenthesized(object()))).toBeNull();
  });

  it("is null for a computed style key", () => {
    expect(propertyName(property(identifier("container"), object(), true))).toBe("");
  });

  it("returns what a block body returns, not a local object declared before it", () => {
    const early = object([property(identifier("early"), object())]);
    const returned = object([property(identifier("returned"), object())]);
    const body = node({
      type: "BlockStatement",
      body: [
        node({
          type: "VariableDeclaration",
          kind: "const",
          declarations: [node({ type: "VariableDeclarator", id: identifier("base"), init: early })],
        }),
        node({ type: "ReturnStatement", argument: returned }),
      ],
    });
    expect(stylesObjectOf(arrow(body))).toBe(returned);
  });

  it("is null for a block body that returns nothing", () => {
    const body = node({ type: "BlockStatement", body: [node({ type: "ReturnStatement", argument: null })] });
    expect(stylesObjectOf(arrow(body))).toBeNull();
  });
});
