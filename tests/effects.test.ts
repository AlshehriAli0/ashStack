import { describe, expect, it } from "bun:test";

import { EFFECT_NAMESPACE, EFFECT_SPECIFIER } from "../packages/lint/dist/lib/effect-plugin.js";
import reactNative from "../packages/lint/dist/react-native/index.js";
import react from "../packages/lint/dist/react/index.js";
import { codesFrom } from "./harness.js";

/** State set in a handler and acted on in an effect: what `no-event-handler` is for. */
const EFFECT_AS_HANDLER = `import { useEffect, useState } from "react";

declare const post: (payload: string) => void;

export const Form = ({ payload }: { payload: string }) => {
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted) {
      post(payload);
      setSubmitted(false);
    }
  }, [submitted, payload]);
  return <button type="button" onClick={() => setSubmitted(true)} />;
};
`;

const effectIdsIn = (rules: Record<string, unknown>): string[] =>
  Object.keys(rules).filter(id => id.startsWith(`${EFFECT_NAMESPACE}/`));

const vendoredIds = async (): Promise<string[]> => {
  const loaded: unknown = await import(EFFECT_SPECIFIER);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const plugin = loaded as { default?: { rules?: Record<string, unknown> } };
  return Object.keys(plugin.default?.rules ?? {}).map(name => `${EFFECT_NAMESPACE}/${name}`);
};

describe("the effect rules an entry settles on", () => {
  it("names only rules the vendored plugin actually has", async () => {
    const known = new Set(await vendoredIds());
    for (const id of [...effectIdsIn(react().rules ?? {}), ...effectIdsIn(reactNative().rules ?? {})]) {
      expect([...known]).toContain(id);
    }
  });

  it("reports an effect used as an event handler on the web", async () => {
    const codes = await codesFrom(react(), EFFECT_AS_HANDLER);
    expect(codes).toContain(`${EFFECT_NAMESPACE}(no-event-handler)`);
  });

  it("stays quiet about it on React Native, where gestures and animations need the pattern", async () => {
    const codes = await codesFrom(reactNative(), EFFECT_AS_HANDLER);
    expect(codes).not.toContain(`${EFFECT_NAMESPACE}(no-event-handler)`);
  });

  it("still runs the rest of the plugin on React Native", async () => {
    const codes = await codesFrom(reactNative(), EFFECT_AS_HANDLER);
    expect(codes).toContain(`${EFFECT_NAMESPACE}(no-chain-state-updates)`);
  });
});
