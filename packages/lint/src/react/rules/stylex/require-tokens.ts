import { hasAncestor, isMemberCall, optionsOf, problem, propertyKeyName } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const COLOR = /^(?:color|.*Color|fill|stroke)$/;
const RADIUS = /^border(?:TopLeft|TopRight|BottomLeft|BottomRight|StartStart|StartEnd|EndStart|EndEnd)?Radius$/;
const COMPOSITE_COLOR = /^(?:boxShadow|textShadow|filter|backgroundImage|borderImageSource)$/;
const RAW_HEX = /#[\da-f]{3,8}\b/i;
const RAW_COLOR_FUNCTION = /(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i;
const COLOR_KEYWORDS = new Set(["currentColor", "inherit", "initial", "unset", "revert", "revert-layer", "none"]);
const RADIUS_KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

interface Options {
  colors?: string | false;
  radii?: string | false;
  tokens?: Record<string, string[]>;
}

type Kind = "color" | "radius" | "composite" | "token";
type Requirement = { kind: Kind; group: string; name: string };

const valueKind = (name: string): Kind | null => {
  if (COLOR.test(name)) return "color";
  if (RADIUS.test(name)) return "radius";
  if (COMPOSITE_COLOR.test(name)) return "composite";
  return null;
};

const propertyPattern = (pattern: string): RegExp => {
  const expression = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\\*", ".*");
  return new RegExp(`^${expression}$`);
};

const memberPath = (node: AstNode): string => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression") return "";
  const object = memberPath(node.object);
  let property = "";
  if (!node.computed && node.property.type === "Identifier") property = node.property.name;
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string")
    property = node.property.value;
  return object && property ? `${object}.${property}` : "";
};

const isToken = (node: AstNode, group: string): boolean => {
  if (node.type !== "MemberExpression") return false;
  const path = memberPath(node);
  return path.startsWith(`${group}.`) && !path.slice(group.length + 1).includes(".");
};

const allowedLiteral = (node: AstNode, kind: Kind): boolean => {
  if (node.type === "Identifier") return node.name === "undefined";
  if (node.type !== "Literal") return false;
  if (node.value === null) return true;
  if (kind === "color") return typeof node.value === "string" && COLOR_KEYWORDS.has(node.value);
  return node.value === 0 || node.value === "0" || (typeof node.value === "string" && RADIUS_KEYWORDS.has(node.value));
};

const tokenMix = (node: AstNode, group: string): boolean => {
  if (node.type !== "TemplateLiteral" || node.expressions.length === 0) return false;
  if (!node.expressions.every(expression => isToken(expression, group))) return false;
  const value = node.quasis
    .map((part, index) => `${part.value.cooked ?? part.value.raw}${index < node.expressions.length ? "TOKEN" : ""}`)
    .join("");
  return /^color-mix\(in (?:srgb|srgb-linear|oklab|oklch|lab|lch|hsl|hwb), TOKEN(?: \d+(?:\.\d+)?%)?, (?:TOKEN(?: \d+(?:\.\d+)?%)?|transparent)\)$/.test(
    value
  );
};

const checkComposite = (context: RuleContext, node: AstNode, { group, name }: Requirement): void => {
  let css = "";
  if (node.type === "TemplateLiteral") css = node.quasis.map(part => part.value.cooked ?? part.value.raw).join("");
  if (node.type === "Literal" && typeof node.value === "string") css = node.value;
  const invalidMix =
    css.includes("color-mix(") &&
    (node.type !== "TemplateLiteral" || !node.expressions.every(expression => isToken(expression, group)));
  if (RAW_HEX.test(css) || RAW_COLOR_FUNCTION.test(css) || invalidMix)
    context.report({ node, message: `Use an existing \`${group}.*\` token in \`${name}\`.` });
};

