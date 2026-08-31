// @ashstack/lint — i18n conventions. Every user-visible string goes through t().
import { tagIdentifier } from "../../lib/ast.js";

const MESSAGES = {
  bareJsxText: "bare JSX text — wrap with t() or <Trans>. Add the key under the locale translation files.",
  bareJsxAttribute: "bare translatable attribute — wrap with t(). Add the key under the locale translation files.",
  bareToast: "bare toast message — wrap with t() so every locale resolves.",
};

const I18N_COMPONENTS = new Set(["Trans", "Plural", "Select"]);
const NATIVE_TRANSLATABLE_ATTRIBUTES = ["placeholder", "accessibilityLabel", "accessibilityHint", "title"];
const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);
const BARE_TEXT = /^[A-Za-z][^<{}]{2,}$/;

const noBareText = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow untranslated literal text as the only child of a JSX element; wrap it in t() or <Trans> and add the key to the locale files so every locale resolves.",
    },
  },
  createOnce(context) {
    return {
      JSXElement(node) {
        if ((node.openingElement?.attributes ?? []).length > 0) return;
        const children = (node.children ?? []).filter(
          child => child.type !== "JSXText" || (child.value ?? "").trim() !== ""
        );
        if (children.length !== 1) return;
        const only = children[0];
        if (only.type !== "JSXText") return;
        if (!BARE_TEXT.test((only.value ?? "").trim())) return;
        if (I18N_COMPONENTS.has(tagIdentifier(node.openingElement?.name))) return;
        context.report({ node: only, message: MESSAGES.bareJsxText });
      },
    };
  },
};

const noBareAttrs = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow untranslated string literals in user-visible JSX attributes such as placeholder, accessibilityLabel, accessibilityHint and title; wrap the value in t().",
    },
    schema: [
      {
        type: "object",
        properties: { attributes: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    const attributes = new Set();
    return {
      before() {
        attributes.clear();
        for (const attribute of context.options?.[0]?.attributes ?? NATIVE_TRANSLATABLE_ATTRIBUTES) {
          attributes.add(attribute);
        }
      },
      JSXAttribute(node) {
        if (!attributes.has(node.name?.name ?? "")) return;
        const value = node.value;
        if (value?.type !== "Literal" || typeof value.value !== "string" || value.value.length === 0) return;
        context.report({ node, message: MESSAGES.bareJsxAttribute });
      },
    };
  },
};

const noBareToast = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a bare string literal as the only argument to a `toast.*` call; wrap it in t() so the message resolves in every locale.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== "MemberExpression") return;
        if (callee.object?.type !== "Identifier" || callee.object.name !== "toast") return;
        if (!TOAST_METHODS.has(callee.property?.name ?? "")) return;
        if ((node.arguments ?? []).length !== 1) return;
        const argument = node.arguments?.[0];
        if (argument?.type !== "Literal" || typeof argument.value !== "string") return;
        context.report({ node: argument, message: MESSAGES.bareToast });
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/i18n" },
  rules: {
    "no-bare-text": noBareText,
    "no-bare-attrs": noBareAttrs,
    "no-bare-toast": noBareToast,
  },
};
