import { join } from "node:path";

import reactWeb from "../packages/lint/dist/react/rules/react/index.js";
import { moduleTests, type ValidCase } from "./harness.js";

const WRAPPER_DIR = "designsys";

const ABSOLUTE_DESIGN_SYSTEM = join(
  import.meta.dir,
  "..",
  "packages",
  "lint",
  "fixtures",
  "react",
  "prefer-design-system",
  "ds"
);

/**
 * A wrapper file inside the scanned directory, so every case sharing its
 * bucket has something to find. The rule skips it whatever it imports, which
 * is the exemption those cases lean on.
 */
const wrapper = (bucket: string, file: string, options: unknown = { dir: WRAPPER_DIR }): ValidCase => ({
  name: `${bucket}: the wrapper at ${WRAPPER_DIR}/${file} is skipped`,
  bucket,
  options,
  filename: `../../${WRAPPER_DIR}/${file}`,
  code: `import { TouchableOpacity } from "react-native";

export const Wrapper = TouchableOpacity;
`,
});

moduleTests(reactWeb, {
  "no-unlabeled-icon-button": {
    valid: [
      {
        name: "aria-label names the button",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button" aria-label="Delete this row">
    <TrashIcon />
  </button>
);
`,
      },
      {
        name: "aria-labelledby names the button",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button" aria-labelledby="delete-label">
    <TrashIcon />
  </button>
);
`,
      },
      {
        name: "visible text beside the icon",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon /> Delete
  </button>
);
`,
      },
      {
        name: "a non-trivial expression child",
        code: `declare const TrashIcon: () => JSX.Element;
declare const label: string;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
    {label}
  </button>
);
`,
      },
      {
        name: "a nested img with alt text",
        code: `export const Avatar = () => (
  <button type="button">
    <span>
      <img src="/me.png" alt="Open your profile" />
    </span>
  </button>
);
`,
      },
      {
        name: "a text-only button has no element child at all",
        code: `export const Save = () => <button type="button">Save</button>;\n`,
      },
      {
        name: "a component that is not a button, in a file that does mention buttons",
        code: `declare const TrashIcon: () => JSX.Element;

export const Ok = () => <button type="button" aria-label="Delete" />;

export const Chip = () => (
  <div>
    <TrashIcon />
  </div>
);
`,
      },
      {
        name: "an aria-label from an expression",
        code: `declare const TrashIcon: () => JSX.Element;
declare const label: string;

export const Delete = () => (
  <button type="button" aria-label={label}>
    <TrashIcon />
  </button>
);
`,
      },
    ],
    invalid: [
      {
        name: "an element child with no surrounding whitespace",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => <button type="button"><TrashIcon /></button>;
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 3 }],
      },
      {
        name: "a fragment child with no surrounding whitespace",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => <button type="button"><><TrashIcon /></></button>;
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 3 }],
      },
      {
        name: "a false expression child names nothing",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
    {false}
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4 }],
      },
      {
        name: "a true expression child names nothing",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
    {true}
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4 }],
      },
      {
        name: "a spread attribute is not an accessible name",
        code: `declare const TrashIcon: () => JSX.Element;
declare const rest: Record<string, unknown>;

export const Delete = () => (
  <button type="button" {...rest}>
    <TrashIcon />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 5 }],
      },
      {
        name: "a lowercase button wrapping only an icon",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4, column: 4 }],
      },
      {
        name: "a capitalised Button wrapping only an icon",
        code: `declare const Button: (props: { children?: unknown }) => JSX.Element;
declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <Button>
    <TrashIcon />
  </Button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 5 }],
      },
      {
        name: "an empty aria-label names nothing",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button" aria-label="   ">
    <TrashIcon />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4 }],
      },
      {
        name: "a trivial expression child names nothing",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
    {null}
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4 }],
      },
      {
        name: "an img with no alt names nothing",
        code: `export const Avatar = () => (
  <button type="button">
    <img src="/me.png" />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 2 }],
      },
      {
        name: "an img with an empty alt names nothing",
        code: `export const Avatar = () => (
  <button type="button">
    <img src="/me.png" alt="" />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 2 }],
      },
      {
        name: "a file under components/ui reports too, unlike the plugin this came from",
        filename: "components/ui/icon-button.tsx",
        code: `declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button">
    <TrashIcon />
  </button>
);
`,
        errors: [{ message: "so this icon-only button has an accessible name", line: 4 }],
      },
    ],
  },

  "no-svg-without-title": {
    valid: [
      {
        name: "a title child with content",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>Company mark</title>
    <path d="M0 0h16v16H0z" />
  </svg>
);
`,
      },
      {
        name: "a title that is not the first child still counts",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <path d="M0 0h16v16H0z" />
    <title>Company mark</title>
  </svg>
);
`,
      },
      {
        name: "aria-label names it",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-label="Company mark" />;\n`,
      },
      {
        name: "aria-hidden marks it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-hidden="true" />;\n`,
      },
      {
        name: "a bare aria-hidden marks it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-hidden />;\n`,
      },
      {
        name: "role presentation marks it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" role="presentation" />;\n`,
      },
      {
        name: "role none marks it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" role="none" />;\n`,
      },
      {
        name: "aria-hidden set to a non-boolean expression still hides it",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-hidden={0} />;\n`,
      },
      {
        name: "aria-label from an expression names it",
        code: `declare const label: string;

export const Mark = () => <svg viewBox="0 0 16 16" aria-label={label} />;
`,
      },
      {
        name: "a title holding a real expression has content",
        code: `declare const label: string;

export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>{label}</title>
  </svg>
);
`,
      },
      {
        name: "a title holding an element has content",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>
      <tspan>Company mark</tspan>
    </title>
  </svg>
);
`,
      },
      {
        name: "a title holding a fragment has content",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>
      <>Company mark</>
    </title>
  </svg>
);
`,
      },
      {
        name: "a capitalised Svg component is somebody else's contract",
        code: `declare const Svg: (props: { children?: unknown }) => JSX.Element;

