import { attributeName, importedNames, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { CLASS_ATTRIBUTE, CLASS_BINDING, CLASS_MARKER, COMPOSER_MODULES, KNOWN_COMPOSERS } from "./shared.js";

const JOIN_METHODS = new Set(["join", "concat"]);

/** Node types that decide their string at render time whatever their parts are. */
const ALWAYS_DYNAMIC = new Set(["ConditionalExpression", "LogicalExpression"]);

const MESSAGES = {
  attribute:
    "Wrap this class value in `cn(...)`. It folds the conditional inputs into one string and lets a later Tailwind utility win over an earlier one that sets the same property.",
  precomputed:
    "Wrap this value in `cn(...)` where it reaches the class prop, or build it with `cn(...)` where it is declared. Conflicting Tailwind utilities survive into the DOM otherwise.",
  declaration:
    "Build this class value with `cn(...)` instead of joining it by hand, so conflicting Tailwind utilities resolve to the last one and falsy branches drop out.",
};

/** A composer other than `cn`: it concatenates the parts without resolving Tailwind conflicts. */
const isForeignComposer = (callee: AstNode, composers: ReadonlySet<string>): boolean => {
  if (callee.type === "MemberExpression") {
    return callee.property.type === "Identifier" && JOIN_METHODS.has(callee.property.name);
  }
  if (callee.type !== "Identifier") return false;
  return KNOWN_COMPOSERS.has(callee.name) ? callee.name !== "cn" : composers.has(callee.name);
};

/** A class value whose string is decided at render time, so utilities can collide. */
const isDynamic = (node: AstNode | null | undefined, composers: ReadonlySet<string>): boolean => {
  if (!node) return false;
  if (ALWAYS_DYNAMIC.has(node.type)) return true;
  if (node.type === "TemplateLiteral") return node.expressions.length > 0;
  if (node.type === "BinaryExpression") return node.operator === "+";
  return node.type === "CallExpression" && isForeignComposer(node.callee, composers);
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

      /** Reports each class-named declaration, and names the ones it reported. */
      const reportDeclarations = (): ReadonlySet<string> => {
        const reported = new Set<string>();
        for (const [name, init] of bindings) {
          if (!CLASS_BINDING.test(name)) continue;
          if (!isDynamic(init, composers)) continue;
          reported.add(name);
          context.report({ node: init.parent ?? init, message: MESSAGES.declaration });
        }
        return reported;
      };

      /** Reports each class prop, skipping a value already reported at its declaration. */
      const reportAttributes = (declared: ReadonlySet<string>): void => {
        for (const attribute of attributes) {
          const expression = attributeExpression(attribute);
          if (!expression) continue;
          if (isDynamic(expression, composers)) {
            context.report({ node: attribute, message: MESSAGES.attribute });
            continue;
          }
          if (expression.type !== "Identifier" || declared.has(expression.name)) continue;
          if (!isDynamic(bindings.get(expression.name), composers)) continue;
          context.report({ node: attribute, message: MESSAGES.precomputed });
        }
      };

      return {
        before() {
          composers.clear();
          bindings.clear();
          attributes.length = 0;
          return CLASS_MARKER.test(context.sourceCode.text);
        },
        ImportDeclaration(node) {
          for (const source of COMPOSER_MODULES) {
            for (const { local } of importedNames(node, source)) {
              if (!KNOWN_COMPOSERS.has(local)) composers.add(local);
            }
          }
        },
        VariableDeclarator(node) {
          if (node.id.type === "Identifier" && node.init) bindings.set(node.id.name, node.init);
        },
        JSXAttribute(node) {
          if (CLASS_ATTRIBUTE.test(attributeName(node))) attributes.push(node);
        },
        "Program:exit"() {
          reportAttributes(reportDeclarations());
        },
      };
    },
  }
);
