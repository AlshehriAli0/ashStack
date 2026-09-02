import { attributeName, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const CLASS_ATTRIBUTE = /^(?:class|className|[A-Za-z_$][A-Za-z0-9_$]*ClassName)$/;
const CLASS_BINDING = /^[A-Za-z_$][A-Za-z0-9_$]*class(?:es|name|names)?$/i;

const KNOWN_COMPOSERS = new Set(["cn", "clsx", "classNames", "classnames", "twMerge"]);
const COMPOSER_MODULES = ["clsx", "classnames", "tailwind-merge"];
const JOIN_METHODS = new Set(["join", "concat"]);

const MESSAGES = {
  attribute:
    "Wrap this class value in `cn(...)`. It folds the conditional inputs into one string and lets a later Tailwind utility win over an earlier one that sets the same property.",
  precomputed:
    "Wrap this value in `cn(...)` where it reaches the class prop, or build it with `cn(...)` where it is declared. Conflicting Tailwind utilities survive into the DOM otherwise.",
  declaration:
    "Build this class value with `cn(...)` instead of joining it by hand, so conflicting Tailwind utilities resolve to the last one and falsy branches drop out.",
};

/** A class value whose string is decided at render time, so utilities can collide. */
const isDynamic = (node: AstNode | null | undefined, composers: ReadonlySet<string>): boolean => {
  if (!node) return false;
  if (node.type === "TemplateLiteral") return node.expressions.length > 0;
  if (node.type === "ConditionalExpression") return true;
  if (node.type === "LogicalExpression") return true;
  if (node.type === "BinaryExpression") return node.operator === "+";
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return JOIN_METHODS.has(callee.property.name);
  }
  if (callee.type !== "Identifier") return false;
  return KNOWN_COMPOSERS.has(callee.name) ? callee.name !== "cn" : composers.has(callee.name);
};

const attributeExpression = (attribute: AstNode): AstNode | null => {
  if (attribute.type !== "JSXAttribute") return null;
  const { value } = attribute;
  return value?.type === "JSXExpressionContainer" ? value.expression : null;
};

export const preferCn: Rule = problem(
  "Require a dynamic class value to go through `cn(...)` before it reaches a `class`, `className` or `*ClassName` prop. Reports both where the value reaches the prop and where a variable named after classes is declared.",
  {
    createOnce(context: RuleContext) {
      const composers = new Set<string>();
      const bindings = new Map<string, AstNode>();
      const attributes: AstNode[] = [];

      return {
        before() {
          composers.clear();
          bindings.clear();
          attributes.length = 0;
          return true;
        },
        ImportDeclaration(node) {
          for (const source of COMPOSER_MODULES) {
            for (const specifier of importedSpecifiers(node, source)) {
              if (specifier.type !== "ImportSpecifier") continue;
              const local = specifier.local.name;
              if (!KNOWN_COMPOSERS.has(local)) composers.add(local);
            }
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return;
          bindings.set(node.id.name, node.init);
        },
        JSXAttribute(node) {
          if (CLASS_ATTRIBUTE.test(attributeName(node))) attributes.push(node);
        },
        "Program:exit"() {
          for (const [name, init] of bindings) {
            if (!CLASS_BINDING.test(name)) continue;
            if (!isDynamic(init, composers)) continue;
            context.report({ node: init.parent ?? init, message: MESSAGES.declaration });
          }

          for (const attribute of attributes) {
            const expression = attributeExpression(attribute);
            if (!expression) continue;
            if (isDynamic(expression, composers)) {
              context.report({ node: attribute, message: MESSAGES.attribute });
              continue;
            }
            if (expression.type !== "Identifier") continue;
            if (CLASS_BINDING.test(expression.name)) continue;
            if (!isDynamic(bindings.get(expression.name), composers)) continue;
            context.report({ node: attribute, message: MESSAGES.precomputed });
          }
        },
      };
    },
  }
);
