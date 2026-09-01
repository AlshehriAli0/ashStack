import zustand from "../packages/lint/dist/react/rules/zustand/index.js";
import { moduleTests } from "./harness.js";

moduleTests(zustand, {
  "require-selector": {
    valid: [
      {
        name: "a selector narrows the subscription",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

export const ThemeBadge = () => {
  const theme = useSettingsStore(state => state.theme);
  return <Badge tone={theme} />;
};
`,
      },
      {
        name: "an imperative read through getState",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

export const currentTheme = () => useSettingsStore.getState().theme;
`,
      },
      {
        name: "a named selector function",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

const theme = useSettingsStore(selectTheme);
`,
      },
      {
        name: "undefined plus a second argument falls outside the single-argument check",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

const state = useSettingsStore(undefined, shallow);
`,
      },
      {
        name: "void 0 is not the undefined identifier",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

const state = useSettingsStore(void 0);
`,
      },
      {
        name: "a store created in the file is not imported from a store module",
        code: `
import { create } from "zustand";

export const useSettingsStore = create(set => ({ theme: "light" }));

const state = useSettingsStore();
`,
      },
      {
        name: "a singular stores segment does not match",
        code: `
import { useSettingsStore } from "@/store/settings-store";

const state = useSettingsStore();
`,
      },
      {
        name: "the module must end in -store",
        code: `
import { useSettingsStore } from "@/stores/settings";

const state = useSettingsStore();
`,
      },
      {
        name: "an extension after -store does not match",
        code: `
import { useSettingsStore } from "@/stores/settings-store.ts";

const state = useSettingsStore();
`,
      },
      {
        name: "a bare relative segment without the leading dot does not match",
        code: `
import { useSettingsStore } from "stores/settings-store";

const state = useSettingsStore();
`,
      },
      {
        name: "an imported name that is not hook-shaped",
        code: `
import { shallow } from "@/stores/settings-store";

const state = shallow();
`,
      },
      {
        name: "the name must end in Store, not Storage",
        code: `
import { useSettingsStorage } from "@/stores/settings-store";

const state = useSettingsStorage();
`,
      },
      {
        name: "a string literal import name reads as no imported name",
        code: `
import { "useSettingsStore" as bound } from "@/stores/settings-store";

const state = bound();
`,
      },
      {
        name: "a default import is not a named specifier",
        code: `
import useSettingsStore from "@/stores/settings-store";

const state = useSettingsStore();
`,
      },
      {
        name: "a namespace import leaves the callee a member expression",
        code: `
import * as stores from "@/stores/settings-store";

const state = stores.useSettingsStore();
`,
      },
      {
        name: "a hook-shaped name that was never imported from a store module",
        code: `
import { useThemeStore } from "./theme-hooks";

const state = useThemeStore();
`,
      },
      {
        name: "documents current behaviour: an alias that is not hook-shaped is missed when called above its import",
        code: `
const settings = useSettings();

import { useSettingsStore as useSettings } from "@/stores/settings-store";
`,
      },
    ],
    invalid: [
      {
        name: "no arguments at all",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

export const ThemeBadge = () => {
  const store = useSettingsStore();
  return <Badge tone={store.theme} />;
};
`,
        errors: [{ message: "Pass a selector to this store hook", line: 5, column: 17 }],
      },
      {
        name: "undefined in the selector slot gets its own message",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

const state = useSettingsStore(undefined);
`,
        errors: [{ message: "Replace `undefined` with a selector", line: 4, column: 15 }],
      },
      {
        name: "a sibling relative path",
        code: `
import { useSettingsStore } from "./stores/settings-store";

const state = useSettingsStore();
`,
        errors: 1,
      },
      {
        name: "a parent relative path",
        code: `
import { useSettingsStore } from "../stores/settings-store";

const state = useSettingsStore();
`,
        errors: 1,
      },
      {
        name: "a doubled parent relative path",
        code: `
import { useSettingsStore } from "../../stores/settings-store";

const state = useSettingsStore();
`,
        errors: 1,
      },
      {
        name: "a nested folder under stores",
        code: `
import { useSessionStore } from "@/stores/user/session-store";

const state = useSessionStore();
`,
        errors: 1,
      },
      {
        name: "an alias is tracked through the imported name",
        code: `
import { useSettingsStore as settings } from "@/stores/settings-store";

const state = settings();
`,
        errors: 1,
      },
      {
        name: "an alias is tracked through the local name",
        code: `
import { create as useThingStore } from "@/stores/thing-store";

const state = useThingStore();
`,
        errors: 1,
      },
      {
        name: "useStore with nothing between use and Store",
        code: `
import { useStore } from "@/stores/root-store";

const state = useStore();
`,
        errors: 1,
      },
      {
        name: "the name charset allows digits, underscores and dollars",
        code: `
import { use_app2$Store } from "@/stores/app-store";

const state = use_app2$Store();
`,
        errors: 1,
      },
      {
        name: "a hook-shaped call above its own import is still collected",
        code: `
const state = useSettingsStore();

import { useSettingsStore } from "@/stores/settings-store";
`,
        errors: [{ line: 2, column: 15 }],
      },
      {
        name: "two offending calls report in source order with their own messages",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

export const Screen = () => {
  const store = useSettingsStore();
  const other = useSettingsStore(undefined);
  return <Badge tone={store.theme} count={other.count} />;
};
`,
        errors: [
          { message: "Pass a selector to this store hook", line: 5, column: 17 },
          { message: "Replace `undefined` with a selector", line: 6, column: 17 },
        ],
      },
      {
        name: "one import, one offending call and one correct call",
        code: `
import { useSettingsStore } from "@/stores/settings-store";

const theme = useSettingsStore(state => state.theme);
const store = useSettingsStore();
`,
        errors: [{ line: 5, column: 15 }],
      },
    ],
  },
});
