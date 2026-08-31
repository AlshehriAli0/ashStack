import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const NUMBERABLE_CAPITAL = /^[A-Z][0-9]*$/;
const CONSTANT_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const PLACEHOLDER_NAME = /^_+$/;

const FORMAT_TESTS: Record<string, (name: string) => boolean> = {
  camelCase: name => CAMEL_CASE.test(name),
  PascalCase: name => PASCAL_CASE.test(name) && (/[a-z]/.test(name) || NUMBERABLE_CAPITAL.test(name)),
  CONSTANT_CASE: name => CONSTANT_CASE.test(name),
  snake_case: name => SNAKE_CASE.test(name),
};

const ANY_CASE = ["camelCase", "snake_case", "CONSTANT_CASE", "PascalCase"];

interface Convention {
  match: RegExp | null;
  formats: string[];
  label: string;
}

const CONVENTIONS: Record<string, Convention> = {
  objectLiteralMember: {
    match:
      /^(?:enableFullScreenImage_legacy|experimental_backgroundImage|unstable_conditionNames|(?:[0-9.]+)|[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ANY_CASE,
    label: "object property",
  },
  typeMember: {
    match: /^(?:[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ANY_CASE,
    label: "type member",
  },
  variable: {
    // trailing $ is the Legend State observable suffix — state/naming REQUIRES it
    match: /^(?:unstable_settings|[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ["camelCase", "CONSTANT_CASE", "PascalCase"],
    label: "variable",
  },
  enumMember: {
    match: null,
    formats: ["CONSTANT_CASE", "PascalCase"],
    label: "enum member",
  },
};

const matchesFormat = (format: string, name: string): boolean => FORMAT_TESTS[format]?.(name) === true;

const memberName = (key: AstNode | null | undefined): string | null => {
  if (!key) return null;
  if (key.type === "Identifier") return key.name as string;
  if (key.type !== "Literal") return null;
  if (typeof key.value === "string") return IDENTIFIER_NAME.test(key.value) ? key.value : null;
  if (typeof key.value === "number") return (key.raw as string | undefined) ?? String(key.value);
  return null;
};

const namingViolation = (name: string, kind: string): string | null => {
  const convention = CONVENTIONS[kind] as Convention;
  const wrongFormat = `Rename this ${convention.label} \`${name}\` to ${convention.formats.join(", ")}.`;
  if (convention.match === null) {
    return convention.formats.some(format => matchesFormat(format, name)) ? null : wrongFormat;
  }
  const matched = convention.match.exec(name);
  if (!matched) {
    return `Rename this ${convention.label} \`${name}\` to a plain ${convention.formats.join("/")} identifier, with at most a leading \`_\` or a trailing \`$\`.`;
  }
  const captured = matched[1];
  if (!captured) return null;
  return convention.formats.some(format => matchesFormat(format, captured)) ? null : wrongFormat;
};

export const noNamingConvention: Rule = problem(
  "Flags a variable, object property, type member or enum member whose name misses the casings allowed for its kind.",
  {
    createOnce(context: RuleContext) {
      const check = (node: AstNode, name: string | null, kind: string): void => {
        if (name === null) return;
        const message = namingViolation(name, kind);
        if (message !== null) context.report({ node, message });
      };

      const checkBinding = (node: AstNode | null | undefined, shorthand: boolean): void => {
        if (!node) return;
        switch (node.type) {
          case "Identifier":
            if (shorthand || PLACEHOLDER_NAME.test(node.name as string)) return;
            check(node, node.name as string, "variable");
            return;
          case "AssignmentPattern":
            checkBinding(node.left as AstNode, shorthand);
            return;
          case "RestElement":
            checkBinding(node.argument as AstNode, false);
            return;
          case "ArrayPattern":
            for (const element of (node.elements as AstNode[] | undefined) ?? []) checkBinding(element, false);
            return;
          case "ObjectPattern":
            for (const property of (node.properties as AstNode[] | undefined) ?? []) {
              if (property.type === "RestElement") checkBinding(property.argument as AstNode, false);
              else checkBinding(property.value as AstNode, property.shorthand === true);
            }
            return;
          default:
        }
      };

      return {
        VariableDeclarator(node: AstNode) {
          checkBinding(node.id as AstNode, false);
        },
        Property(node: AstNode) {
          if (node.computed === true || node.parent?.type === "ObjectPattern") return;
          check(node.key as AstNode, memberName(node.key as AstNode), "objectLiteralMember");
        },
        TSPropertySignature(node: AstNode) {
          if (node.computed === true) return;
          check(node.key as AstNode, memberName(node.key as AstNode), "typeMember");
        },
        TSMethodSignature(node: AstNode) {
          if (node.computed === true) return;
          check(node.key as AstNode, memberName(node.key as AstNode), "typeMember");
        },
        TSEnumMember(node: AstNode) {
          check(node.id as AstNode, memberName(node.id as AstNode), "enumMember");
        },
      };
    },
  }
);
