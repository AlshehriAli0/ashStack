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
        name: "store props to merge a class and return a reusable result",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ popup: { padding: 8 } });
export const popupProps = () => stylex.props(styles.popup);
export const Popup = () => {
  const props = stylex.props(styles.popup);
  return <div {...props} className={props.className} />;
};`,
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
        name: "props result used as a style value",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ certificate: { padding: 8 } });
export const Certificate = () => <article style={stylex.props(styles.certificate)} />;`,
        errors: [{ message: "Use `stylex.props(...)`", line: 3 }],
      },
      {
        name: "namespace alias and named import",
        code: `import * as sx from "@stylexjs/stylex";
import { props as getStyleProps } from "@stylexjs/stylex";
consume(sx.props(styles.one));
consume(getStyleProps(styles.two));`,
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
        name: "static color mix with configured tokens in default pseudo and ancestor states",
        code: `import * as stylex from "@stylexjs/stylex";\nimport { colors } from "./theme.stylex";\nconst styles = stylex.create({ box: { color: \`color-mix(in oklab, \${colors.primary} 10%, transparent)\`, backgroundColor: { default: colors.surface, ":hover": \`color-mix(in oklab, \${colors.primary} 20%, transparent)\` }, fill: { default: null, [stylex.when.ancestor(":hover")]: \`color-mix(in oklab, \${colors.primary} 30%, \${colors.surface})\` } } });`,
      },
      {
        name: "token colors under hover focus and nested media states",
        code: `import * as stylex from "@stylexjs/stylex";\nconst styles = stylex.create({ box: { backgroundColor: { default: colors.surface, ":hover": colors.primary, ":focus-visible": { default: null, "@media (hover: hover)": \`color-mix(in oklab, \${colors.ring} 50%, transparent)\` } }, borderColor: { default: colors.border, [stylex.when.ancestor(":hover")]: colors.primary } } });`,
      },
      {
        name: "token colors inside shadows filters and gradients",
        code: `import * as stylex from "@stylexjs/stylex";\nconst styles = stylex.create({ box: { boxShadow: { default: "none", ":hover": \`0 0 0 2px color-mix(in oklab, \${colors.ring} 50%, transparent)\` }, filter: \`drop-shadow(0 1px 2px \${colors.shadow})\`, backgroundImage: \`linear-gradient(to top, \${colors.primary}, transparent)\` } });`,
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
      {
        name: "nested members are not color tokens",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ box: { color: colors.primary.value } });`,
        errors: 1,
      },
      {
        name: "color mix still rejects raw colors and arbitrary expressions",
        code: `import * as stylex from "@stylexjs/stylex";\nconst styles = stylex.create({ box: { color: \`color-mix(in oklab, \${colors.primary} 10%, red)\`, fill: \`color-mix(in oklab, \${getColor()} 10%, transparent)\`, stroke: \`color-mix(in oklab, \${palette.primary} 10%, transparent)\` } });`,
        errors: 3,
      },
      {
        name: "raw hex is rejected inside pseudo and ancestor conditions",
        code: 'import * as stylex from "@stylexjs/stylex";\nconst styles = stylex.create({ box: { backgroundColor: { default: colors.surface, ":hover": "#fff", ":focus-visible": { default: null, "@media (hover: hover)": "#123456" } }, borderColor: { default: colors.border, [stylex.when.ancestor(":hover")]: "#abc" } } });',
        errors: 3,
      },
      {
        name: "raw colors and arbitrary mix expressions are rejected inside CSS strings",
        code: `import * as stylex from "@stylexjs/stylex";\nconst styles = stylex.create({ box: { boxShadow: { default: "none", ":hover": "0 0 0 2px #fff" }, filter: \`drop-shadow(0 1px 2px rgb(0 0 0))\`, backgroundImage: \`linear-gradient(to top, color-mix(in oklab, \${getColor()} 10%, transparent), transparent)\`, borderImageSource: "color-mix(in oklab, red 10%, transparent)" } });`,
        errors: 4,
      },
    ],
  },
  "no-duplicate-styles": {
    valid: [
      {
        name: "semantic aliases used independently",
        code: `import * as stylex from "@stylexjs/stylex";
const styles = stylex.create({ active: { padding: 4 }, selected: { padding: 4 } });
export const Active = () => <div {...stylex.props(styles.active)} />;
export const Selected = () => <div {...stylex.props(styles.selected)} />;`,
      },
      {
        name: "exported styles may be used in another module",
        code: `import * as stylex from "@stylexjs/stylex";
export const styles = stylex.create({ active: { padding: 4 }, selected: { padding: 4 } });`,
      },
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
  "no-conflicting-props": {
    valid: [
      {
        name: "inline positioning alongside unrelated compiled styles",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => <div {...stylex.props(styles.box)} style={{ left: "10%", top: "20%" }} />;
const styles = stylex.create({ box: { color: "red", position: "absolute" } });`,
      },
      {
        name: "stored props can merge their own class",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => { const p = stylex.props(styles.box); return <div {...p} className={p.className} />; };
const styles = stylex.create({ box: { color: "red" } });`,
      },
      {
        name: "unrelated JSX before a valid StyleX element",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => <><span /><div {...stylex.props(styles.box)} style={{ left: "10%" }} /></>;
const styles = stylex.create({ box: { color: "red" } });`,
      },
    ],
    invalid: [
      {
        name: "overlapping inline property",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => <div {...stylex.props(styles.box)} style={{ color: "blue" }} />;
const styles = stylex.create({ box: { color: "red" } });`,
        errors: 1,
      },
      {
        name: "className overwrites compiled class",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => <div {...stylex.props(styles.box)} className="legacy" />;
const styles = stylex.create({ box: { color: "red" } });`,
        errors: 1,
      },
      {
        name: "another result's className does not merge this spread",
        code: `import * as stylex from "@stylexjs/stylex";
const View = () => { const a = stylex.props(styles.box); const b = stylex.props(styles.other); return <div {...a} className={b.className} />; };
const styles = stylex.create({ box: { color: "red" }, other: { color: "blue" } });`,
        errors: 1,
      },
    ],
  },
});
