const SKIPPED_KEYS = new Set(["parent", "loc", "range", "start", "end", "type"]);

export const findInSubtree = (node, predicate) => {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findInSubtree(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (typeof node.type !== "string") return null;
  if (predicate(node)) return node;
  for (const key in node) {
    if (SKIPPED_KEYS.has(key)) continue;
    const value = node[key];
    if (value !== null && typeof value === "object") {
      const found = findInSubtree(value, predicate);
      if (found) return found;
    }
  }
  return null;
};

export const subtreeHas = (node, predicate) => findInSubtree(node, predicate) !== null;

export const calleeName = node => {
  if (node === null || node.type !== "CallExpression") return "";
  const callee = node.callee;
  if (callee === null || callee === undefined) return "";
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && callee.property?.type === "Identifier") return callee.property.name;
  return "";
};

export const enclosingCall = (node, names) => {
  let current = node.parent;
  while (current) {
    if (current.type === "CallExpression" && names.has(calleeName(current))) return current;
    current = current.parent;
  }
  return null;
};

export const closestAncestor = (node, types) => {
  let current = node.parent;
  while (current) {
    if (types.has(current.type)) return current;
    current = current.parent;
  }
  return null;
};

export const hasAncestor = (node, predicate) => {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return true;
    current = current.parent;
  }
  return false;
};

export const isWithin = (node, container) => {
  let current = node.parent;
  while (current) {
    if (current === container) return true;
    current = current.parent;
  }
  return false;
};

export const crossesFunctionBefore = (node, container, functionTypes) => {
  let current = node.parent;
  while (current && current !== container) {
    if (functionTypes.has(current.type)) return true;
    current = current.parent;
  }
  return false;
};

export const isMemberCall = (node, method) =>
  node !== null &&
  node !== undefined &&
  node.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.computed !== true &&
  node.callee.property?.type === "Identifier" &&
  node.callee.property.name === method;

export const receiverName = node => (node?.callee?.object?.type === "Identifier" ? node.callee.object.name : null);

export const tagIdentifier = node => {
  let current = node;
  while (current?.type === "JSXMemberExpression") current = current.property;
  return current?.name ?? "";
};

export const attributeName = attribute =>
  attribute.type === "JSXAttribute" ? (attribute.name?.name ?? attribute.name?.property?.name ?? "") : "";

export const importedSpecifiers = (node, source) =>
  node.type === "ImportDeclaration" && node.source?.value === source ? (node.specifiers ?? []) : [];

export const memberPathOf = node => {
  const parts = [];
  let current = node;
  while (current?.type === "MemberExpression") {
    if (current.property?.type === "Identifier") parts.unshift(current.property.name);
    else if (current.property?.type === "Literal") parts.unshift(String(current.property.value));
    else parts.unshift("*");
    current = current.object;
  }
  if (current?.type === "Identifier") parts.unshift(current.name);
  else if (current?.type === "CallExpression") parts.unshift("()");
  return parts.join(".");
};
