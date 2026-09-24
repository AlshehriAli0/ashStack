import { expect, it } from "bun:test";

import { STYLEX_RULES, STYLEX_SPECIFIER } from "../packages/lint/dist/lib/stylex-plugin.js";
import react from "../packages/lint/dist/react/index.js";
import { codesFrom } from "./harness.js";

it("only enables rules present in the vendored StyleX plugin", async () => {
  const loaded: unknown = await import(STYLEX_SPECIFIER);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const plugin = loaded as { default: { rules: Record<string, unknown> } };
  const available = new Set(Object.keys(plugin.default.rules).map(rule => `@stylexjs/${rule}`));
  for (const rule of Object.keys(STYLEX_RULES)) expect(available.has(rule)).toBe(true);
});

it("runs every enabled official rule on a representative violation", async () => {
  const examples: Record<string, string> = {
    "valid-styles": "const styles = stylex.create({ box: { bogusProperty: 1 } });",
    "valid-shorthands": 'const styles = stylex.create({ box: { margin: "1px 2px" } });',
    "no-unused":
      "const styles = stylex.create({ used: { padding: 4 }, unused: { padding: 8 } }); console.log(styles.used);",
    "enforce-extension": 'export const colors = stylex.defineVars({ text: "red" });',
    "no-legacy-contextual-styles": 'const styles = stylex.create({ box: { ":hover": { color: "red" } } });',
    "no-nonstandard-styles": 'const styles = stylex.create({ box: { float: "start" } });',
  };
  const config = react({ stylex: true });
  await Promise.all(
    Object.entries(examples).map(async ([rule, source]) => {
      const codes = await codesFrom(config, `import * as stylex from "@stylexjs/stylex"; ${source}`);
      expect(codes).toContain(`@stylexjs(${rule})`);
    })
  );
});

it("accepts static token mixes and semantic style aliases by default", async () => {
  const codes = await codesFrom(
    react({ stylex: true }),
    `import * as stylex from "@stylexjs/stylex";
import { colors } from "./theme.stylex";
export const styles = stylex.create({
  active: { color: \`color-mix(in oklab, \${colors.primary} 10%, transparent)\` },
  selected: { color: \`color-mix(in oklab, \${colors.primary} 10%, transparent)\` },
});`
  );
  expect(codes.filter(code => code.includes("stylex"))).toEqual([]);
});
