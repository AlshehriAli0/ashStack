import type { AstNode, Rule, Visitor } from "./types.js";

const SKIPPED_KEYS = new Set(["parent", "loc", "range", "start", "end", "type"]);

type Predicate = (node: AstNode) => boolean;

const findInEach = (values: Iterable<unknown>, predicate: Predicate): AstNode | null => {
  for (const value of values) {
    const found = findInSubtree(value, predicate);
    if (found) return found;
  }
  return null;
};

const childValues = (node: AstNode): unknown[] => {
  const values: unknown[] = [];
  for (const key in node) {
    if (SKIPPED_KEYS.has(key)) continue;
    const value = node[key];
    if (value !== null && typeof value === "object") values.push(value);
  }
  return values;
};

export const findInSubtree = (node: unknown, predicate: Predicate): AstNode | null => {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) return findInEach(node, predicate);
  const candidate = node as AstNode;
  if (typeof candidate.type !== "string") return null;
  if (predicate(candidate)) return candidate;
  return findInEach(childValues(candidate), predicate);
};

export const subtreeHas = (node: unknown, predicate: Predicate): boolean => findInSubtree(node, predicate) !== null;

export const calleeName = (node: AstNode | null | undefined): string => {
  if (!node || node.type !== "CallExpression") return "";
  const callee = node.callee as AstNode | null | undefined;
  if (!callee) return "";
  if (callee.type === "Identifier") return callee.name as string;
  if (callee.type === "MemberExpression" && (callee.property as AstNode | undefined)?.type === "Identifier") {
    return (callee.property as AstNode).name as string;
  }
  return "";
};

export const enclosingCall = (node: AstNode, names: Set<string>): AstNode | null => {
  let current = node.parent;
  while (current) {
    if (current.type === "CallExpression" && names.has(calleeName(current))) return current;
    current = current.parent;
  }
  return null;
};

export const closestAncestor = (node: AstNode, types: Set<string>): AstNode | null => {
  let current = node.parent;
  while (current) {
    if (types.has(current.type)) return current;
    current = current.parent;
  }
  return null;
};

export const hasAncestor = (node: AstNode, predicate: Predicate): boolean => {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
};

export const isWithin = (node: AstNode, container: AstNode): boolean => {
  let current = node.parent;
  while (current) {
    if (current === container) return true;
    current = current.parent;
  }
  return false;
};

export const crossesFunctionBefore = (node: AstNode, container: AstNode, functionTypes: Set<string>): boolean => {
  let current = node.parent;
  while (current && current !== container) {
    if (functionTypes.has(current.type)) return true;
    current = current.parent;
  }
  return false;
};

export const isMemberCall = (node: AstNode | null | undefined, method: string): boolean =>
  !!node &&
  node.type === "CallExpression" &&
  (node.callee as AstNode | undefined)?.type === "MemberExpression" &&
  (node.callee as AstNode).computed !== true &&
  ((node.callee as AstNode).property as AstNode | undefined)?.type === "Identifier" &&
  (((node.callee as AstNode).property as AstNode).name as string) === method;

export const receiverName = (node: AstNode | null | undefined): string | null => {
  const object = ((node?.callee as AstNode | undefined)?.object ?? null) as AstNode | null;
  return object?.type === "Identifier" ? (object.name as string) : null;
};

export const tagIdentifier = (node: AstNode | null | undefined): string => {
  let current = node;
  while (current?.type === "JSXMemberExpression") current = current.property as AstNode;
  return (current?.name as string) ?? "";
};

export const attributeName = (attribute: AstNode): string => {
  if (attribute.type !== "JSXAttribute") return "";
  const name = attribute.name as AstNode | undefined;
  return (name?.name as string) ?? ((name?.property as AstNode | undefined)?.name as string) ?? "";
};

export const importedSpecifiers = (node: AstNode, source: string): AstNode[] =>
  node.type === "ImportDeclaration" && (node.source as AstNode | undefined)?.value === source
    ? ((node.specifiers as AstNode[]) ?? [])
    : [];

/** Function-ish node types, for ancestor walks. */
export const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** Component or hook name: `Capitalized` or `useX`. */
export const COMPONENT_OR_HOOK = /^(?:[A-Z]|use[A-Z])/;

export const isFunction = (node: AstNode | null | undefined): boolean => !!node && FUNCTION_TYPES.has(node.type);

/**
 * Source-text gate for createOnce rules: skip whole files that can't contain
 * the pattern. Fails open (lints) when the source text is unavailable.
 */
export const gate = (context: { sourceCode?: { text?: unknown } | undefined }, ...markers: string[]): boolean => {
  const text = context.sourceCode?.text;
  if (typeof text !== "string") return true;
  return markers.some(marker => text.includes(marker));
};

/** Shorthand for a problem rule with a description. */
export const problem = (description: string, rule: Omit<Rule, "meta"> & { meta?: Partial<Rule["meta"]> }): Rule => ({
  ...rule,
  meta: { type: "problem", ...rule.meta, docs: { description } },
});

export type { AstNode, Rule, Visitor };