const checkValue = (context: RuleContext, node: AstNode, requirement: Requirement): void => {
  if (node.type === "ObjectExpression") {
    node.properties.forEach(property => {
      if (property.type === "Property") checkValue(context, property.value, requirement);
    });
    return;
  }
  if (node.type === "ArrayExpression") {
    node.elements.forEach(item => {
      if (item) checkValue(context, item, requirement);
    });
    return;
  }
  if (node.type === "ConditionalExpression") {
    checkValue(context, node.consequent, requirement);
    checkValue(context, node.alternate, requirement);
    return;
  }
  if (node.type === "CallExpression" && isMemberCall(node, "firstThatWorks")) {
    node.arguments.forEach(argument => checkValue(context, argument, requirement));
    return;
  }
  const { kind, group, name } = requirement;
  if (kind === "composite") {
    checkComposite(context, node, requirement);
    return;
  }
  if (allowedLiteral(node, kind)) return;
  if (isToken(node, group)) return;
  if (kind === "color" && tokenMix(node, group)) return;
  context.report({ node, message: `Use an existing \`${group}.*\` token for \`${name}\`.` });
};

export const requireTokens: Rule = problem(
  "Use token groups for configured properties in `stylex.create`; colors and radii are checked by default.",
  {
    meta: {
      schema: [
        {
          type: "object",
          properties: {
            colors: {
              anyOf: [
                { type: "string", minLength: 1 },
                { type: "boolean", enum: [false] },
              ],
              default: "colors",
              description: "Color token group, or false to disable this check.",
            },
            radii: {
              anyOf: [
                { type: "string", minLength: 1 },
                { type: "boolean", enum: [false] },
              ],
              default: "radii",
              description: "Radius token group, or false to disable this check.",
            },
            tokens: {
              type: "object",
              default: {},
              propertyNames: { type: "string", pattern: "^[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*$" },
              additionalProperties: {
                type: "array",
                items: { type: "string", minLength: 1 },
                minItems: 1,
                uniqueItems: true,
              },
              description:
                "Additional token groups mapped to exact CSS properties or * patterns. Explicit mappings override built-in property checks.",
              examples: [{ spacing: ["padding*", "margin*", "gap"] }],
            },
          },
          additionalProperties: false,
        },
      ],
    },
    createOnce(context) {
      const bindings = { namespaces: new Set<string>(), named: new Set<string>() };
      let colors: string | false = "colors";
      let radii: string | false = "radii";
      let mappings: { group: string; pattern: RegExp }[] = [];
      let createCalls = new WeakMap<AstNode, boolean>();
      const isCreateCall = (node: AstNode): boolean => {
        if (node.type !== "CallExpression") return false;
        let result = createCalls.get(node);
        if (result === undefined) {
          result = isStylexCall(context, node, "create", bindings);
          createCalls.set(node, result);
        }
        return result;
      };

      return {
        before() {
          bindings.namespaces.clear();
          bindings.named.clear();
          createCalls = new WeakMap();
          const options = optionsOf<Options>(context, {});
          colors = options.colors ?? "colors";
          radii = options.radii ?? "radii";
          mappings = Object.entries(options.tokens ?? {}).flatMap(([group, properties]) =>
            properties.map(property => ({ group, pattern: propertyPattern(property) }))
          );
          return context.sourceCode.text.includes("stylex");
        },
        Program(node) {
          collectImports(node.body, "create", bindings);
        },
        Property(node) {
          const name = propertyKeyName(node);
          const kind = valueKind(name);
          if (kind === null && mappings.length === 0) return;
          let customGroup: string | undefined;
          let conflictingGroup: string | undefined;
          for (const mapping of mappings) {
            if (!mapping.pattern.test(name)) continue;
            if (customGroup && customGroup !== mapping.group) {
              conflictingGroup = mapping.group;
              break;
            }
            customGroup = mapping.group;
          }
          if (customGroup === undefined && kind === null) return;
          if (!hasAncestor(node, isCreateCall)) return;
          if (conflictingGroup) {
            context.report({
              node,
              message: `Map \`${name}\` to one token group; matched ${customGroup}, ${conflictingGroup}.`,
            });
            return;
          }
          const group = customGroup ?? (kind === "radius" ? radii : colors);
          if (group === false) return;
          checkValue(context, node.value, { kind: kind ?? "token", group, name });
        },
      };
    },
  }
);
