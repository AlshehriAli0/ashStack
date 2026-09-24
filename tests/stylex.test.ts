import stylex from "../packages/lint/dist/react/rules/stylex/index.js";
import { moduleTests } from "./harness.js";

moduleTests(stylex, {
  "inline-props": {
    valid: [
      {
        name: "direct JSX spread",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { padding: 8 } });
export const Box = () => <div {...stylex.props(styles.box)} />;`,
      },
      {
        name: "unrelated props function",
        code: `const stylex = { props: (value: unknown) => value };
const boxProps = stylex.props({ color: "red" });
export const Box = () => <div {...boxProps} />;`,
      },
      {
        name: "a local stylex binding shadows the import",
        code: `import * as stylex from "@stylexjs/stylex";
function render() {
  const stylex = { props: (value: unknown) => value };
  const result = stylex.props({ color: "red" });
  return <div {...result} />;
}`,
      },
    ],
    invalid: [
      {
        name: "stored props spread later as in the screenshot",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ certificate: { padding: 8 } });
const certificateStyle = stylex.props(styles.certificate);
export const Certificate = () => <article className="legacy" {...certificateStyle} />;`,
        errors: [{ message: "Spread `stylex.props(...)` directly", line: 3 }],
      },
      {
        name: "namespace alias and named import",
        code: `import * as sx from "@stylexjs/stylex";
import { props as getStyleProps } from "@stylexjs/stylex";
const one = sx.props(styles.one);
const two = getStyleProps(styles.two);`,
        errors: 2,
      },
    ],
  },
  "require-tokens": {
    valid: [
      {
        name: "named color and radius tokens, including conditional values",
        code: `import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "./tokens.stylex";

const styles = stylex.create({
  card: {
    backgroundColor: { default: colors.surface, ":hover": colors.hover },
    borderColor: { default: colors.surface, [stylex.when.ancestor(":hover")]: colors.hover },
    borderRadius: radii.md,
    "::placeholder": { color: colors.muted },
    color: "currentColor",
  },
  square: { borderRadius: 0, fill: "none" },
});`,
      },
      {
        name: "raw values belong in token definitions and theme overrides",
        code: `import * as stylex from "@stylexjs/stylex";
import { colors } from "./tokens.stylex";

export const raw = stylex.defineVars({ text: "#123456" });
export const steps = stylex.defineConsts({ sm: "4px" });
export const dark = stylex.createTheme(colors, { text: "#ffffff" });`,
      },
      {
        name: "official fallback helper with token values",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: stylex.firstThatWorks(colors.modern, colors.fallback) } });`,
      },
      {
        name: "unrelated create and color-looking strings are untouched",
        code: `import * as stylex from "@stylexjs/stylex";
const other = { create: (value: unknown) => value };
other.create({ color: "red", borderRadius: 8 });
const styles = stylex.create({ box: { cursor: "pointer", animationName: "red" } });`,
      },
      {
        name: "a local create binding shadows the import",
        code: `import { create } from "@stylexjs/stylex";
function local() {
  const create = (value: unknown) => value;
  return create({ box: { color: "red", borderRadius: 8 } });
}`,
      },
      {
        name: "renamed groups and independent opt-outs",
        options: { colors: "palette", radii: false },
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: palette.ink, borderRadius: 7 } });`,
      },
      {
        name: "dotted group names and static bracket access",
        options: { colors: "theme.palette", radii: "scale.radii" },
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: theme.palette["ink"], borderTopLeftRadius: scale.radii.small } });`,
      },
      {
        name: "both groups disabled",
        options: { colors: false, radii: false },
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: "red", borderRadius: 7 } });`,
      },
    ],
    invalid: [
      {
        name: "literal color and radius in a style",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ card: { color: "red", backgroundColor: "transparent", borderRadius: 8 } });`,
        errors: [
          { message: "Use `colors.*`", line: 2 },
          { message: "Use `colors.*`", line: 2 },
          { message: "Use `radii.*`", line: 2 },
        ],
      },
      {
        name: "alias, conditional branches, logical corner and pseudo-element",
        code: `import * as sx from "@stylexjs/stylex";
const styles = sx.create({
  card: {
    backgroundColor: { default: "#fff", ":hover": "rgb(0 0 0)" },
    borderStartEndRadius: { default: "8px", "@media (min-width: 40rem)": 12 },
    "::placeholder": { color: "gray" },
  },
});`,
        errors: 5,
      },
      {
        name: "named create import and template values",
        code: `const styles = createStyles({ box: { fill: \`#fff\`, borderRadius: \`4px\` } });
import { create as createStyles } from "@stylexjs/stylex";`,
        errors: 2,
      },
      {
        name: "wrong token group, including nested branches",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: radii.md, borderRadius: colors.ink, backgroundColor: { default: colors.ink, ":hover": palette.hover } } });`,
        errors: 3,
      },
      {
        name: "fallback helper still checks each value",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: stylex.firstThatWorks(colors.modern, "red") } });`,
        errors: 1,
      },
      {
        name: "renamed groups reject defaults",
        options: { colors: "palette", radii: "corners" },
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: colors.ink, borderRadius: radii.md } });`,
        errors: 2,
      },
      {
        name: "other color-valued properties and corner radii",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { outlineColor: "red", caretColor: "blue", accentColor: "green", stroke: "black", borderEndStartRadius: "6px" } });`,
        errors: 5,
      },
      {
        name: "computed or arbitrary values cannot bypass token groups",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: colors[name], borderRadius: getRadius(), fill: "transparent" } });`,
        errors: 3,
      },
    ],
  },
  "no-duplicate-styles": {
    valid: [
      {
        name: "different declarations and dynamic styles",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ one: { color: "red" }, two: { color: "blue" }, dynamic: (size: number) => ({ width: size }) });`,
      },
      {
        name: "nested condition order is significant",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ one: { color: { default: "red", ":hover": "blue" } }, two: { color: { ":hover": "blue", default: "red" } } });`,
      },
      {
        name: "separate create calls are independent",
        code: `import * as stylex from "@stylexjs/stylex";
const one = stylex.create({ box: { padding: 4 } });
const two = stylex.create({ box: { padding: 4 } });`,
      },
      {
        name: "a local namespace shadows the import",
        code: `import * as stylex from "@stylexjs/stylex";
function local() {
  const stylex = { create: (value: unknown) => value };
  return stylex.create({ one: { padding: 4 }, two: { padding: 4 } });
}`,
      },
      {
        name: "unsupported bigint values do not crash the rule",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ first: { width: 1n }, second: { width: 2n } });`,
      },
    ],
    invalid: [
      {
        name: "two names with identical declarations in either order",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ div1: { color: "red", padding: 8 }, div2: { padding: 8, color: "red" } });`,
        errors: [{ message: "`div2` duplicates `div1`", line: 2 }],
      },
      {
        name: "named create import",
        code: `import { create as define } from "@stylexjs/stylex";
const styles = define({ first: { padding: 4 }, second: { padding: 4 } });`,
        errors: 1,
      },
      {
        name: "equivalent literals with different quote styles",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ first: { color: "red" }, second: { color: 'red' } });`,
        errors: 1,
      },
    ],
  },
});
