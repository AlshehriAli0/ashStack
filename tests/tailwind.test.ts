import tailwind from "../packages/lint/dist/react/rules/tailwind/index.js";
import { moduleTests } from "./harness.js";

moduleTests(tailwind, {
  "prefer-cn": {
    valid: [
      {
        name: "a static class string",
        code: `export const Chip = () => <span className="px-2 py-1 text-sm" />;\n`,
      },
      {
        name: "cn composes the conditional parts",
        code: `declare const cn: (...values: unknown[]) => string;
declare const active: boolean;

export const Chip = () => <span className={cn("px-2", active && "bg-black")} />;
`,
      },
      {
        name: "a template literal with no holes",
        code: `export const Chip = () => <span className={\`px-2 py-1\`} />;\n`,
      },
      {
        name: "a plain identifier that is not a class binding and not dynamic",
        code: `declare const preset: string;

export const Chip = () => <span className={preset} />;
`,
      },
      {
        name: "a class binding already built with cn",
        code: `declare const cn: (...values: unknown[]) => string;
declare const active: boolean;

export const Chip = () => {
  const chipClasses = cn("px-2", active && "bg-black");
  return <span className={chipClasses} />;
};
`,
      },
      {
        name: "a call through a computed member is not a join",
        code: `declare const helpers: Record<string, () => string>;

export const Chip = () => <span className={helpers["build"]()} />;
`,
      },
      {
        name: "a method call that is not a join",
        code: `declare const theme: { build: () => string };

export const Chip = () => <span className={theme.build()} />;
`,
      },
      {
        name: "a curried call is not a composer",
        code: `declare const make: () => () => string;

export const Chip = () => <span className={make()()} />;
`,
      },
      {
        name: "a destructured declaration is not a class binding",
        code: `declare const theme: { chipClasses: string };

export const Chip = () => {
  const { chipClasses } = theme;
  return <span className={chipClasses} />;
};
`,
      },
      {
        name: "a dynamic value on a prop that is not a class prop",
        code: `declare const active: boolean;

export const Chip = () => <span title={active ? "on" : "off"} />;
`,
      },
    ],
    invalid: [
      {
        name: "a template literal with a hole on className",
        code: `declare const active: boolean;

export const Chip = () => <span className={\`px-2 \${active ? "bg-black" : "bg-white"}\`} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 3, column: 33 }],
      },
      {
        name: "a ternary on class",
        code: `declare const active: boolean;

export const Chip = () => <span class={active ? "bg-black" : "bg-white"} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 3 }],
      },
      {
        name: "logical and on a *ClassName prop",
        code: `declare const active: boolean;

export const Chip = () => <span wrapperClassName={active && "bg-black"} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 3 }],
      },
      {
        name: "string concatenation",
        code: `declare const size: string;

export const Chip = () => <span className={"px-2 " + size} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 3 }],
      },
      {
        name: "a join call",
        code: `declare const parts: string[];

export const Chip = () => <span className={parts.join(" ")} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 3 }],
      },
      {
        name: "clsx is a composer, but not the one this project uses",
        code: `declare const clsx: (...values: unknown[]) => string;
declare const active: boolean;

export const Chip = () => <span className={clsx("px-2", active && "bg-black")} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 4 }],
      },
      {
        name: "an alias imported from clsx",
        code: `import { clsx as classes } from "clsx";

declare const active: boolean;

export const Chip = () => <span className={classes("px-2", active && "bg-black")} />;
`,
        errors: [{ message: "Wrap this class value in `cn(...)`", line: 5 }],
      },
      {
        name: "a precomputed variable passed to a class prop",
        code: `declare const active: boolean;

export const Chip = () => {
  const style = active ? "bg-black" : "bg-white";
  return <span className={style} />;
};
`,
        errors: [{ message: "Wrap this value in `cn(...)` where it reaches the class prop", line: 5 }],
      },
      {
        name: "a declaration named after styles reports where it is declared",
        code: `declare const active: boolean;

export const Chip = () => {
  const rowStyles = active ? "bg-black" : "bg-white";
  return <span className={rowStyles} />;
};
`,
        errors: [{ message: "Build this class value with `cn(...)`", line: 4 }],
      },
      {
        name: "a declaration named after classes reports where it is declared",
        code: `declare const active: boolean;
declare const size: string;

export const chipClasses = [size, active && "ring-2"].join(" ");
`,
        errors: [{ message: "Build this class value with `cn(...)`", line: 4 }],
      },
      {
        name: "a class-named declaration reports once, not again at the attribute",
        code: `declare const active: boolean;

export const Chip = () => {
  const chipClassName = active ? "bg-black" : "bg-white";
  return <span className={chipClassName} />;
};
`,
        errors: [{ message: "Build this class value with `cn(...)`", line: 4 }],
      },
    ],
  },

  "use-logical-classes": {
    valid: [
      {
        name: "logical utilities throughout",
        code: `export const Row = () => <div className="ms-2 pe-4 text-start border-e rounded-ss" />;\n`,
      },
      {
        name: "a file with no physical utility skips every literal",
        code: `export const Row = () => <div className="flex items-center gap-2 p-4" />;\n`,
      },
      {
        name: "a word that merely contains a physical name",
        code: `export const Row = () => <div className="scroll-smooth overflow-x-auto" />;\n`,
      },
      {
        name: "start and end insets",
        code: `export const Row = () => <div className="start-0 end-4" />;\n`,
      },
      {
        name: "English prose that happens to read like a utility",
        code: `export const label = "right-hand rule applies";\n`,
      },
      {
        name: "more prose, on the other side",
        code: `export const note = "left-over items remain";\n`,
      },
      {
        name: "a physical name on a prop that carries no classes",
        code: `export const Row = () => <div title="ml-2 is the old way" />;\n`,
      },
    ],
    invalid: [
      {
        name: "ml and text-left",
        code: `export const Row = () => <div className="ml-2 text-left" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1, column: 41 }],
      },
      {
        name: "a variant prefix does not hide it",
        code: `export const Row = () => <div className="md:hover:pr-4" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "the important modifier does not hide it",
        code: `export const Row = () => <div className="!ml-2" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "a negative margin does not hide it",
        code: `export const Row = () => <div className="-mr-2" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "a bare border side with no value",
        code: `export const Row = () => <div className="border-l" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "rounded corners",
        code: `export const Row = () => <div className="rounded-br-lg" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "float and clear",
        code: `export const Row = () => <div className="float-right clear-left" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "scroll margin and padding sides",
        code: `export const Row = () => <div className="scroll-ml-4 scroll-pr-2" />;\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1 }],
      },
      {
        name: "inside a template literal quasi",
        code: `declare const active: boolean;

export const Row = () => <div className={\`ml-2 \${active ? "" : ""}\`} />;
`,
        errors: [{ message: "Swap this for its logical twin", line: 3 }],
      },
      {
        name: "a class string held in a variable",
        code: `export const rowStyles = "pl-2 right-0";\n`,
        errors: [{ message: "Swap this for its logical twin", line: 1, column: 26 }],
      },
      {
        name: "inside a cn call on a class prop",
        code: `declare const cn: (...values: unknown[]) => string;
declare const active: boolean;

export const Row = () => <div className={cn("ml-2", active && "pr-4")} />;
`,
        errors: [
          { message: "Swap this for its logical twin", line: 4, column: 45 },
          { message: "Swap this for its logical twin", line: 4 },
        ],
      },
      {
        name: "a class-named binding built by hand",
        code: `declare const active: boolean;

export const rowClasses = active ? "text-left" : "text-center";
`,
        errors: [{ message: "Swap this for its logical twin", line: 3 }],
      },
    ],
  },
});
