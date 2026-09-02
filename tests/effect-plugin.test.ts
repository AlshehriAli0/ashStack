import { describe, expect, it } from "bun:test";

import { EFFECT_NAMESPACE, EFFECT_RULES, EFFECT_SPECIFIER } from "../packages/lint/dist/lib/effect-plugin.js";

// why: vendoring makes an update a file copy, which no lockfile checks
describe("the vendored effect plugin", () => {
  it("exports exactly the rules this package enables", async () => {
    const loaded: unknown = await import(EFFECT_SPECIFIER);
    const plugin = (loaded as { default?: { rules?: Record<string, unknown> } }).default;
    const vendored = Object.keys(plugin?.rules ?? {}).sort();
    const enabled = Object.keys(EFFECT_RULES)
      .map(id => id.replace(`${EFFECT_NAMESPACE}/`, ""))
      .sort();
    expect(vendored).toEqual(enabled);
  });

  it("resolves to a file that is actually there", async () => {
    expect(await Bun.file(EFFECT_SPECIFIER).exists()).toBe(true);
  });
});
