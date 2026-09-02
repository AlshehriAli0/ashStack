import reactWeb from "../packages/lint/dist/react/rules/react/index.js";
import { moduleTests } from "./harness.js";

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
});
