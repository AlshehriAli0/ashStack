import type { AstNode, Rule, RuleBody, RuleContext, Visitor } from "./types.js";

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
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (value !== null && typeof value === "object") values.push(value);
  }
  return values;
};

export const findInSubtree = (node: unknown, predicate: Predicate): AstNode | null => {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) return findInEach(node, predicate);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const candidate = node as AstNode;
  if (typeof candidate.type !== "string") return null;
  if (predicate(candidate)) return candidate;
  return findInEach(childValues(candidate), predicate);
};

export const subtreeHas = (node: unknown, predicate: Predicate): boolean => findInSubtree(node, predicate) !== null;

/** The called name: `foo()` and `a.b.foo()` both read as `foo`; anything else is `""`. */
export const calleeName = (node: AstNode | null | undefined): string => {
  if (node?.type !== "CallExpression") return "";
  const { callee } = node;
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") return callee.property.name;
  return "";
};

/** Every ancestor of `node`, innermost first. */
export const ancestors = function* (node: AstNode): Generator<AstNode> {
  let current: AstNode | null | undefined = node.parent;
  while (current) {
    yield current;
    current = current.parent;
  }
};

export const enclosingCall = (node: AstNode, names: ReadonlySet<string>): AstNode | null => {
  for (const current of ancestors(node)) {
    if (current.type === "CallExpression" && names.has(calleeName(current))) return current;
  }
  return null;
};

export const closestAncestor = (node: AstNode, types: ReadonlySet<string>): AstNode | null => {
  for (const current of ancestors(node)) {
    if (types.has(current.type)) return current;
  }
  return null;
};

export const hasAncestor = (node: AstNode, predicate: Predicate): boolean => {
  for (const current of ancestors(node)) {
    if (predicate(current)) return true;
  }
  return false;
};

export const isWithin = (node: AstNode, container: AstNode): boolean => {
  for (const current of ancestors(node)) {
    if (current === container) return true;
  }
  return false;
};

export const crossesFunctionBefore = (
  node: AstNode,
  container: AstNode,
  functionTypes: ReadonlySet<string>
): boolean => {
  for (const current of ancestors(node)) {
    if (current === container) return false;
    if (functionTypes.has(current.type)) return true;
  }
  return false;
};

export const isMemberCall = (node: AstNode | null | undefined, method: string): boolean =>
  node?.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.property.type === "Identifier" &&
  node.callee.property.name === method;

/** The object a method call hangs off: `store.get()` reads as `store`. */
export const receiverName = (node: AstNode | null | undefined): string | null => {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression") return null;
  const { object } = node.callee;
  return object.type === "Identifier" ? object.name : null;
};

/** The last segment of a JSX tag name: `Animated.View` reads as `View`. */
export const tagIdentifier = (node: AstNode | null | undefined): string => {
  let current = node;
  while (current?.type === "JSXMemberExpression") current = current.property;
  if (current?.type === "JSXIdentifier" || current?.type === "Identifier") return current.name;
  return "";
};

/** The full dotted JSX tag name: `Animated.View` reads as `Animated.View`. Empty when a segment is not a plain name. */
export const tagPath = (node: AstNode | null | undefined): string => {
  if (node?.type === "JSXIdentifier" || node?.type === "Identifier") return node.name;
  if (node?.type !== "JSXMemberExpression") return "";
  const object = tagPath(node.object);
  const property = tagPath(node.property);
  return object === "" || property === "" ? "" : `${object}.${property}`;
};

export const attributeName = (attribute: AstNode): string => {
  if (attribute.type !== "JSXAttribute") return "";
  const { name } = attribute;
  return name.type === "JSXIdentifier" ? name.name : name.name.name;
};

export const importedSpecifiers = (node: AstNode, source: string): AstNode[] =>
  node.type === "ImportDeclaration" && node.source.value === source ? [...node.specifiers] : [];

/** Function-ish node types, for ancestor walks. */
export const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** Component or hook name: `Capitalized` or `useX`. */
export const COMPONENT_OR_HOOK = /^(?:[A-Z]|use[A-Z])/;

export const isFunction = (node: AstNode | null | undefined): boolean => !!node && FUNCTION_TYPES.has(node.type);

/** Source-text gate for createOnce rules: skip whole files that cannot contain the pattern. */
export const gate = (context: RuleContext, ...markers: string[]): boolean =>
  markers.some(marker => context.sourceCode.text.includes(marker));

/**
 * A rule's first option object, or `fallback` when the consumer passed none.
 * oxlint types options as untyped JSON, so this is the one place a rule's
 * option shape is asserted rather than checked.
 */
export const optionsOf = <T extends object>(context: RuleContext, fallback: T): T =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  (context.options[0] as T | undefined) ?? fallback;

/** Shorthand for a problem rule with a description. */
export const problem = (description: string, rule: RuleBody): Rule => ({
  ...rule,
  meta: { type: "problem", ...rule.meta, docs: { description } },
});

export type { AstNode, Rule, Visitor };