export const Mark = () => <Svg />;
`,
      },
    ],
    invalid: [
      {
        name: "a desc child is not a title, however much content it holds",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <desc>A filled square</desc>
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2 }],
      },
      {
        name: "a spread attribute is not an accessible name",
        code: `declare const rest: Record<string, unknown>;

export const Mark = () => <svg viewBox="0 0 16 16" {...rest} />;
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 3 }],
      },
      {
        name: "a title holding the false literal names nothing",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>{false}</title>
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2 }],
      },
      {
        name: "a title holding the true literal names nothing",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>{true}</title>
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2 }],
      },
      {
        name: "no title and no naming attribute",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <path d="M0 0h16v16H0z" />
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2, column: 4 }],
      },
      {
        name: "a self-closing svg reports, unlike Biome's version",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" />;\n`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 1, column: 28 }],
      },
      {
        name: "an empty title names nothing",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>   </title>
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2 }],
      },
      {
        name: "a title holding a trivial expression names nothing",
        code: `export const Mark = () => (
  <svg viewBox="0 0 16 16">
    <title>{null}</title>
  </svg>
);
`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 2 }],
      },
      {
        name: "aria-hidden set to false does not mark it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-hidden="false" />;\n`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 1 }],
      },
      {
        name: "aria-hidden set to the false literal does not mark it decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-hidden={false} />;\n`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 1 }],
      },
      {
        name: "an empty aria-label names nothing",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" aria-label="" />;\n`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 1 }],
      },
      {
        name: "a role that is not decorative",
        code: `export const Mark = () => <svg viewBox="0 0 16 16" role="img" />;\n`,
        errors: [{ message: "Give this `<svg>` a `<title>` child with content", line: 1 }],
      },
    ],
  },
  "components-tsx-only": {
    valid: [
      {
        name: "a bare export list beside an import is still a barrel",
        filename: "src/components/index.ts",
        code: 'import { Card } from "./card";\n\nexport { Card };\n',
      },
      {
        name: "a star export is a barrel",
        filename: "src/components/index.ts",
        code: 'export * from "./card";\n',
      },
      {
        name: "a re-export with a declaration attached is still a barrel entry",
        filename: "src/components/index.ts",
        code: 'export { Card } from "./card";\nexport * from "./row";\n',
      },
      {
        name: "a helper outside the components directory is none of this rule's business",
        filename: "src/utils/money.ts",
        code: "export const total = (a, b) => a + b;\n",
      },
      {
        name: "a directory merely named like the configured one does not count",
        filename: "src/componentsx/money.ts",
        code: "export const total = (a, b) => a + b;\n",
      },
      {
        name: "a component that renders an element",
        code: `export const PriceRow = ({ amount }: { amount: number }) => <span>{amount}</span>;
`,
      },
      {
        name: "a component that renders only a fragment",
        code: `export const Group = ({ children }: { children: unknown }) => {
  return <>{children}</>;
};
`,
      },
      {
        name: "jsx anywhere in the file is enough",
        code: `const icon = <svg />;

export const iconRegistry = { icon };
`,
      },
      {
        name: "jsx nested deep inside a callback",
        code: `export const rows = [1, 2].map(value => {
  const render = () => <li>{value}</li>;
  return render;
});
`,
      },
      { name: "an empty file", code: "" },
      { name: "a star barrel", code: 'export * from "./price-row";\n' },
      { name: "a namespaced star barrel", code: 'export * as icons from "./icons";\n' },
      { name: "a named re-export barrel", code: 'export { PriceRow } from "./price-row";\n' },
      { name: "a default re-export barrel", code: 'export { default } from "./price-row";\n' },
      { name: "a type-only re-export barrel", code: 'export type { PriceProps } from "./price-row";\n' },
      {
        name: "an import plus a bare named export list",
        code: `import { PriceRow } from "./price-row";

export { PriceRow };
`,
      },
      { name: "a file that only imports", code: 'import "./polyfills";\n' },
    ],
    invalid: [
      {
        name: "a declaration beside re-exports is not a barrel",
        filename: "src/components/index.ts",
        code: 'export * from "./card";\nexport const GAP = 8;\n',
        errors: 1,
      },
      {
        name: "an empty dir option is rejected before linting",
        filename: "src/components/helper.ts",
        code: "export const total = (a, b) => a + b;\n",
        options: { dir: "components" },
        errors: 1,
      },
      {
        name: "the directory is configurable",
        filename: "app/ui/helper.ts",
        code: "export const total = (a, b) => a + b;\n",
        options: { dir: "app/ui" },
        errors: 1,
      },
      {
        name: "a helper module with no jsx",
        filename: "src/components/case.tsx",
        code: `export const add = (a: number, b: number) => a + b;
`,
        errors: [{ message: "`components/` holds only files that render JSX", line: 1, column: 1 }],
      },
      {
        name: "a hook with no jsx",
        filename: "src/components/case.tsx",
        code: `import { useState } from "react";

export default function useToggle(initial: boolean) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(!on)] as const;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a type-only module is not a barrel",
        filename: "src/components/case.tsx",
        code: `export interface PriceProps {
  amount: number;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a barrel with one declaration at the end",
        filename: "src/components/case.tsx",
        code: `export * from "./price-row";
export { default as Icons } from "./icons";
export const VERSION = "1.0.0";
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a barrel with one statement at the start",
        filename: "src/components/case.tsx",
        code: `console.log("loaded");
export * from "./price-row";
export { default as Icons } from "./icons";
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a file full of offending statements still reports once",
        filename: "src/components/case.tsx",
        code: `const a = 1;
const b = 2;

export const sum = a + b;

export function twice(value: number) {
  return value * 2;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
    ],
  },
  "hoist-intl": {
    valid: [
      {
        name: "a formatter hoisted to module scope",
        code: `const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const PriceRow = ({ amount }: { amount: number }) => <span>{currencyFormatter.format(amount)}</span>;
`,
      },
      {
        name: "a formatter inside a useMemo that renders jsx",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside a React.useMemo that renders jsx",
        code: `import * as React from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return React.useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside a useCallback that renders jsx",
        code: `import { useCallback } from "react";

export const PriceList = ({ locale }: { locale: string }) => {
  const renderRow = useCallback(
    (row: number) => <li>{new Intl.NumberFormat(locale).format(row)}</li>,
    [locale]
  );
  return <ul>{[1, 2].map(renderRow)}</ul>;
};
`,
      },
      {
        name: "a formatter nested two calls deep inside a useMemo that renders jsx",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return useMemo(
    () => <span>{[new Intl.NumberFormat(locale)].map(one => one.format(amount)).join("")}</span>,
    [amount, locale]
  );
};
`,
      },
      {
        name: "a module-level helper in a file that renders jsx",
        code: `const formatPrice = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatPrice(amount)}</span>;
`,
      },
      {
        name: "a formatter in a function that renders nothing",
        code: `export const formatPrice = (value: number) => {
  const formatter = new Intl.NumberFormat("en-US");
  return formatter.format(value);
};

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatPrice(amount)}</span>;
`,
      },
      {
        name: "a namespaced Intl is a different object",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new globalThis.Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "a lookalike namespace is not Intl",
        code: `import { IntlPolyfill } from "./intl-polyfill";

export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new IntlPolyfill.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "calling Intl.NumberFormat without new is not a construction",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "useMemo reached through an object still counts as the memo hook",
        code: `import * as hooks from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return hooks.useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside an object at module scope",
        code: `export const formatters = { price: new Intl.NumberFormat("en-US") };

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatters.price.format(amount)}</span>;
`,
      },
    ],
    invalid: [
      {
        name: "a formatter in an inner helper of a component",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const format = (value: number) => new Intl.NumberFormat("en-US").format(value);
  return <span>{format(amount)}</span>;
};
`,
        errors: 1,
      },
      {
        name: "a formatter inside a useEffect of a component",
        code: `import { useEffect } from "react";

export const PriceRow = ({ amount }: { amount: number }) => {
  useEffect(() => {
    const formatter = new Intl.NumberFormat("en-US");
    console.log(formatter.format(amount));
  }, [amount]);
  return <span>{amount}</span>;
};
`,
        errors: [{ line: 5, column: 23 }],
      },
      {
        name: "a formatter built in the body of a component",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 2, column: 21 }],
      },
      {
        name: "a component whose only jsx is a fragment",
        code: `export function PriceRow({ amount }: { amount: number }) {
  const formatter = new Intl.DateTimeFormat("en-US");
  return <>{formatter.format(amount)}</>;
}
`,
        errors: [{ message: "wrap it in `useMemo` keyed on the locale", line: 2, column: 21 }],
      },
      {
        name: "a class render method",
        code: `import { Component } from "react";

export class PriceRow extends Component<{ amount: number }> {
  render() {
    const formatter = new Intl.NumberFormat("en-US");
    return <span>{formatter.format(this.props.amount)}</span>;
  }
}
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 5, column: 23 }],
      },
      {
        name: "a bare constructor before the Intl one is not a member expression",
        code: `export const Clock = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US");
  return <time>{formatter.format(now)}</time>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 3, column: 21 }],
      },
      {
        name: "a wrapping call that is not a memo hook",
        code: `import { cache } from "./cache";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const formatter = cache(new Intl.NumberFormat(locale));
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 27 }],
      },
      {
        name: "a lookalike memo hook does not exempt the call",
        code: `import { useShallowMemo } from "./hooks";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const formatter = useShallowMemo(new Intl.NumberFormat(locale), [locale]);
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 36 }],
      },
      {
        name: "an inner render callback that renders jsx of its own",
        code: `export const PriceList = ({ rows }: { rows: number[] }) => (
  <ul>
    {rows.map(row => {
      const formatter = new Intl.NumberFormat("en-US");
      return <li key={row}>{formatter.format(row)}</li>;
    })}
  </ul>
);
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 25 }],
      },
      {
        name: "two formatters in one component report twice",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const percent = new Intl.NumberFormat("en-US", { style: "percent" });
  return (
    <span>
      {currency.format(amount)} {percent.format(amount)}
    </span>
  );
};
`,
        errors: [
          { message: "Move this `Intl` formatter to module scope", line: 2, column: 20 },
          { message: "Move this `Intl` formatter to module scope", line: 3, column: 19 },
        ],
      },
      {
        name: "a memo hook elsewhere in the component does not cover a bare construction",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const label = useMemo(() => locale.toUpperCase(), [locale]);
  const formatter = new Intl.NumberFormat(locale);
  return <span>{label}: {formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 5, column: 21 }],
      },
    ],
  },
  "prefer-design-system": {
    valid: [
      {
        name: "no options and no design-system directory to scan",
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "an empty options object still finds nothing to ban",
        options: {},
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "an empty use map bans nothing",
        options: { use: {} },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      wrapper("ds", "pressable.tsx"),
      {
        name: "a banned name imported from another module",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import { TouchableOpacity } from "react-native-web";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "default and namespace imports are not named specifiers",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import ReactNative, * as RN from "react-native";

export const Button = ReactNative ?? RN;
`,
      },
      {
        name: "an unwrapped primitive from the same module",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import { View, Text } from "react-native";

export const Button = View ?? Text;
`,
      },
      wrapper("ds-no-tsx", "views.ts"),
      {
        name: "a directory holding no tsx file bans nothing",
        bucket: "ds-no-tsx",
        options: { dir: WRAPPER_DIR },
        code: `import { View } from "react-native";

export const Panel = View;
`,
      },
      wrapper("ds-barrel", "index.tsx"),
      {
        name: "a barrel never becomes a wrapped component named Index",
        bucket: "ds-barrel",
        options: { dir: WRAPPER_DIR },
        code: `import { Index } from "react-native";

export const Entry = Index;
`,
      },
      wrapper("ds-platform", "pressable.mobile.tsx"),
      {
        name: "only ios android native and web are stripped as platform suffixes",
        bucket: "ds-platform",
        options: { dir: WRAPPER_DIR },
        code: `import { Pressable } from "react-native";

export const Button = Pressable;
`,
      },
      wrapper("ds-legacy", "button.tsx"),
      {
        name: "legacy equivalents are attached to Pressable only",
        bucket: "ds-legacy",
        options: { dir: WRAPPER_DIR },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      wrapper("ds-exempt", "pressable.tsx", { dir: WRAPPER_DIR, exempt: ["legacy-screen"] }),
      {
        name: "an exempt fragment skips a file outside the design system",
        bucket: "ds-exempt",
        options: { dir: WRAPPER_DIR, exempt: ["legacy-screen"] },
        filename: "../../screens/legacy-screen.tsx",
        code: `import { Pressable } from "react-native";

export const Button = Pressable;
`,
      },
      {
        name: "the alias exempts the wrappers when no dir is set",
        options: { alias: "@/components/ui", use: { Card: "View" } },
        filename: "../../components/ui/card.tsx",
        code: `import { View } from "react-native";

export const Card = View;
`,
      },
      {
        name: "a wrapper named by an explicit path is exempt too",
        options: { use: { Sheet: { replaces: "Modal", path: "@/ui/sheet" } } },
        filename: "../../ui/sheet.tsx",
        code: `import { Modal } from "react-native";

export const Sheet = Modal;
`,
      },
      {
        name: "importing the wrapper itself",
        options: { use: { Card: "View" } },
        code: `import { Card } from "@/components/ui/card";

export const Panel = Card;
`,
      },
      {
        name: "a use entry whose replaced name is never imported",
        options: { use: { Card: "View" } },
        code: `import { Text } from "react-native";

export const Label = Text;
`,
      },
      {
        name: "an absolute directory scans only the wrappers it holds",
        options: { dir: ABSOLUTE_DESIGN_SYSTEM },
        code: `import { View, ScrollView } from "react-native";

export const Panel = View ?? ScrollView;
`,
      },
      {
        name: "a use entry whose source module nothing imports from",
        options: { use: { Icon: { replaces: "Feather", from: "@expo/vector-icons" } } },
        code: `import { Feather } from "react-native";

export const Glyph = Feather;
`,
      },
      wrapper("ds-empty-exempt", "pressable.tsx", { dir: WRAPPER_DIR, exempt: [] }),
      wrapper("ds-ios", "pressable.ios.tsx"),
      wrapper("ds-kebab", "date-picker.tsx"),
      wrapper("ds-dashes", "-date--picker-.tsx"),
      wrapper("ds-alias", "pressable.tsx", { dir: WRAPPER_DIR, alias: "~/uikit" }),
      wrapper("ds-use-override", "pressable.tsx", {
        dir: WRAPPER_DIR,
        use: { Touchable: { replaces: "TouchableOpacity", path: "~/ui/touchable" } },
      }),
    ],
    invalid: [
      {
        name: "a scanned wrapper bans the primitive it wraps",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import { Pressable } from "react-native";

export const Button = Pressable;
`,
        errors: [
          {
            message: 'Import `Pressable` from "@/components/ui/pressable" instead of `Pressable` from react-native.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "every legacy touchable maps to the Pressable wrapper",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import {
  View,
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";

export const all = [
  View,
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
];
`,
        errors: [
          { message: "instead of `Pressable` from react-native", line: 3, column: 3 },
          { message: "instead of `TouchableHighlight` from react-native", line: 4, column: 3 },
          { message: "instead of `TouchableNativeFeedback` from react-native", line: 5, column: 3 },
          { message: "instead of `TouchableOpacity` from react-native", line: 6, column: 3 },
          { message: "instead of `TouchableWithoutFeedback` from react-native", line: 7, column: 3 },
        ],
      },
      {
        name: "a default specifier ahead of a banned named specifier",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import ReactNative, { Pressable } from "react-native";

export const all = [ReactNative, Pressable];
`,
        errors: [{ message: "instead of `Pressable` from react-native", line: 1, column: 23 }],
      },
      {
        name: "a string-literal import name ahead of a banned named specifier",
        bucket: "ds",
        options: { dir: WRAPPER_DIR },
        code: `import { "Pressable" as Aliased, TouchableOpacity } from "react-native";

export const all = [Aliased, TouchableOpacity];
`,
        errors: [{ message: "instead of `TouchableOpacity` from react-native", line: 1, column: 34 }],
      },
      {
        name: "a directory of several files bans every tsx wrapper in it",
        options: { dir: join(ABSOLUTE_DESIGN_SYSTEM, "..") },
        code: `import { Good, Bad } from "react-native";

export const all = [Good, Bad];
`,
        errors: [
          { message: 'Import `Good` from "@/components/ui/good" instead of `Good`', line: 1, column: 10 },
          { message: 'Import `Bad` from "@/components/ui/bad" instead of `Bad`', line: 1, column: 16 },
        ],
      },
      {
        name: "a platform-suffixed wrapper resolves to the base name",
        bucket: "ds-ios",
        options: { dir: WRAPPER_DIR },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "@/components/ui/pressable"', line: 1, column: 10 }],
      },
      {
        name: "a kebab-cased filename becomes a PascalCase component",
        bucket: "ds-kebab",
        options: { dir: WRAPPER_DIR },
        code: `import { DatePicker } from "react-native";

export const Picker = DatePicker;
`,
        errors: [{ message: 'Import `DatePicker` from "@/components/ui/date-picker"', line: 1, column: 10 }],
      },
      {
        name: "empty segments in a filename are dropped",
        bucket: "ds-dashes",
        options: { dir: WRAPPER_DIR },
        code: `import { DatePicker } from "react-native";

export const Picker = DatePicker;
`,
        errors: [{ message: 'Import `DatePicker` from "@/components/ui/-date--picker-"', line: 1, column: 10 }],
      },
      {
        name: "an alias changes where the wrapper is imported from",
        bucket: "ds-alias",
        options: { dir: WRAPPER_DIR, alias: "~/uikit" },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "~/uikit/pressable"', line: 1, column: 10 }],
      },
      {
        name: "an empty exempt list adds nothing to skip",
        bucket: "ds-empty-exempt",
        options: { dir: WRAPPER_DIR, exempt: [] },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "@/components/ui/pressable"', line: 1, column: 10 }],
      },
      {
        name: "an absolute design-system directory is scanned where it stands",
        options: { dir: ABSOLUTE_DESIGN_SYSTEM },
        code: `import { Text } from "react-native";

export const Label = Text;
`,
        errors: [
          {
            message: 'Import `Text` from "@/components/ui/text" instead of `Text` from react-native',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry given as a single name",
        options: { use: { Card: "View" } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [
          {
            message: 'Import `Card` from "@/components/ui/card" instead of `View` from react-native.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry given as a list of names",
        options: { use: { Stack: ["View", "ScrollView"] } },
        code: `import { View, ScrollView, Text } from "react-native";

export const all = [View, ScrollView, Text];
`,
        errors: [
          { message: 'Import `Stack` from "@/components/ui/stack" instead of `View`', line: 1, column: 10 },
          { message: 'Import `Stack` from "@/components/ui/stack" instead of `ScrollView`', line: 1, column: 16 },
        ],
      },
      {
        name: "a use entry that names its own source module",
        options: { use: { Icon: { replaces: "Feather", from: "@expo/vector-icons" } } },
        code: `import { Feather } from "@expo/vector-icons";
import { Feather as RNFeather } from "react-native";

export const all = [Feather, RNFeather];
`,
        errors: [
          {
            message: 'Import `Icon` from "@/components/ui/icon" instead of `Feather` from @expo/vector-icons',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry with an explicit path and a reason",
        options: { use: { Button: { replaces: "Button", path: "~/ui/button", reason: "It carries the haptics." } } },
        code: `import { Button } from "react-native";

export const Cta = Button;
`,
        errors: [
          {
            message:
              'Import `Button` from "~/ui/button" instead of `Button` from react-native. It carries the haptics.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry without a reason ends at the wrapper sentence",
        options: { use: { Card: { replaces: "View" } } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [{ message: /react-native\.$/, line: 1, column: 10 }],
      },
      {
        name: "a kebab-cased path is derived from the component name",
        options: { use: { DatePicker2Row: "View" } },
        code: `import { View } from "react-native";

export const Picker = View;
`,
        errors: [{ message: 'Import `DatePicker2Row` from "@/components/ui/date-picker2-row"', line: 1, column: 10 }],
      },
      {
        name: "the alias also feeds the derived path of a use entry",
        options: { alias: "~/uikit", use: { Card: "View" } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [{ message: 'Import `Card` from "~/uikit/card"', line: 1, column: 10 }],
      },
      {
        name: "a renamed import still reports under its original name",
        options: { use: { Card: "View" } },
        code: `import { View as Box } from "react-native";

export const Panel = Box;
`,
        errors: [{ message: "instead of `View` from react-native", line: 1, column: 10 }],
      },
      {
        name: "a use entry overrides a scanned wrapper for the same primitive",
        bucket: "ds-use-override",
        options: {
          dir: WRAPPER_DIR,
          use: { Touchable: { replaces: "TouchableOpacity", path: "~/ui/touchable" } },
        },
        code: `import { Pressable, TouchableOpacity } from "react-native";

export const all = [Pressable, TouchableOpacity];
`,
        errors: [
          {
            message: 'Import `Pressable` from "@/components/ui/pressable" instead of `Pressable`',
            line: 1,
            column: 10,
          },
          { message: 'Import `Touchable` from "~/ui/touchable" instead of `TouchableOpacity`', line: 1, column: 21 },
        ],
      },
    ],
  },
});
