import legendState from "../packages/lint/dist/react-native/rules/legend-state/index.js";
import { moduleTests } from "./harness.js";

moduleTests(legendState, {
  naming: {
    valid: [
      {
        name: "trailing dollar on an observable store",
        code: `import { observable } from "@legendapp/state";

export const settings$ = observable({ theme: "dark", fontScale: 1 });
`,
      },
      {
        name: "trailing dollar on a useObservable binding",
        code: `import { useObservable } from "@legendapp/state/react";

export const useDraft = () => {
  const draft$ = useObservable({ title: "" });
  return draft$;
};
`,
      },
      {
        name: "a name that is only a dollar sign already ends with one",
        code: `import { observable } from "@legendapp/state";

export const $ = observable({ user: null });
`,
      },
      {
        name: "two trailing dollars still end with a dollar",
        code: `import { observable } from "@legendapp/state";

export const settings$$ = observable({ theme: "dark" });
`,
      },
      {
        name: "destructuring an object pattern is not an Identifier binding",
        code: `import { observable } from "@legendapp/state";

const { theme } = observable({ theme: "dark" });
export { theme };
`,
      },
      {
        name: "destructuring an array pattern is not an Identifier binding",
        code: `import { observable } from "@legendapp/state";

const [first] = observable(["a", "b"]);
export { first };
`,
      },
      {
        name: "initializer is a reference, not a factory call",
        code: `import { observable } from "@legendapp/state";

export const store$ = observable({ count: 0 });
const alias = store$;
export { alias };
`,
      },
      {
        name: "factory reached through a member expression is not the bare factory",
        code: `import { store } from "../stores/root";

export const counter = store.observable({ count: 0 });
`,
      },
      {
        name: "a renamed factory import is not recognised as a factory",
        code: `import { observable, observable as obs } from "@legendapp/state";

export const store$ = observable({ count: 0 });
export const counter = obs(0);
`,
      },
      {
        name: "a different factory with a similar name",
        code: `import { observable } from "@legendapp/state";
import { signal } from "../lib/signal";

export const store$ = observable({ count: 0 });
export const counter = signal(0);
`,
      },
      {
        name: "useObservableX is not useObservable",
        code: `import { useObservable } from "@legendapp/state/react";
import { useObservableState } from "../hooks/use-observable-state";

export const useDraft = () => {
  const draft$ = useObservable({ title: "" });
  const legacy = useObservableState({ title: "" });
  return [draft$, legacy];
};
`,
      },
      {
        name: "documents current behaviour: a class field initialized from observable() is never checked",
        code: `import { observable } from "@legendapp/state";

export class Session {
  user = observable({ id: null });
}
`,
      },
      {
        name: "documents current behaviour: a parameter default is not a VariableDeclarator",
        code: `import { observable } from "@legendapp/state";

export const makeStore = (seed = observable({ count: 0 })) => seed;
`,
      },
      {
        name: "documents current behaviour: assignment after declaration is not a VariableDeclarator init",
        code: `import { observable } from "@legendapp/state";

let counter;
counter = observable({ count: 0 });
export { counter };
`,
      },
      {
        name: "a generic factory call is named like any other",
        code: `import { observable } from "@legendapp/state";

interface Settings {
  theme: string;
}

export const settings$ = observable<Settings>({ theme: "dark" });
`,
      },
    ],
    invalid: [
      {
        name: "observable() bound to a plain name",
        code: `import { observable } from "@legendapp/state";

export const settings = observable({ theme: "dark" });
`,
        errors: [{ message: "Rename this to `settings$`", line: 3, column: 14 }],
      },
      {
        name: "useObservable() bound to a plain name",
        code: `import { useObservable } from "@legendapp/state/react";

export const useDraft = () => {
  const draft = useObservable({ title: "" });
  return draft;
};
`,
        errors: [{ message: "Rename this to `draft$`", line: 4, column: 9 }],
      },
      {
        name: "a leading dollar is not a trailing dollar",
        code: `import { observable } from "@legendapp/state";

export const $settings = observable({ theme: "dark" });
`,
        errors: [{ message: "Give this observable a single trailing `$` and no other", line: 3, column: 14 }],
      },
      {
        name: "a dollar in the middle is not a trailing dollar",
        code: `import { observable } from "@legendapp/state";

export const set$tings = observable({ theme: "dark" });
`,
        errors: [{ message: "Give this observable a single trailing `$` and no other", line: 3, column: 14 }],
      },
      {
        name: "let binding",
        code: `import { observable } from "@legendapp/state";

let settings = observable({ theme: "dark" });
export { settings };
`,
        errors: [{ line: 3, column: 5 }],
      },
      {
        name: "no arguments still counts as a factory call",
        code: `import { observable } from "@legendapp/state";

export const settings = observable();
`,
        errors: [{ message: "Rename this to `settings$`", line: 3, column: 14 }],
      },
      {
        name: "each declarator in one statement reports separately",
        code: `import { observable } from "@legendapp/state";

export const settings = observable({ theme: "dark" }),
  session = observable({ user: null });
`,
        errors: [
          { message: "`settings$`", line: 3, column: 14 },
          { message: "`session$`", line: 4, column: 3 },
        ],
      },
      {
        name: "a correctly named sibling in the same statement is left alone",
        code: `import { observable } from "@legendapp/state";

export const settings$ = observable({ theme: "dark" }),
  session = observable({ user: null });
`,
        errors: [{ message: "`session$`", line: 4, column: 3 }],
      },
      {
        name: "underscore binding",
        code: `import { observable } from "@legendapp/state";

const _ = observable({ theme: "dark" });
export { _ };
`,
        errors: [{ message: "Rename this to `_$`", line: 3, column: 7 }],
      },
      {
        name: "the same generic call is flagged once a sibling call satisfies the source gate",
        code: `import { observable } from "@legendapp/state";

interface Settings {
  theme: string;
}

export const ready$ = observable(false);
export const settings = observable<Settings>({ theme: "dark" });
`,
        errors: [{ message: "Rename this to `settings$`", line: 8, column: 14 }],
      },
      {
        name: "both factories in one file, in source order",
        code: `import { observable } from "@legendapp/state";
import { useObservable } from "@legendapp/state/react";

export const settings = observable({ theme: "dark" });

export const useDraft = () => {
  const draft = useObservable({ title: "" });
  return draft;
};
`,
        errors: [
          { message: "`settings$`", line: 4, column: 14 },
          { message: "`draft$`", line: 7, column: 9 },
        ],
      },
    ],
  },

  "no-assignment": {
    valid: [
      {
        name: "set() on the observable",
        code: `import { settings$ } from "../stores/settings";

export const setTheme = theme => settings$.theme.set(theme);
`,
      },
      {
        name: "assign() to merge several fields",
        code: `import { settings$ } from "../stores/settings";

export const reset = () => settings$.assign({ theme: "dark", fontScale: 1 });
`,
      },
      {
        name: "declaring an observable is not assigning to one",
        code: `import { observable } from "@legendapp/state";

export const count$ = observable(0);
`,
      },
      {
        name: "assigning to a plain variable in a file that contains a dollar",
        code: `import { count$ } from "../stores/counter";

export const total = () => {
  let running = 0;
  running = count$.get();
  return running;
};
`,
      },
      {
        name: "the chain root has no dollar so the member chain is not an observable ref",
        code: `import { store } from "../stores/root";

export const setTheme = theme => {
  store.settings$ = theme;
};
`,
      },
      {
        name: "a this-rooted chain has no Identifier root",
        code: `export class Session {
  reset() {
    this.count$ = 0;
  }
}
`,
      },
      {
        name: "documents current behaviour: array destructuring assignment is not checked",
        code: `import { count$, total$ } from "../stores/counter";

export const swap = pair => {
  [count$, total$] = pair;
};
`,
      },
      {
        name: "documents current behaviour: object destructuring assignment is not checked",
        code: `import { count$ } from "../stores/counter";

export const load = next => {
  ({ count: count$ } = next);
};
`,
      },
      {
        name: "incrementing a plain variable in a file that contains a dollar",
        code: `import { count$ } from "../stores/counter";

export const nextIndex = () => {
  let index = count$.get();
  index++;
  return index;
};
`,
      },
      {
        name: "a dollar only inside a template literal",
        code: `export const label = count => \`count: \${count}\`;
`,
      },
    ],
    invalid: [
      {
        name: "plain assignment to an observable",
        code: `import { count$ } from "../stores/counter";

export const reset = () => {
  count$ = 0;
};
`,
        errors: [{ message: "Write through `count$.set(...)`", line: 4, column: 3 }],
      },
      {
        name: "assignment to a field of an observable",
        code: `import { settings$ } from "../stores/settings";

export const setTheme = theme => {
  settings$.theme = theme;
};
`,
        errors: [{ message: "`settings$.theme.set(...)`", line: 4, column: 3 }],
      },
      {
        name: "assignment deep in an observable chain quotes the whole chain",
        code: `import { settings$ } from "../stores/settings";

export const setColor = color => {
  settings$.theme.color = color;
};
`,
        errors: [{ message: "`settings$.theme.color.set(...)`", line: 4, column: 3 }],
      },
      {
        name: "computed member assignment",
        code: `import { byId$ } from "../stores/users";

export const put = (id, user) => {
  byId$[id] = user;
};
`,
        errors: [{ message: "`byId$[id].set(...)`", line: 4, column: 3 }],
      },
      {
        name: "compound assignment is caught by the same handler",
        code: `import { count$ } from "../stores/counter";

export const bump = () => {
  count$ += 1;
};
`,
        errors: [{ message: "`+=` replaces the observable itself", line: 4, column: 3 }],
      },
      {
        name: "logical assignment is caught by the same handler",
        code: `import { theme$ } from "../stores/settings";

export const fallback = () => {
  theme$ ??= "dark";
};
`,
        errors: [{ message: "Write through `theme$.set(...)`", line: 4, column: 3 }],
      },
      {
        name: "postfix increment",
        code: `import { count$ } from "../stores/counter";

export const bump = () => {
  count$++;
};
`,
        errors: [{ message: "Use `count$.set(v => v + 1)` — `++`", line: 4, column: 3 }],
      },
      {
        name: "postfix decrement flips the operator in the message",
        code: `import { count$ } from "../stores/counter";

export const drop = () => {
  count$--;
};
`,
        errors: [{ message: "Use `count$.set(v => v - 1)` — `--`", line: 4, column: 3 }],
      },
      {
        name: "prefix increment reports on the whole update expression",
        code: `import { count$ } from "../stores/counter";

export const bump = () => {
  ++count$;
};
`,
        errors: [{ message: "`count$.set(v => v + 1)`", line: 4, column: 3 }],
      },
      {
        name: "increment through a member chain",
        code: `import { stats$ } from "../stores/stats";

export const bump = () => {
  stats$.views++;
};
`,
        errors: [{ message: "`stats$.views.set(v => v + 1)`", line: 4, column: 3 }],
      },
      {
        name: "a read on the right-hand side does not add a second diagnostic",
        code: `import { count$ } from "../stores/counter";

export const bump = () => {
  count$ = count$.get() + 1;
};
`,
        errors: [{ message: "Write through `count$.set(...)`", line: 4, column: 3 }],
      },
      {
        name: "assignments and updates report once each, in source order",
        code: `import { count$, settings$, total } from "../stores/counter";

export const reset = () => {
  count$ = 0;
  settings$.theme = "dark";
  total = 0;
  count$++;
};
`,
        errors: [
          { message: "Write through `count$.set(...)`", line: 4, column: 3 },
          { message: "Write through `settings$.theme.set(...)`", line: 5, column: 3 },
          { message: "`count$.set(v => v + 1)`", line: 7, column: 3 },
        ],
      },
    ],
  },

  "no-nested-observable": {
    valid: [
      {
        name: "a plain object literal",
        code: `import { observable } from "@legendapp/state";

export const settings$ = observable({ theme: "dark" });
`,
      },
      {
        name: "a plain identifier with no dollar suffix",
        code: `import { observable } from "@legendapp/state";
import { initialSettings } from "./defaults";

export const settings$ = observable(initialSettings);
`,
      },
      {
        name: "no arguments",
        code: `import { observable } from "@legendapp/state";

export const settings$ = observable();
`,
      },
      {
        name: "a spread argument has no Identifier root",
        code: `import { observable } from "@legendapp/state";

export const make = (...args) => observable(...args);
`,
      },
      {
        name: "a computed selector arrow is not an observable ref",
        code: `import { useObservable } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useDouble = () => useObservable(() => count$.get() * 2);
`,
      },
      {
        name: "only the first argument is checked",
        code: `import { observable } from "@legendapp/state";
import { count$ } from "../stores/counter";

export const settings$ = observable({ theme: "dark" }, count$);
`,
      },
      {
        name: "a factory reached through a member expression",
        code: `import { count$ } from "../stores/counter";
import { store } from "../stores/root";

export const wrapped = store.observable(count$);
`,
      },
      {
        name: "a differently named factory in a file that also uses the real one",
        code: `import { observable } from "@legendapp/state";
import { observableRef } from "../lib/observable-ref";
import { count$ } from "../stores/counter";

export const settings$ = observable({ theme: "dark" });
export const mirror = observableRef(count$);
`,
      },
      {
        name: "the root of the chain has no dollar",
        code: `import { observable } from "@legendapp/state";
import { store } from "../stores/root";

export const settings$ = observable(store.count$);
`,
      },
      {
        name: "the argument is a call, not a reference",
        code: `import { observable } from "@legendapp/state";
import { count$ } from "../stores/counter";

export const settings$ = observable(count$.get());
`,
      },
      {
        name: "a chain rooted at a call has no Identifier root",
        code: `import { observable } from "@legendapp/state";
import { getStore } from "../stores/root";

export const settings$ = observable(getStore().count$);
`,
      },
      {
        name: "a generic factory call wrapping a plain value",
        code: `import { observable } from "@legendapp/state";

export const wrapped$ = observable<number>(0);
`,
      },
    ],
    invalid: [
      {
        name: "observable() wrapping an observable",
        code: `import { observable } from "@legendapp/state";
import { count$ } from "../stores/counter";

export const wrapped$ = observable(count$);
`,
        errors: [{ message: "passing it to `observable()`", line: 4, column: 36 }],
      },
      {
        name: "useObservable() wrapping an observable names the other factory",
        code: `import { useObservable } from "@legendapp/state/react";
import { settings$ } from "../stores/settings";

export const useSettings = () => useObservable(settings$);
`,
        errors: [{ message: "passing it to `useObservable()`", line: 4, column: 48 }],
      },
      {
        name: "wrapping a field of an observable",
        code: `import { observable } from "@legendapp/state";
import { settings$ } from "../stores/settings";

export const theme$ = observable(settings$.theme);
`,
        errors: [{ message: "second node", line: 4, column: 34 }],
      },
      {
        name: "wrapping a computed field of an observable",
        code: `import { observable } from "@legendapp/state";
import { byId$ } from "../stores/users";

export const pick = id => observable(byId$[id]);
`,
        errors: [{ line: 4, column: 38 }],
      },
      {
        name: "the same generic wrapping is flagged once a sibling call satisfies the source gate",
        code: `import { observable } from "@legendapp/state";
import { count$ } from "../stores/counter";

export const ready$ = observable(false);
export const wrapped$ = observable<number>(count$);
`,
        errors: [{ message: "passing it to `observable()`", line: 5, column: 44 }],
      },
      {
        name: "each wrapping reports once, in source order",
        code: `import { observable } from "@legendapp/state";
import { useObservable } from "@legendapp/state/react";
import { count$, settings$ } from "../stores/counter";

export const wrapped$ = observable(count$);
export const safe$ = observable({ count: 0 });

export const useSettings = () => useObservable(settings$);
`,
        errors: [
          { message: "`observable()`", line: 5, column: 36 },
          { message: "`useObservable()`", line: 8, column: 48 },
        ],
      },
    ],
  },

  "no-object-selector": {
    valid: [
      {
        name: "a block-bodied selector whose return sits in a nested function",
        code: `import { useValue } from "@legendapp/state/react";

export const Row = () => {
  const value = useValue(() => {
    const pick = () => {
      return { a: 1 };
    };
    return pick().a;
  });
  return value;
};
`,
      },
      {
        name: "a primitive selector",
        code: `import { useValue } from "@legendapp/state/react";
import { settings$ } from "../stores/settings";

export const useTheme = () => useValue(() => settings$.theme.get());
`,
      },
      {
        name: "passing the observable itself",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useCount = () => useValue(count$);
`,
      },
      {
        name: "a conditional body is not a literal",
        code: `import { useValue } from "@legendapp/state/react";
import { settings$ } from "../stores/settings";

export const useLabel = () => useValue(() => (settings$.dark.get() ? "dark" : "light"));
`,
      },
      {
        name: "a template literal body",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useName = () => useValue(() => \`\${user$.first.get()} \${user$.last.get()}\`);
`,
      },
      {
        name: "a NewExpression body is not an object or array literal",
        code: `import { useValue } from "@legendapp/state/react";
import { ids$ } from "../stores/ids";

export const useIds = () => useValue(() => new Set(ids$.get()));
`,
      },
      {
        name: "useValue reached through a member expression",
        code: `import { store } from "../stores/root";

export const useUser = () => store.useValue(() => ({ id: 1 }));
`,
      },
      {
        name: "a hook whose name merely starts with useValue",
        code: `import { useValueOr } from "../hooks/use-value-or";

export const useUser = () => useValueOr(() => ({ id: 1 }));
`,
      },
      {
        name: "no arguments",
        code: `import { useValue } from "@legendapp/state/react";

export const useNothing = () => useValue();
`,
      },
      {
        name: "an object literal in a non-selector position",
        code: `import { useValue } from "@legendapp/state/react";
import { settings$ } from "../stores/settings";

export const useTheme = () => useValue(() => settings$.theme.get(), { equality: "shallow" });
`,
      },
    ],
    invalid: [
      {
        name: "a FunctionExpression selector returning an object literal",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useUser = () =>
  useValue(function () {
    return { first: user$.first.get() };
  });
`,
        errors: 1,
      },
      {
        name: "a block-bodied arrow returning an object literal",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useUser = () =>
  useValue(() => {
    return { first: user$.first.get(), last: user$.last.get() };
  });
`,
        errors: 1,
      },
      {
        name: "an object literal selector",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useUser = () => useValue(() => ({ first: user$.first.get(), last: user$.last.get() }));
`,
        errors: [{ message: "a new object each run re-renders on every store change", line: 4, column: 46 }],
      },
      {
        name: "an array literal selector names array in the message",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useNames = () => useValue(() => [user$.first.get(), user$.last.get()]);
`,
        errors: [{ message: "a new array each run re-renders on every store change", line: 4, column: 46 }],
      },
      {
        name: "an empty object literal",
        code: `import { useValue } from "@legendapp/state/react";

export const useEmpty = () => useValue(() => ({}));
`,
        errors: [{ message: "a new object each run", line: 3, column: 47 }],
      },
      {
        name: "an empty array literal",
        code: `import { useValue } from "@legendapp/state/react";

export const useEmpty = () => useValue(() => []);
`,
        errors: [{ message: "a new array each run", line: 3, column: 46 }],
      },
      {
        name: "a second argument does not stop the first from being checked",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useUser = () => useValue(() => ({ id: user$.id.get() }), { equality: "shallow" });
`,
        errors: [{ line: 4, column: 46 }],
      },
      {
        name: "a nested object literal reports only on the selector body",
        code: `import { useValue } from "@legendapp/state/react";
import { user$ } from "../stores/user";

export const useUser = () => useValue(() => ({ profile: { first: user$.first.get() } }));
`,
        errors: [{ message: "a new object each run", line: 4, column: 46 }],
      },
      {
        name: "each offending selector reports once, in source order",
        code: `import { useValue } from "@legendapp/state/react";
import { user$, count$ } from "../stores/user";

export const useUser = () => useValue(() => ({ id: user$.id.get() }));
export const useCount = () => useValue(() => count$.get());
export const useNames = () => useValue(() => [user$.first.get()]);
`,
        errors: [
          { message: "a new object each run", line: 4, column: 46 },
          { message: "a new array each run", line: 6, column: 46 },
        ],
      },
    ],
  },

  "no-observable-in-component": {
    valid: [
      {
        name: "a module-level store",
        code: `import { observable } from "@legendapp/state";

export const settings$ = observable({ theme: "dark" });
`,
      },
      {
        name: "observable() inside a lowercase helper",
        code: `import { observable } from "@legendapp/state";

const makeStore = () => observable({ theme: "dark" });

export const settings$ = makeStore();
`,
      },
      {
        name: "useObservable() inside a component is the right call",
        code: `import { useObservable } from "@legendapp/state/react";
import { observable } from "@legendapp/state";

export const root$ = observable({ ready: false });

export const Profile = () => {
  const draft$ = useObservable({ title: "" });
  return draft$;
};
`,
      },
      {
        name: "a member-expression factory inside a component",
        code: `import { observable } from "@legendapp/state";
import { store } from "../stores/root";

export const root$ = observable({ ready: false });

export const Profile = () => {
  const local$ = store.observable({ title: "" });
  return local$;
};
`,
      },
      {
        name: "documents current behaviour: a memo-wrapped component is not tracked as a component",
        code: `import { memo } from "react";
import { observable } from "@legendapp/state";

export const Profile = memo(() => {
  const local$ = observable({ title: "" });
  return local$;
});
`,
      },
      {
        name: "documents current behaviour: a class render method is not tracked as a component",
        code: `import { observable } from "@legendapp/state";

export class Profile {
  render() {
    const local$ = observable({ title: "" });
    return local$;
  }
}
`,
      },
      {
        name: "documents current behaviour: an anonymous default-exported component has no name to test",
        code: `import { observable } from "@legendapp/state";

export default function () {
  const local$ = observable({ title: "" });
  return local$;
}
`,
      },
      {
        name: "a lowercase name that starts with use but is not a hook",
        code: `import { observable } from "@legendapp/state";

const username = () => observable({ title: "" });

export { username };
`,
      },
      {
        name: "a generic factory call at module scope",
        code: `import { observable } from "@legendapp/state";

interface Draft {
  title: string;
}

export const draft$ = observable<Draft>({ title: "" });
`,
      },
      {
        name: "a component that only reads a module-level store",
        code: `import { observable } from "@legendapp/state";

const settings$ = observable({ theme: "dark" });

export const Profile = () => settings$.theme.get();
`,
      },
    ],
    invalid: [
      {
        name: "observable() inside a function-declaration component",
        code: `import { observable } from "@legendapp/state";

export function Profile() {
  const local$ = observable({ title: "" });
  return local$;
}
`,
        errors: [{ message: "Use `useObservable()` for component-lifetime state", line: 4, column: 18 }],
      },
      {
        name: "observable() inside an arrow component",
        code: `import { observable } from "@legendapp/state";

export const Profile = () => {
  const local$ = observable({ title: "" });
  return local$;
};
`,
        errors: [{ message: "makes a new one every render", line: 4, column: 18 }],
      },
      {
        name: "observable() inside a custom hook",
        code: `import { observable } from "@legendapp/state";

export const useDraft = () => observable({ title: "" });
`,
        errors: [{ line: 3, column: 31 }],
      },
      {
        name: "observable() inside a function-expression component",
        code: `import { observable } from "@legendapp/state";

export const Profile = function () {
  return observable({ title: "" });
};
`,
        errors: [{ line: 4, column: 10 }],
      },
      {
        name: "a single capital letter counts as a component name",
        code: `import { observable } from "@legendapp/state";

export const V = () => observable({ title: "" });
`,
        errors: [{ line: 3, column: 24 }],
      },
      {
        name: "a nested plain function inside a component is still inside the component",
        code: `import { observable } from "@legendapp/state";

export function Profile() {
  const build = () => observable({ title: "" });
  return build();
}
`,
        errors: [{ line: 4, column: 23 }],
      },
      {
        name: "a component nested in a factory reports once",
        code: `import { observable } from "@legendapp/state";

export const makeScreen = () => {
  const Row = () => observable({ title: "" });
  return Row;
};
`,
        errors: [{ line: 4, column: 21 }],
      },
      {
        name: "the component depth is released again at module level",
        code: `import { observable } from "@legendapp/state";

export function Profile() {
  const local$ = observable({ title: "" });
  return local$;
}

export const settings$ = observable({ theme: "dark" });
`,
        errors: [{ line: 4, column: 18 }],
      },
      {
        name: "an arrow component releases its depth for the next declarator",
        code: `import { observable } from "@legendapp/state";

export const Profile = () => observable({ title: "" });

export const settings$ = observable({ theme: "dark" });
`,
        errors: [{ line: 3, column: 30 }],
      },
      {
        name: "two calls in one component report twice",
        code: `import { observable } from "@legendapp/state";

export function Profile() {
  const draft$ = observable({ title: "" });
  const meta$ = observable({ dirty: false });
  return [draft$, meta$];
}
`,
        errors: [
          { line: 4, column: 18 },
          { line: 5, column: 17 },
        ],
      },
      {
        name: "the same generic call is flagged once a sibling call satisfies the source gate",
        code: `import { observable } from "@legendapp/state";

interface Draft {
  title: string;
}

export const ready$ = observable(false);

export const Profile = () => {
  const local$ = observable<Draft>({ title: "" });
  return local$;
};
`,
        errors: [{ line: 10, column: 18 }],
      },
      {
        name: "a named default export component",
        code: `import { observable } from "@legendapp/state";

export default function Screen() {
  return observable({ title: "" });
}
`,
        errors: [{ line: 4, column: 10 }],
      },
    ],
  },

  "no-peek-in-selector": {
    valid: [
      {
        name: "a computed member named like the method is a different method",
        code: `import { useValue } from "@legendapp/state/react";
import { count$, cache } from "../stores/counter";

const peek = "peek";
const warm = () => cache.peek();

export const useCount = () => useValue(() => count$[peek]());
`,
      },
      {
        name: "get() inside a selector",
        code: `import { useValue } from "@legendapp/state/react";
import { count$, other$ } from "../stores/counter";

export const useCount = () => useValue(() => count$.get());
export const snapshot = () => other$.peek();
`,
      },
      {
        name: "peek() in an event handler",
        code: `import { count$ } from "../stores/counter";

export const onPress = () => {
  console.log(count$.peek());
};
`,
      },
      {
        name: "peek() on a receiver with no dollar suffix",
        code: `import { useValue } from "@legendapp/state/react";
import { cache } from "../lib/cache";

export const useCached = () => useValue(() => cache.peek());
`,
      },
      {
        name: "the chain root has no dollar",
        code: `import { useValue } from "@legendapp/state/react";
import { store } from "../stores/root";

export const useTheme = () => useValue(() => store.settings$.peek());
`,
      },
      {
        name: "useValue reached through a member expression is not a tracking context",
        code: `import { store } from "../stores/root";
import { count$ } from "../stores/counter";

export const useCount = () => store.useValue(() => count$.peek());
`,
      },
      {
        name: "a hook whose name merely starts with useValue",
        code: `import { useValueOr } from "../hooks/use-value-or";
import { count$ } from "../stores/counter";

export const useCount = () => useValueOr(() => count$.peek());
`,
      },
      {
        name: "only the first argument of when() is the tracked predicate",
        code: `import { when } from "@legendapp/state";
import { ready$, count$ } from "../stores/counter";

when(ready$, () => {
  console.log(count$.peek());
});
`,
      },
      {
        name: "useObserve called with an observable first argument does not track its callback",
        code: `import { useObserve } from "@legendapp/state/react";
import { count$, other$ } from "../stores/counter";

export const useLog = () =>
  useObserve(count$, () => {
    console.log(other$.peek());
  });
`,
      },
      {
        name: "the tracking depth is released after the selector closes",
        code: `import { useValue } from "@legendapp/state/react";
import { count$, other$ } from "../stores/counter";

export const useCount = () => {
  const count = useValue(() => count$.get());
  const snapshot = other$.peek();
  return [count, snapshot];
};
`,
      },
      {
        name: "useValue with a non-function argument never opens a tracking context",
        code: `import { useValue } from "@legendapp/state/react";
import { count$, other$ } from "../stores/counter";

export const useCount = () => {
  const count = useValue(count$);
  return count + other$.peek();
};
`,
      },
      {
        name: "useValue with no arguments never opens a tracking context",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useCount = () => {
  useValue();
  return count$.peek();
};
`,
      },
      {
        name: "a string-literal computed member is not an Identifier named peek",
        code: `import { useValue } from "@legendapp/state/react";
import { count$, cache } from "../stores/counter";

const warm = () => cache.peek();

export const useCount = () => useValue(() => count$["peek"]());

export { warm };
`,
      },
      {
        name: "peek reached through a call, not a member expression",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

const peekOf = observable => observable.peek();

export const useCount = () => useValue(() => peekOf(count$));
`,
      },
    ],
    invalid: [
      {
        name: "peek() inside a useValue selector",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useCount = () => useValue(() => count$.peek());
`,
        errors: [{ message: "Use `count$.get()` inside this selector", line: 4, column: 46 }],
      },
      {
        name: "peek() inside observe()",
        code: `import { observe } from "@legendapp/state";
import { count$ } from "../stores/counter";

observe(() => {
  console.log(count$.peek());
});
`,
        errors: [{ message: "`peek()` never subscribes", line: 5, column: 15 }],
      },
      {
        name: "peek() inside useObserve()",
        code: `import { useObserve } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useLog = () =>
  useObserve(() => {
    console.log(count$.peek());
  });
`,
        errors: [{ line: 6, column: 17 }],
      },
      {
        name: "peek() inside useObserveEffect()",
        code: `import { useObserveEffect } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useLog = () =>
  useObserveEffect(() => {
    console.log(count$.peek());
  });
`,
        errors: [{ line: 6, column: 17 }],
      },
      {
        name: "peek() inside the when() predicate",
        code: `import { when } from "@legendapp/state";
import { ready$ } from "../stores/counter";

when(
  () => ready$.peek(),
  () => console.log("ready")
);
`,
        errors: [{ line: 5, column: 9 }],
      },
      {
        name: "peek() inside the whenReady() predicate",
        code: `import { whenReady } from "@legendapp/state";
import { ready$ } from "../stores/counter";

whenReady(
  () => ready$.peek(),
  () => console.log("ready")
);
`,
        errors: [{ line: 5, column: 9 }],
      },
      {
        name: "a FunctionExpression selector is also a tracking context",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useCount = () =>
  useValue(function () {
    return count$.peek();
  });
`,
        errors: [{ line: 6, column: 12 }],
      },
      {
        name: "a nested plain function inside a selector is still inside the tracking context",
        code: `import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const useCount = () =>
  useValue(() => {
    const read = () => count$.peek();
    return read();
  });
`,
        errors: [{ line: 6, column: 24 }],
      },
      {
        name: "peek() on a field of an observable quotes the chain",
        code: `import { useValue } from "@legendapp/state/react";
import { settings$ } from "../stores/settings";

export const useTheme = () => useValue(() => settings$.theme.peek());
`,
        errors: [{ message: "Use `settings$.theme.get()`", line: 4, column: 46 }],
      },
      {
        name: "two peeks in one selector report twice",
        code: `import { useValue } from "@legendapp/state/react";
import { first$, last$ } from "../stores/user";

export const useName = () => useValue(() => first$.peek() + " " + last$.peek());
`,
        errors: [
          { message: "`first$.get()`", line: 4, column: 45 },
          { message: "`last$.get()`", line: 4, column: 67 },
        ],
      },
      {
        name: "nested tracking contexts both report",
        code: `import { useValue, useObserve } from "@legendapp/state/react";
import { count$, other$ } from "../stores/counter";

export const useCount = () =>
  useValue(() => {
    useObserve(() => {
      console.log(other$.peek());
    });
    return count$.peek();
  });
`,
        errors: [
          { message: "`other$.get()`", line: 7, column: 19 },
          { message: "`count$.get()`", line: 9, column: 12 },
        ],
      },
    ],
  },

  "no-react-mirror": {
    valid: [
      {
        name: "a computed member named like the method is a different method",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

const get = "get";

export const Counter = () => {
  const [count] = useState(count$[get]());
  return count;
};
`,
      },
      {
        name: "reading the observable with useValue",
        code: `import { useState } from "react";
import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const Counter = () => {
  const count = useValue(count$);
  const [open, setOpen] = useState(false);
  return [count, open, setOpen];
};
`,
      },
      {
        name: "a plain literal seed",
        code: `import { useState } from "react";

export const Counter = () => useState(0);
`,
      },
      {
        name: "seeding from a non-observable receiver",
        code: `import { useState } from "react";
import { cache } from "../lib/cache";

export const Counter = () => useState(cache.get());
`,
      },
      {
        name: "the chain root has no dollar",
        code: `import { useState } from "react";
import { store } from "../stores/root";

export const Counter = () => useState(store.count$.get());
`,
      },
      {
        name: "a method that is neither get nor peek",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => useState(count$.set(0));
`,
      },
      {
        name: "no arguments",
        code: `import { useState } from "react";

export const Counter = () => useState();
`,
      },
      {
        name: "useState reached through the React namespace",
        code: `import React from "react";
import { count$ } from "../stores/counter";

export const Counter = () => React.useState(count$.get());
`,
      },
      {
        name: "a hook whose name merely starts with useState",
        code: `import { useStateWithHistory } from "../hooks/use-state-with-history";
import { count$ } from "../stores/counter";

export const Counter = () => useStateWithHistory(count$.get());
`,
      },
      {
        name: "documents current behaviour: a lazy initializer is not caught",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => useState(() => count$.get());
`,
      },
      {
        name: "the observable read is a bare member, not a call",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => useState(count$.get);
`,
      },
      {
        name: "a seed from a plain function call has no member callee",
        code: `import { useState } from "react";
import { getCount } from "../stores/counter";

export const Counter = () => useState(getCount());
`,
      },
      {
        name: "a string-literal computed member is not an Identifier named get",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => useState(count$["get"]());
`,
      },
      {
        name: "the observable read is the second argument",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => useState(0, count$.get());
`,
      },
    ],
    invalid: [
      {
        name: "seeding useState from get()",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => {
  const [count, setCount] = useState(count$.get());
  return [count, setCount];
};
`,
        errors: [{ message: "Drop this `useState` mirror", line: 5, column: 29 }],
      },
      {
        name: "seeding useState from peek()",
        code: `import { useState } from "react";
import { count$ } from "../stores/counter";

export const Counter = () => {
  const [count, setCount] = useState(count$.peek());
  return [count, setCount];
};
`,
        errors: [{ message: "single owner of the value", line: 5, column: 29 }],
      },
      {
        name: "seeding from a field of an observable",
        code: `import { useState } from "react";
import { settings$ } from "../stores/settings";

export const Settings = () => {
  const [theme, setTheme] = useState(settings$.theme.get());
  return [theme, setTheme];
};
`,
        errors: [{ line: 5, column: 29 }],
      },
      {
        name: "seeding from a computed field of an observable",
        code: `import { useState } from "react";
import { byId$ } from "../stores/users";

export const User = ({ id }) => {
  const [user, setUser] = useState(byId$[id].get());
  return [user, setUser];
};
`,
        errors: [{ line: 5, column: 27 }],
      },
      {
        name: "each mirror reports once and honest useState calls are left alone",
        code: `import { useState } from "react";
import { count$, theme$ } from "../stores/counter";

export const Screen = () => {
  const [count] = useState(count$.get());
  const [open] = useState(false);
  const [theme] = useState(theme$.peek());
  return [count, open, theme];
};
`,
        errors: [
          { line: 5, column: 19 },
          { line: 7, column: 19 },
        ],
      },
    ],
  },

  "no-untracked-get-in-jsx": {
    valid: [
      {
        name: "a computed member named like the method is a different method",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

const get = "get";

export const Counter = () => {
  const label = count$.get();
  return <Text>{count$[get]()}</Text>;
};
`,
      },
      {
        name: "reading through useValue at the top of the component",
        code: `import { Text } from "react-native";
import { useValue } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const Counter = () => {
  const count = useValue(count$);
  return <Text>{count}</Text>;
};
`,
      },
      {
        name: "a peek() in JSX is a different method",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

const initial = count$.get();

export const Counter = () => <Text>{count$.peek()}</Text>;

export { initial };
`,
      },
      {
        name: "the receiver has no dollar suffix",
        code: `import { Text } from "react-native";
import { cache } from "../lib/cache";

export const Label = () => <Text>{cache.get()}</Text>;
`,
      },
      {
        name: "the chain root has no dollar",
        code: `import { Text } from "react-native";
import { store } from "../stores/root";

export const Label = () => <Text>{store.count$.get()}</Text>;
`,
      },
      {
        name: "a get() inside a nested callback is not directly in the container",
        code: `import { Text } from "react-native";
import { names$ } from "../stores/names";

export const List = ({ ids }) => <Text>{ids.map(id => names$[id].get()).join(", ")}</Text>;
`,
      },
      {
        name: "a render callback inside the container is a function boundary",
        code: `import { Memo } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const Counter = () => <Memo>{() => count$.get()}</Memo>;
`,
      },
      {
        name: "a FunctionExpression inside the container is a function boundary too",
        code: `import { Memo } from "@legendapp/state/react";
import { count$ } from "../stores/counter";

export const Counter = () => (
  <Memo>
    {function () {
      return count$.get();
    }}
  </Memo>
);
`,
      },
      {
        name: "a string-literal computed member is not an Identifier named get",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

const initial = count$.get();

export const Counter = () => <Text>{count$["get"]()}</Text>;

export { initial };
`,
      },
      {
        name: "a get() inside an event handler attribute",
        code: `import { Pressable } from "react-native";
import { count$ } from "../stores/counter";

export const Bump = () => <Pressable onPress={() => console.log(count$.get())} />;
`,
      },
      {
        name: "a get() at module level in a file that renders JSX",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

const initial = count$.get();

export const Counter = () => <Text>{initial}</Text>;
`,
      },
      {
        name: "a get() in the component body before the return",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = () => {
  const count = count$.get();
  return <Text>{count}</Text>;
};
`,
      },
      {
        name: "a bare member access with no call",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

const read = count$.get();

export const Counter = () => <Text>{count$.get}</Text>;

export { read };
`,
      },
      {
        name: "a get() in a file with no JSX expression container at all",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = () => <Text>static</Text>;

export const read = () => count$.get();
`,
      },
    ],
    invalid: [
      {
        name: "get() directly in a JSX child container",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = () => (
  <Text>{count$.get()}</Text>
);
`,
        errors: [{ message: "Read it with `useValue(count$)`", line: 5, column: 10 }],
      },
      {
        name: "get() on a field quotes the whole chain",
        code: `import { Text } from "react-native";
import { settings$ } from "../stores/settings";

export const Theme = () => (
  <Text>{settings$.theme.get()}</Text>
);
`,
        errors: [{ message: "`useValue(settings$.theme)`", line: 5, column: 10 }],
      },
      {
        name: "get() inside a JSX attribute container",
        code: `import { View } from "react-native";
import { style$ } from "../stores/style";

export const Box = () => (
  <View style={style$.get()} />
);
`,
        errors: [{ message: "renders the first value", line: 5, column: 16 }],
      },
      {
        name: "get() wrapped in a plain call is still at container depth",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = () => (
  <Text>{String(count$.get())}</Text>
);
`,
        errors: [{ line: 5, column: 17 }],
      },
      {
        name: "get() whose result is mapped over is still a plain read",
        code: `import { Text } from "react-native";
import { items$ } from "../stores/items";

export const List = () => (
  <Text>{items$.get().map(item => item.name).join(", ")}</Text>
);
`,
        errors: [{ line: 5, column: 10 }],
      },
      {
        name: "two sibling containers report twice",
        code: `import { Text, View } from "react-native";
import { first$, last$ } from "../stores/user";

export const Name = () => (
  <View>
    <Text>{first$.get()}</Text>
    <Text>{last$.get()}</Text>
  </View>
);
`,
        errors: [
          { line: 6, column: 12 },
          { line: 7, column: 12 },
        ],
      },
      {
        name: "both branches of a ternary in one container report",
        code: `import { Text } from "react-native";
import { first$, last$ } from "../stores/user";

export const Name = ({ short }) => (
  <Text>{short ? first$.get() : last$.get()}</Text>
);
`,
        errors: [
          { line: 5, column: 18 },
          { line: 5, column: 33 },
        ],
      },
      {
        name: "a container nested inside a map callback is measured against its own depth",
        code: `import { Text, View } from "react-native";
import { names$ } from "../stores/names";

export const List = ({ ids }) => (
  <View>
    {ids.map(id => (
      <Text key={id}>{names$[id].get()}</Text>
    ))}
  </View>
);
`,
        errors: [{ line: 7, column: 23 }],
      },
      {
        name: "a logical-and guard does not introduce a function boundary",
        code: `import { Text, View } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = ({ show }) => (
  <View>{show && <Text>{count$.get()}</Text>}</View>
);
`,
        errors: [{ line: 5, column: 25 }],
      },
      {
        name: "a callback that closes before the read leaves the depth where it was",
        code: `import { Text } from "react-native";
import { count$ } from "../stores/counter";

export const Counter = ({ items }) => (
  <Text>{items.map(n => n).length + count$.get()}</Text>
);
`,
        errors: [{ message: "Read it with `useValue(count$)`", line: 5, column: 37 }],
      },
      {
        name: "a container that closes stops covering later reads in the same function",
        code: `import { Text } from "react-native";
import { count$, other$ } from "../stores/counter";

export const Counter = () => {
  const label = <Text>{count$.get()}</Text>;
  const extra = other$.get();
  return [label, extra];
};
`,
        errors: [{ message: "Read it with `useValue(count$)`", line: 5, column: 24 }],
      },
      {
        name: "a class render method is a function boundary like any other",
        code: `import { Component } from "react";
import { Text } from "react-native";
import { count$ } from "../stores/counter";

export class Counter extends Component {
  render() {
    return <Text>{count$.get()}</Text>;
  }
}
`,
        errors: [{ line: 7, column: 19 }],
      },
    ],
  },
});
