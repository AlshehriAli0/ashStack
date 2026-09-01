import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const CONSTANT_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const PLACEHOLDER_NAME = /^_+$/;

const FORMAT_TESTS: Record<string, (name: string) => boolean> = {
  camelCase: name => CAMEL_CASE.test(name),
  PascalCase: name => PASCAL_CASE.test(name) && /[a-z]/.test(name),
  CONSTANT_CASE: name => CONSTANT_CASE.test(name),
  snake_case: name => SNAKE_CASE.test(name),
};

const ANY_CASE = ["camelCase", "snake_case", "CONSTANT_CASE", "PascalCase"];

const LEGEND_STATE_OBSERVABLE_SUFFIX = String.raw`\$?`;
const AFFIXED_NAME = String.raw`[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*${LEGEND_STATE_OBSERVABLE_SUFFIX}`;
const NUMERIC_KEY = String.raw`(?:[0-9.]+)`;

const LIBRARY_PROPERTY_NAMES = [
  "enableFullScreenImage_legacy",
  "experimental_backgroundImage",
  "unstable_conditionNames",
];
const LIBRARY_VARIABLE_NAMES = ["unstable_settings"];

const spelledExactly = (...alternatives: string[]): RegExp => new RegExp(`^(?:${alternatives.join("|")})$`);

interface Convention {
  match: RegExp | null;
  formats: string[];
  label: string;
}

const CONVENTIONS = {
  objectLiteralMember: {
    match: spelledExactly(...LIBRARY_PROPERTY_NAMES, NUMERIC_KEY, AFFIXED_NAME),
    formats: ANY_CASE,
    label: "object property",
  },
  typeMember: {
    match: spelledExactly(AFFIXED_NAME),
    formats: ANY_CASE,
    label: "type member",
  },
  variable: {
    match: spelledExactly(...LIBRARY_VARIABLE_NAMES, AFFIXED_NAME),
    formats: ["camelCase", "CONSTANT_CASE", "PascalCase"],
    label: "variable",
  },
  enumMember: {
    match: null,
    formats: ["CONSTANT_CASE", "PascalCase"],
    label: "enum member",
  },
} satisfies Record<string, Convention>;

type Kind = keyof typeof CONVENTIONS;

const matchesFormat = (format: string, name: string): boolean => FORMAT_TESTS[format]?.(name) === true;

const memberName = (key: AstNode | null | undefined): string | null => {
  if (!key) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type !== "Literal") return null;
  if (typeof key.value === "string") return IDENTIFIER_NAME.test(key.value) ? key.value : null;
  if (typeof key.value === "number") return key.raw ?? String(key.value);
  return null;
};

const namingViolation = (name: string, kind: Kind): string | null => {
  const convention: Convention = CONVENTIONS[kind];
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
  "Require a variable, object property, type member or enum member to use one of the casings allowed for its kind.",
  {
    createOnce(context: RuleContext) {
      const check = (node: AstNode, name: string | null, kind: Kind): void => {
        if (name === null) return;
        const message = namingViolation(name, kind);
        if (message !== null) context.report({ node, message });
      };

      const checkBinding = (node: AstNode | null | undefined, shorthand: boolean): void => {
        if (!node) return;
        switch (node.type) {
          case "Identifier": {
            if (shorthand || PLACEHOLDER_NAME.test(node.name)) return;
            check(node, node.name, "variable");
            return;
          }
          case "AssignmentPattern":
            checkBinding(node.left, shorthand);
            return;
          case "RestElement":
            checkBinding(node.argument, false);
            return;
          case "ArrayPattern": {
            for (const element of node.elements) checkBinding(element, false);
            return;
          }
          case "ObjectPattern": {
            for (const property of node.properties) {
              if (property.type === "RestElement") checkBinding(property.argument, false);
              else checkBinding(property.value, property.shorthand);
            }
            return;
          }
          default:
            return;
        }
      };

      return {
        VariableDeclarator(node) {
          checkBinding(node.id, false);
        },
        Property(node) {
          if (node.computed || node.parent.type === "ObjectPattern") return;
          check(node.key, memberName(node.key), "objectLiteralMember");
        },
        TSPropertySignature(node) {
          if (node.computed) return;
          check(node.key, memberName(node.key), "typeMember");
        },
        TSMethodSignature(node) {
          if (node.computed) return;
          check(node.key, memberName(node.key), "typeMember");
        },
        TSEnumMember(node) {
          check(node.id, memberName(node.id), "enumMember");
        },
      };
    },
  }
);
