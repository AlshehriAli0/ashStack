import reactNative from "../packages/lint/dist/react-native/rules/react-native/index.js";
import { moduleTests } from "./harness.js";

moduleTests(reactNative, {
  "hoist-stateless-function": {
    valid: [
      {
        name: "already at module scope",
        code: `
import { Text } from "react-native";

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

export const Price = ({ cents }: { cents: number }) => <Text>{formatPrice(cents)}</Text>;
`,
      },
      {
        name: "function declaration at module scope",
        code: `
export function clamp(value: number, max: number) {
  return value > max ? max : value;
}
`,
      },
      {
        name: "reads a state value from the component",
        code: `
import { useState } from "react";
import { Text } from "react-native";

export function Counter() {
  const [count, setCount] = useState(0);
  const label = () => "count: " + count;
  return <Text onPress={() => setCount(count + 1)}>{label()}</Text>;
}
`,
      },
      {
        name: "reads a prop of the component",
        code: `
import { Text } from "react-native";

export function Greeting({ name }: { name: string }) {
  const shout = () => name.toUpperCase();
  return <Text>{shout()}</Text>;
}
`,
      },
      {
        name: "reads a plain local of the component",
        code: `
import { Text } from "react-native";

export function Screen() {
  const padding = 8;
  const gutter = () => padding * 2;
  return <Text>{gutter()}</Text>;
}
`,
      },
      {
        name: "reads a binding declared in a block inside the component",
        code: `
import { Text } from "react-native";

export function Screen() {
  {
    const padding = 4;
    const gutter = () => padding;
    return <Text>{gutter()}</Text>;
  }
}
`,
      },
      {
        name: "capitalised name is treated as a component, not a helper",
        code: `
import { Text } from "react-native";

export function Screen() {
  const Row = () => <Text>row</Text>;
  return <Row />;
}
`,
      },
      {
        name: "anonymous effect callback has no bound name",
        code: `
import { useEffect } from "react";

export function Screen() {
  useEffect(() => {
    subscribe();
  }, []);
  return null;
}
`,
      },
      {
        name: "inline JSX handler has no bound name",
        code: `
import { Pressable } from "react-native";

export function Screen() {
  return <Pressable onPress={() => track("tap")} />;
}
`,
      },
      {
        name: "object method has no bound name",
        code: `
import { Text } from "react-native";

export function Screen() {
  const handlers = {
    onTap() {
      return 1;
    },
  };
  return <Text>{handlers.onTap()}</Text>;
}
`,
      },
      {
        name: "assigned to an existing binding rather than declared",
        code: `
import { Text } from "react-native";

export function Screen() {
  let build;
  build = () => 1;
  return <Text>{build()}</Text>;
}
`,
      },
      {
        name: "nested inside a plain module function, so no React ancestor",
        code: `
export function buildSelectors() {
  const inner = () => 1;
  return inner();
}
`,
      },
      {
        name: "lowercase hook-like name is not a React function",
        code: `
export const usething = () => {
  const build = () => 1;
  return build();
};
`,
      },
      {
        name: "a destructuring declarator binds no single function name",
        code: `
export function Screen() {
  const [handler] = () => 1;
  return handler;
}
`,
      },
      {
        name: "a capitalised IIFE at module scope is not a React function",
        code: `
export const Theme = (() => {
  const scale = (n: number) => n * 4;
  return { gutter: scale(2) };
})();
`,
      },
      {
        name: "nested function reads a binding from the helper around it",
        code: `
import { Text } from "react-native";

export function Screen({ rows }: { rows: number[] }) {
  const total = () => {
    const base = rows.length;
    const scale = () => base * 2;
    return scale();
  };
  return <Text>{total()}</Text>;
}
`,
      },
    ],
    invalid: [
      {
        name: "arrow helper inside a component that reads nothing",
        code: `
import { Text } from "react-native";

export function Screen() {
  const format = (n: number) => n.toFixed(2);
  return <Text>{format(1)}</Text>;
}
`,
        errors: [{ message: "Move `format` to module scope", line: 5, column: 18 }],
      },
      {
        name: "function declaration inside a component",
        code: `
import { Text } from "react-native";

export function Screen() {
  function helper() {
    return 1;
  }
  return <Text>{helper()}</Text>;
}
`,
        errors: [{ message: "Move `helper` to module scope", line: 5, column: 3 }],
      },
      {
        name: "reading a module constant is not reading the component",
        code: `
import { Text } from "react-native";

const PADDING = 8;

export function Screen() {
  const gutter = (n: number) => n + PADDING;
  return <Text>{gutter(1)}</Text>;
}
`,
        errors: [{ message: "Move `gutter` to module scope", line: 7, column: 18 }],
      },
      {
        name: "reading only globals is not reading the component",
        code: `
import { Text } from "react-native";

export function Screen() {
  const stamp = () => Math.round(Date.now() / 1000);
  return <Text>{stamp()}</Text>;
}
`,
        errors: [{ message: "Move `stamp` to module scope", line: 5, column: 17 }],
      },
      {
        name: "reading only its own parameters is not reading the component",
        code: `
import { Text } from "react-native";

export function Screen() {
  const join = (a: string, b: string) => a + b;
  return <Text>{join("a", "b")}</Text>;
}
`,
        errors: 1,
      },
      {
        name: "helper inside a custom hook",
        code: `
export const useThing = () => {
  const build = () => ({ ready: true });
  return build();
};
`,
        errors: [{ message: "Move `build` to module scope", line: 3, column: 17 }],
      },
      {
        name: "helper inside an arrow component",
        code: `
import { Text } from "react-native";

export const Screen = () => {
  const format = (n: number) => n.toFixed(2);
  return <Text>{format(1)}</Text>;
};
`,
        errors: 1,
      },
      {
        name: "named function expression takes its name from the declarator",
        code: `
import { Text } from "react-native";

export function Screen() {
  const build = function inner() {
    return 1;
  };
  return <Text>{build()}</Text>;
}
`,
        errors: [{ message: "Move `build` to module scope", line: 5, column: 17 }],
      },
      {
        name: "helper and the helper nested in it are both reported",
        code: `
import { Text } from "react-native";

export function Screen() {
  const outer = () => {
    const inner = () => 2;
    return inner();
  };
  return <Text>{outer()}</Text>;
}
`,
        errors: [
          { message: "Move `outer` to module scope", line: 5, column: 17 },
          { message: "Move `inner` to module scope", line: 6, column: 19 },
        ],
      },
      {
        name: "only the helper that reads nothing is reported, not the one reading it",
        code: `
import { Text } from "react-native";

export function Screen() {
  const pad = (n: number) => n + 1;
  const label = (n: number) => pad(n) + "px";
  return <Text>{label(1)}</Text>;
}
`,
        errors: [{ message: "Move `pad` to module scope", line: 5, column: 15 }],
      },
    ],
  },

  "no-conditional-style-array": {
    valid: [
      {
        name: "a single style object",
        code: `
import { View } from "react-native";

export const Card = () => <View style={styles.card} />;
`,
      },
      {
        name: "an array of unconditional entries",
        code: `
import { View } from "react-native";

export const Card = () => <View style={[styles.card, styles.padded]} />;
`,
      },
      {
        name: "the fix: a Unistyles dynamic style function",
        code: `
import { View } from "react-native";

export const Card = ({ active }: { active: boolean }) => (
  <View style={[styles.base, styles.card(active)]} />
);
`,
      },
      {
        name: "a ternary outside an array is not an array entry",
        code: `
import { View } from "react-native";

export const Card = ({ active }: { active: boolean }) => (
  <View style={active ? styles.on : styles.off} />
);
`,
      },
      {
        name: "a hole and a spread are not conditional entries",
        code: `
import { View } from "react-native";

export const Card = () => <View style={[styles.card, , ...extra]} />;
`,
      },
      {
        name: "a conditional in a nested array is never visited",
        code: `
import { View } from "react-native";

export const Card = ({ active }: { active: boolean }) => (
  <View style={[styles.card, [active && styles.on]]} />
);
`,
      },
      {
        name: "a different style-shaped prop",
        code: `
import { ScrollView } from "react-native";

export const List = ({ tight }: { tight: boolean }) => (
  <ScrollView contentContainerStyle={[styles.list, tight && styles.tight]} />
);
`,
      },
      {
        name: "a namespaced attribute is not a plain style identifier",
        code: `
export const Card = ({ active }) => <View xml:style={[styles.card, active && styles.on]} />;
`,
      },
      {
        name: "style with no value at all",
        code: `
export const Card = () => <View style />;
`,
      },
      {
        name: "style holding a string rather than an expression container",
        code: `
export const Card = () => <View style="card" />;
`,
      },
    ],
    invalid: [
      {
        name: "a logical && entry",
        code: `
import { View } from "react-native";

export const Card = ({ active }: { active: boolean }) => (
  <View style={[styles.card, active && styles.on]} />
);
`,
        errors: [{ message: "Unistyles dynamic style function", line: 5, column: 30 }],
      },
      {
        name: "a ternary entry",
        code: `
import { View } from "react-native";

export const Card = ({ big }: { big: boolean }) => (
  <View style={[styles.card, big ? styles.big : styles.small]} />
);
`,
        errors: [{ message: "falsy hole", line: 5, column: 30 }],
      },
      {
        name: "a logical || entry",
        code: `
import { View } from "react-native";

export const Card = ({ override }) => <View style={[styles.card, override || styles.on]} />;
`,
        errors: 1,
      },
      {
        name: "a nullish coalescing entry",
        code: `
import { View } from "react-native";

export const Card = ({ override }) => <View style={[styles.card, override ?? styles.on]} />;
`,
        errors: 1,
      },
      {
        name: "a conditional in first position",
        code: `
import { View } from "react-native";

export const Card = ({ active }) => <View style={[active && styles.on, styles.card]} />;
`,
        errors: [{ message: "Unistyles dynamic style function", line: 4, column: 51 }],
      },
      {
        name: "a single-element array holding only a conditional",
        code: `
import { View } from "react-native";

export const Card = ({ active }) => <View style={[active && styles.on]} />;
`,
        errors: 1,
      },
      {
        name: "a sibling style holding a plain string does not stop the array being checked",
        code: `
import { View } from "react-native";

export const Card = ({ active }) => (
  <View style="legacy">
    <View style={[styles.card, active && styles.on]} />
  </View>
);
`,
        errors: [{ line: 6, column: 32 }],
      },
      {
        name: "every conditional entry is reported, unconditional ones are not",
        code: `
import { View } from "react-native";

export const Card = ({ active, big }) => (
  <View style={[styles.card, active && styles.on, styles.pad, big ? styles.big : styles.small]} />
);
`,
        errors: [
          { line: 5, column: 30 },
          { line: 5, column: 63 },
        ],
      },
    ],
  },

  "no-dynamic-import": {
    valid: [
      {
        name: "a static import",
        code: `
import { HeavyScreen } from "./HeavyScreen";

export const Route = () => <HeavyScreen />;
`,
      },
      {
        name: "wrapped in React.lazy",
        code: `
import React from "react";

export const HeavyScreen = React.lazy(() => import("./HeavyScreen"));
`,
      },
      {
        name: "wrapped in a bare lazy",
        code: `
import { lazy } from "react";

export const HeavyScreen = lazy(() => import("./HeavyScreen"));
`,
      },
      {
        name: "wrapped in dynamic",
        code: `
import dynamic from "next/dynamic";

export const Chart = dynamic(() => import("./Chart"), { ssr: false });
`,
      },
      {
        name: "buried inside an async lazy factory",
        code: `
import { lazy } from "react";

export const HeavyScreen = lazy(async () => {
  const loaded = await import("./HeavyScreen");
  return { default: loaded.HeavyScreen };
});
`,
      },
      {
        name: "import.meta is not an import expression",
        code: `
export const here = import.meta.url;
`,
      },
      {
        name: "the gate marker inside a string, with no import expression",
        code: `
export const hint = "prefer a static import( at the top of the file";
`,
      },
      {
        name: "documents current behaviour: whitespace before the paren defeats the source-text gate",
        code: `
export const load = () => import ("./HeavyScreen");
`,
      },
    ],
    invalid: [
      {
        name: "a bare awaited dynamic import",
        code: `
export const load = async () => {
  const mod = await import("./HeavyScreen");
  return mod;
};
`,
        errors: [{ message: "static `import`", line: 3, column: 21 }],
      },
      {
        name: "a dynamic import at module scope",
        code: `
export const pending = import("./analytics");
`,
        errors: [{ message: "Metro inlines", line: 2, column: 24 }],
      },
      {
        name: "a dynamic import with a then chain",
        code: `
import("./analytics").then(mod => mod.init());
`,
        errors: 1,
      },
      {
        name: "a wrapper that is not lazy or dynamic",
        code: `
export const Chart = preload(() => import("./Chart"));
`,
        errors: [{ message: "static `import`", line: 2, column: 36 }],
      },
      {
        name: "a near-miss wrapper name",
        code: `
export const Chart = lazily(() => import("./Chart"));
`,
        errors: 1,
      },
      {
        name: "a capitalised React.Lazy is not the lazy wrapper",
        code: `
import React from "react";

export const Chart = React.Lazy(() => import("./Chart"));
`,
        errors: 1,
      },
      {
        name: "a factory hoisted out of the lazy call loses the wrapper ancestor",
        code: `
import { lazy } from "react";

const load = () => import("./HeavyScreen");

export const HeavyScreen = lazy(load);
`,
        errors: [{ message: "static `import`", line: 4, column: 20 }],
      },
      {
        name: "two unwrapped dynamic imports",
        code: `
export const loadChart = () => import("./Chart");
export const loadTable = () => import("./Table");
`,
        errors: [
          { line: 2, column: 32 },
          { line: 3, column: 32 },
        ],
      },
      {
        name: "a lazy wrapper elsewhere does not excuse an unrelated dynamic import",
        code: `
import { lazy } from "react";

export const Chart = lazy(() => import("./Chart"));
export const loadTable = () => import("./Table");
`,
        errors: [{ line: 5, column: 32 }],
      },
    ],
  },

  "no-keyboard-will-events": {
    valid: [
      {
        name: "the cross-platform keyboardDid events",
        code: `
import { Keyboard } from "react-native";

export const listen = () => {
  const shown = Keyboard.addListener("keyboardDidShow", onShow);
  const hidden = Keyboard.addListener("keyboardDidHide", onHide);
  return () => {
    shown.remove();
    hidden.remove();
  };
};
`,
      },
      {
        name: "a template literal is not a Literal node",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener(\`keyboardWillShow\`, onShow);
`,
      },
      {
        name: "an identifier property key spelled the same way",
        code: `
const handlers = { keyboardWillShow: onShow, keyboardWillHide: onHide };
`,
      },
      {
        name: "an identifier binding spelled the same way",
        code: `
const keyboardWillShow = "keyboardDidShow";
`,
      },
      {
        name: "a longer event name that only starts the same way",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("keyboardWillShowLater", onShow);
`,
      },
      {
        name: "a differently cased name",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("KeyboardWillShow", onShow);
`,
      },
      {
        name: "the gate opens on a comment but no literal matches",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("keyboardDidShow", onShow);
`,
      },
      {
        name: "documents current behaviour: an escaped identifier char defeats the source-text gate",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("keyboardWil\\u006cShow", onShow);
`,
      },
    ],
    invalid: [
      {
        name: "keyboardWillShow",
        code: `
import { Keyboard } from "react-native";

export const useShift = () => {
  const sub = Keyboard.addListener("keyboardWillShow", onShow);
  return () => sub.remove();
};
`,
        errors: [{ message: "iOS-only", line: 5, column: 36 }],
      },
      {
        name: "keyboardWillHide",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("keyboardWillHide", onHide);
`,
        errors: [{ message: "rt.insets.ime", line: 4, column: 22 }],
      },
      {
        name: "keyboardWillChangeFrame",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener("keyboardWillChangeFrame", onFrame);
`,
        errors: [{ line: 4, column: 22 }],
      },
      {
        name: "single quotes make no difference",
        code: `
import { Keyboard } from "react-native";

Keyboard.addListener('keyboardWillShow', onShow);
`,
        errors: 1,
      },
      {
        name: "every iOS-only name in one file",
        code: `
import { Keyboard } from "react-native";

const names = ["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame", "keyboardDidShow"];
`,
        errors: 3,
      },
      {
        name: "the literal need not be a listener argument",
        code: `
export const SHOW_EVENT = "keyboardWillShow";
`,
        errors: [{ line: 2, column: 27 }],
      },
      {
        name: "a string property key is a Literal too",
        code: `
const handlers = { "keyboardWillShow": onShow };
`,
        errors: 1,
      },
    ],
  },

  "no-leaked-render": {
    valid: [
      {
        name: "a computed length access is not a length property",
        code: `
import { View } from "react-native";

export const List = ({ items, key }) => <View>{items[key] && <Rows />}</View>;
`,
      },
      {
        name: "a boolean literal guard leaks nothing",
        code: `
import { View } from "react-native";

export const List = () => <View>{true && <Rows />}</View>;
`,
      },
      {
        name: "a comparison is already a boolean",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length > 0 && <Rows />}</View>;
`,
      },
      {
        name: "an or-chain on the left is not a length guard",
        code: `import { View, Text } from "react-native";
export const List = ({ items, ready }) => <View>{(ready || items.length) && <Text>Some</Text>}</View>;
`,
      },
      {
        name: "an explicit length comparison",
        code: `
import { View } from "react-native";

export const List = ({ items }: { items: string[] }) => (
  <View>{items.length > 0 && <Rows items={items} />}</View>
);
`,
      },
      {
        name: "a double-negation coercion",
        code: `
import { View } from "react-native";

export const List = ({ items }: { items: string[] }) => <View>{!!items.length && <Rows />}</View>;
`,
      },
      {
        name: "a Boolean() coercion",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{Boolean(items.length) && <Rows />}</View>;
`,
      },
      {
        name: "a ternary ending in null",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length ? <Rows /> : null}</View>;
`,
      },
      {
        name: "a negated length guard",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{!items.length && <Empty />}</View>;
`,
      },
      {
        name: "a length equality check",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length === 0 && <Empty />}</View>;
`,
      },
      {
        name: "|| is not the guarded operator",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length || <Empty />}</View>;
`,
      },
      {
        name: "?? is not the guarded operator",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length ?? <Empty />}</View>;
`,
      },
      {
        name: "a bare number guard is not a length guard",
        code: `
import { View } from "react-native";

export const Badge = ({ count }: { count: number }) => <View>{count && <Dot />}</View>;
`,
      },
      {
        name: "a bare string guard is not a length guard",
        code: `
import { View } from "react-native";

export const Title = ({ title }: { title: string }) => <View>{title && <Text>{title}</Text>}</View>;
`,
      },
      {
        name: "a bare boolean guard is not a length guard",
        code: `
import { View } from "react-native";

export const Sheet = ({ isOpen }: { isOpen: boolean }) => <View>{isOpen && <Body />}</View>;
`,
      },
      {
        name: "a property that is neither length nor size",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.total && <Rows />}</View>;
`,
      },
      {
        name: "a boolean-looking identifier this rule cannot read stays quiet",
        code: `
import { View } from "react-native";

export const List = ({ isOpen }) => <View>{isOpen && <Rows />}</View>;
`,
      },
      {
        name: "documents current behaviour: an optional chain is not matched",
        code: `
import { View } from "react-native";

export const List = ({ items }: { items?: string[] }) => <View>{items?.length && <Rows />}</View>;
`,
      },
      {
        name: "documents current behaviour: a computed length access is not matched",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items["length"] && <Rows />}</View>;
`,
      },
      {
        name: "documents current behaviour: a type assertion around the length is not matched",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{(items.length as number) && <Rows />}</View>;
`,
      },
      {
        name: "documents current behaviour: only the right operand of a && chain is inspected",
        code: `
import { View } from "react-native";

export const List = ({ items, isOpen }) => <View>{items.length && isOpen && <Rows />}</View>;
`,
      },
      {
        name: "the same shape in a JSX attribute is not a child",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View style={items.length && styles.filled} />;
`,
      },
      {
        name: "the same shape outside JSX entirely",
        code: `
export const hasRows = (items: string[]) => items.length && items[0];
`,
      },
      {
        name: "a length rendered on its own is not a logical expression",
        code: `
import { View, Text } from "react-native";

export const Count = ({ items }) => (
  <View>
    <Text>{items.length}</Text>
  </View>
);
`,
      },
      {
        name: "a length guard on the right of an || chain",
        code: `
import { View } from "react-native";

export const List = ({ items, forced }) => <View>{forced || items.length}</View>;
`,
      },
    ],
    invalid: [
      {
        name: "a string literal guard leaks the empty string",
        code: `
import { View } from "react-native";

export const List = () => <View>{"" && <Rows />}</View>;
`,
        errors: 1,
      },
      {
        name: "a numeric literal guard leaks the zero",
        code: `
import { View } from "react-native";

export const List = () => <View>{0 && <Rows />}</View>;
`,
        errors: 1,
      },
      {
        name: "a Set's size leaks the same way a length does",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.size && <Rows />}</View>;
`,
        errors: 1,
      },
      {
        name: "arithmetic leaks its result",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{(items.length - 1) && <Rows />}</View>;
`,
        errors: 1,
      },
      {
        name: "a template literal leaks the empty string",
        code: `
import { View } from "react-native";

export const List = ({ name }) => <View>{\`\${name}\` && <Rows />}</View>;
`,
        errors: 1,
      },
      {
        name: "a bare length guard on a JSX child",
        code: `
import { View } from "react-native";

export const List = ({ items }: { items: string[] }) => (
  <View>{items.length && <Rows items={items} />}</View>
);
`,
        errors: [{ message: "Text strings must be rendered within a <Text> component", line: 5, column: 10 }],
      },
      {
        name: "inside a fragment",
        code: `
export const List = ({ items }) => <>{items.length && <Rows />}</>;
`,
        errors: [{ message: "Compare explicitly", line: 2, column: 39 }],
      },
      {
        name: "a nested member path ending in length",
        code: `
import { View } from "react-native";

export const List = ({ data }) => <View>{data.items.length && <Rows />}</View>;
`,
        errors: [{ line: 4, column: 42 }],
      },
      {
        name: "a boolean guard chained before the length guard is still reported",
        code: `
import { View } from "react-native";

export const List = ({ items, isOpen }) => <View>{isOpen && items.length && <Rows />}</View>;
`,
        errors: [{ line: 4, column: 51 }],
      },
      {
        name: "a three-term chain ending in a length reports once, on the outermost expression",
        code: `
import { View } from "react-native";

export const List = ({ items, a, b }) => <View>{a && b && items.length && <Rows />}</View>;
`,
        errors: [{ line: 4, column: 49 }],
      },
      {
        name: "the right operand is never inspected, so a string leaks too",
        code: `
import { View } from "react-native";

export const List = ({ items }) => <View>{items.length && "has rows"}</View>;
`,
        errors: 1,
      },
      {
        name: "two guarded children in one element",
        code: `
import { View } from "react-native";

export const Screen = ({ items, tags }) => (
  <View>
    {items.length && <Rows />}
    {tags.length && <Tags />}
  </View>
);
`,
        errors: [
          { line: 6, column: 6 },
          { line: 7, column: 6 },
        ],
      },
      {
        name: "only the inner container matches when the outer guard is a plain boolean",
        code: `
import { View } from "react-native";

export const Screen = ({ ok, items }) => (
  <View>{ok && <View>{items.length && <Rows />}</View>}</View>
);
`,
        errors: [{ line: 5, column: 23 }],
      },
    ],
  },

  "no-manual-memo": {
    valid: [
      {
        name: "useMemo justified by a why: comment above",
        code: `
import { useMemo } from "react";

export const useTotals = (rows: number[]) => {
  // why: measured at 12ms on a mid-tier Android
  return useMemo(() => rows.reduce((a, b) => a + b, 0), [rows]);
};
`,
      },
      {
        name: "useCallback justified by a capitalised Why: comment",
        code: `
import { useCallback } from "react";

export const useRow = (id: string) => {
  // Why: rendered per row in a 5k-item list
  return useCallback(() => select(id), [id]);
};
`,
      },
      {
        name: "a trailing why: comment on the same line justifies the call",
        code: `
import { useMemo } from "react";

export const useTotals = (rows: number[]) => useMemo(() => rows.length, [rows]); // why: measured
`,
      },
      {
        name: "a block why: comment ending on the line above",
        code: `
import { useCallback } from "react";

/* why: measured at 4ms
   on a mid-tier Android */
export const handler = useCallback(fn, []);
`,
      },
      {
        name: "a memo-named property on something other than React",
        code: `
export const Row = Screens.memo(RawRow);
`,
      },
      {
        name: "a computed React member is not a namespaced memo",
        code: `
import React from "react";

export const Row = React["memo"](RawRow);
`,
      },
      {
        name: "a computed React member is not a namespaced memo even when the key identifier is spelled memo",
        code: `
import React from "react";

export const Row = React[memo](RawRow);
`,
      },
      {
        name: "a lowercase react namespace is not React",
        code: `
export const Row = react.memo(RawRow);
`,
      },
      {
        name: "a custom hook whose name only starts the same way",
        code: `
export const value = useMemoized(() => 1, []);
`,
      },
      {
        name: "a memoize helper is not memo",
        code: `
import memoize from "lodash/memoize";

export const slugify = memoize((s: string) => s.toLowerCase());
`,
      },
      {
        name: "an aliased import escapes the name check",
        code: `
import { useMemo as remember } from "react";

export const value = remember(() => 1, []);
`,
      },
      {
        name: "the gate opens but there is no memo call",
        code: `
const memoized = compute();

export const value = memoized;
`,
      },
      {
        name: "no gate marker in the file at all",
        code: `
import { Text } from "react-native";

export const Row = () => <Text>row</Text>;
`,
      },
    ],
    invalid: [
      {
        name: "a bare useMemo with no justification",
        code: `
import { useMemo } from "react";

export const useTotals = (rows: number[]) => {
  return useMemo(() => rows.reduce((a, b) => a + b, 0), [rows]);
};
`,
        errors: [{ message: "so a `useMemo` is allowed", line: 5, column: 10 }],
      },
      {
        name: "a bare useCallback",
        code: `
import { useCallback } from "react";

export const useRow = (id: string) => useCallback(() => select(id), [id]);
`,
        errors: [{ message: "so a `useCallback` is allowed", line: 4, column: 39 }],
      },
      {
        name: "a bare memo on the very first line of the file",
        code: `export const Row = memo(RawRow);
`,
        errors: [{ message: "so a `memo` is allowed", line: 1, column: 20 }],
      },
      {
        name: "React.memo",
        code: `
import React from "react";

export const Row = React.memo(RawRow);
`,
        errors: [{ message: "so a `memo` is allowed", line: 4, column: 20 }],
      },
      {
        name: "all three React-namespaced APIs",
        code: `
import React from "react";

export const a = React.useMemo(() => 1, []);
export const b = React.memo(Row);
export const c = React.useCallback(fn, []);
`,
        errors: [
          { message: "so a `useMemo` is allowed", line: 4, column: 18 },
          { message: "so a `memo` is allowed", line: 5, column: 18 },
          { message: "so a `useCallback` is allowed", line: 6, column: 18 },
        ],
      },
      {
        name: "a why: comment two lines above no longer covers the call",
        code: `
import { useMemo } from "react";

// why: measured at 12ms

export const value = useMemo(() => 1, []);
`,
        errors: [{ line: 6, column: 22 }],
      },
      {
        name: "a why: comment on the line below does not cover the call",
        code: `
import { useMemo } from "react";

export const value = useMemo(() => 1, []);
// why: measured at 12ms
`,
        errors: [{ line: 4, column: 22 }],
      },
      {
        name: "why: must start the comment",
        code: `
import { useMemo } from "react";

// TODO why: measure this properly
export const value = useMemo(() => 1, []);
`,
        errors: [{ line: 5, column: 22 }],
      },
      {
        name: "a comment that merely mentions why",
        code: `
import { useCallback } from "react";

// this is why we keep it
export const handler = useCallback(fn, []);
`,
        errors: 1,
      },
      {
        name: "one justified call and one bare call in the same file",
        code: `
import { useCallback, useMemo } from "react";

// why: measured at 12ms
export const total = useMemo(() => heavy(), []);
export const handler = useCallback(fn, []);
`,
        errors: [{ message: "so a `useCallback` is allowed", line: 6, column: 24 }],
      },
      {
        name: "a why: comment covers only the call whose line it precedes",
        code: `
import { useMemo } from "react";

export const a = useMemo(() => 1, []);
// why: measured at 12ms
export const b = useMemo(() => 2, []);
export const c = useMemo(() => 3, []);
`,
        errors: [
          { line: 4, column: 18 },
          { line: 7, column: 18 },
        ],
      },
      {
        name: "a bare call on the last line of a long file",
        code: `
import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";

export const Screen = ({ rows }: { rows: number[] }) => {
  // why: measured at 12ms on a mid-tier Android
  const total = useMemo(() => rows.reduce((a, b) => a + b, 0), [rows]);
  return (
    <View>
      <Text>{total}</Text>
    </View>
  );
};

export const handler = useCallback(fn, []);
`,
        errors: [{ message: "so a `useCallback` is allowed", line: 15, column: 24 }],
      },
      {
        name: "a multi-line call takes its line from where it starts",
        code: `
import { useMemo } from "react";

export const value = useMemo(
  // why: this comment is inside the call, not above it
  () => 1,
  []
);
`,
        errors: [{ line: 4, column: 22 }],
      },
    ],
  },

  "no-redundant-view-nesting": {
    valid: [
      {
        name: "a View wrapping something other than a View",
        code: `
import { Text, View } from "react-native";

export const Card = () => (
  <View style={styles.card}>
    <Text>hello</Text>
  </View>
);
`,
      },
      {
        name: "two children, so the wrapper is doing layout work",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.card}>
    <View style={styles.left} />
    <View style={styles.right} />
  </View>
);
`,
      },
      {
        name: "the outer view carries a prop other than style",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View testID="card" style={styles.card}>
    <View style={styles.inner} />
  </View>
);
`,
      },
      {
        name: "the inner view carries a prop other than style",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.card}>
    <View pointerEvents="none" style={styles.inner} />
  </View>
);
`,
      },
      {
        name: "the outer view spreads props",
        code: `
import { View } from "react-native";

export const Card = (props) => (
  <View {...props}>
    <View style={styles.inner} />
  </View>
);
`,
      },
      {
        name: "a text child alongside the inner view",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.card}>
    hello
    <View style={styles.inner} />
  </View>
);
`,
      },
      {
        name: "an expression child rather than an element",
        code: `
import { View } from "react-native";

export const Card = ({ children }) => <View style={styles.card}>{children}</View>;
`,
      },
      {
        name: "a fragment child is not a JSX element child",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.card}>
    <>
      <View style={styles.inner} />
    </>
  </View>
);
`,
      },
      {
        name: "a plain View wrapping an Animated.View",
        code: `
import { View } from "react-native";
import Animated from "react-native-reanimated";

export const Card = () => (
  <View style={styles.card}>
    <Animated.View style={styles.inner} />
  </View>
);
`,
      },
      {
        name: "an Animated.View wrapping a plain View",
        code: `
import { View } from "react-native";
import Animated from "react-native-reanimated";

export const Card = () => (
  <Animated.View style={styles.card}>
    <View style={styles.inner} />
  </Animated.View>
);
`,
      },
      {
        name: "a three-segment member tag is not a mergeable wrapper",
        code: `
export const Card = () => (
  <Layout.Stack.View style={styles.card}>
    <Layout.Stack.View style={styles.inner} />
  </Layout.Stack.View>
);
`,
      },
      {
        name: "a touchable wrapping a touchable is not a mergeable wrapper",
        code: `
import { Pressable } from "react-native";

export const Card = () => (
  <Pressable style={styles.card}>
    <Pressable style={styles.inner} />
  </Pressable>
);
`,
      },
      {
        name: "a self-closing View has no children",
        code: `
import { View } from "react-native";

export const Spacer = () => <View style={styles.spacer} />;
`,
      },
    ],
    invalid: [
      {
        name: "a styled View wrapping a styled View",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.outer}>
    <View style={styles.inner} />
  </View>
);
`,
        errors: [{ message: "Merge these two <View> style objects", line: 5, column: 4 }],
      },
      {
        name: "neither view carries any prop at all",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View>
    <View />
  </View>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "only the inner view carries a style",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View>
    <View style={styles.inner} />
  </View>
);
`,
        errors: 1,
      },
      {
        name: "an Animated.View wrapping an Animated.View",
        code: `
import Animated from "react-native-reanimated";

export const Card = () => (
  <Animated.View style={styles.outer}>
    <Animated.View style={styles.inner} />
  </Animated.View>
);
`,
        errors: [{ message: "Merge these two <Animated.View> style objects", line: 5, column: 4 }],
      },
      {
        name: "the inner view having children of its own does not excuse the wrapper",
        code: `
import { Text, View } from "react-native";

export const Card = () => (
  <View style={styles.outer}>
    <View style={styles.inner}>
      <Text>hello</Text>
    </View>
  </View>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "three nested views report twice",
        code: `
import { View } from "react-native";

export const Card = () => (
  <View style={styles.a}>
    <View style={styles.b}>
      <View style={styles.c} />
    </View>
  </View>
);
`,
        errors: [
          { line: 5, column: 4 },
          { line: 6, column: 6 },
        ],
      },
      {
        name: "two independent redundant pairs in one tree",
        code: `
import { View } from "react-native";

export const Screen = () => (
  <View style={styles.screen}>
    <View style={styles.a}>
      <View style={styles.aInner} />
    </View>
    <View style={styles.b}>
      <View style={styles.bInner} />
    </View>
  </View>
);
`,
        errors: [
          { line: 6, column: 6 },
          { line: 9, column: 6 },
        ],
      },
    ],
  },

  "no-rn-image-network-source": {
    valid: [
      {
        name: "a local require asset",
        code: `
import { Image } from "react-native";

export const Logo = () => <Image source={require("./logo.png")} />;
`,
      },
      {
        name: "a source object with no uri key",
        code: `
import { Image } from "react-native";

export const Logo = () => <Image source={{ width: 40, height: 40 }} />;
`,
      },
      {
        name: "a source held in a variable",
        code: `
import { Image } from "react-native";

export const Avatar = ({ source }) => <Image source={source} />;
`,
      },
      {
        name: "Image imported from somewhere other than react-native",
        code: `
import { Image } from "expo-image";

export const Avatar = ({ url }) => <Image source={{ uri: url }} />;
`,
      },
      {
        name: "a different component with the same source shape",
        code: `
import { Image } from "react-native";
import TurboImage from "react-native-turbo-image";

export const Avatar = ({ url }) => <TurboImage source={{ uri: url }} resize="cover" />;
`,
      },
      {
        name: "a default import is not a named Image specifier",
        code: `
import Image from "react-native";

export const Avatar = ({ url }) => <Image source={{ uri: url }} />;
`,
      },
      {
        name: "a namespace import registers no Image binding",
        code: `
import * as RN from "react-native";

export const Avatar = ({ url }) => <RN.Image source={{ uri: url }} />;
`,
      },
      {
        name: "the local alias, not the imported name, is the binding",
        code: `
import { Image as RNImage } from "react-native";

export const Avatar = ({ url }) => <Image source={{ uri: url }} />;
`,
      },
      {
        name: "the attribute is not named source",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }) => <Image src={{ uri: url }} />;
`,
      },
      {
        name: "the source arrives through a spread attribute",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }) => <Image {...{ source: { uri: url } }} />;
`,
      },
      {
        name: "the uri arrives through a spread property",
        code: `
import { Image } from "react-native";

export const Avatar = ({ remote }) => <Image source={{ ...remote }} />;
`,
      },
      {
        name: "documents current behaviour: an array source is not inspected",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }) => <Image source={[{ uri: url }]} />;
`,
      },
      {
        name: "a source string is not an object expression",
        code: `
import { Image } from "react-native";

export const Avatar = () => <Image source="logo" />;
`,
      },
    ],
    invalid: [
      {
        name: "a react-native Image with a uri source",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }: { url: string }) => (
  <Image source={{ uri: url }} style={styles.avatar} />
);
`,
        errors: [{ message: "TurboImage", line: 5, column: 4 }],
      },
      {
        name: "a shorthand uri property",
        code: `
import { Image } from "react-native";

export const Avatar = ({ uri }) => <Image source={{ uri }} />;
`,
        errors: [{ message: "no disk cache", line: 4, column: 37 }],
      },
      {
        name: "a string uri key",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }) => <Image source={{ "uri": url, cache: "force-cache" }} />;
`,
        errors: [{ line: 4, column: 37 }],
      },
      {
        name: "a computed uri key spelled as a string",
        code: `
import { Image } from "react-native";

export const Avatar = ({ url }) => <Image source={{ ["uri"]: url }} />;
`,
        errors: 1,
      },
      {
        name: "a default specifier alongside the named Image",
        code: `
import RN, { Image } from "react-native";

export const Avatar = ({ url }) => <Image source={{ uri: url }} />;
`,
        errors: [{ message: "TurboImage", line: 4, column: 37 }],
      },
      {
        name: "a spread property sitting before the uri",
        code: `
import { Image } from "react-native";

export const Avatar = ({ base, url }) => <Image source={{ ...base, uri: url }} />;
`,
        errors: [{ message: "no decode sizing", line: 4, column: 43 }],
      },
      {
        name: "the aliased local binding is what the tag must match",
        code: `
import { Image as RNImage } from "react-native";

export const Avatar = ({ url }) => <RNImage source={{ uri: url }} />;
`,
        errors: [{ line: 4, column: 37 }],
      },
      {
        name: "documents current behaviour: only the last tag segment is compared, so Animated.Image matches",
        code: `
import { Animated, Image } from "react-native";

export const Avatar = ({ url }) => <Animated.Image source={{ uri: url }} />;
`,
        errors: [{ line: 4, column: 37 }],
      },
      {
        name: "the import may follow the usage because matching happens at Program:exit",
        code: `
export const Avatar = ({ url }) => <Image source={{ uri: url }} />;

import { Image } from "react-native";
`,
        errors: [{ line: 2, column: 37 }],
      },
      {
        name: "two network images, one local asset",
        code: `
import { Image, View } from "react-native";

export const Row = ({ a, b }) => (
  <View>
    <Image source={{ uri: a }} />
    <Image source={require("./sep.png")} />
    <Image source={{ uri: b }} />
  </View>
);
`,
        errors: [
          { line: 6, column: 6 },
          { line: 8, column: 6 },
        ],
      },
    ],
  },

  "no-rn-namespace-import": {
    valid: [
      {
        name: "named imports",
        code: `
import { Platform, View } from "react-native";

export const isIos = Platform.OS === "ios";
`,
      },
      {
        name: "a default import",
        code: `
import RN from "react-native";

export const version = RN.version;
`,
      },
      {
        name: "a namespace import of a different package",
        code: `
import * as Reanimated from "react-native-reanimated";

export const withSpring = Reanimated.withSpring;
`,
      },
      {
        name: "a namespace import of a react-native subpath",
        code: `
import * as Platform from "react-native/Libraries/Utilities/Platform";

export const os = Platform.OS;
`,
      },
      {
        name: "a Platform re-export from another package",
        code: `
export { Platform } from "react-native-web";
`,
      },
      {
        name: "a local re-export with no source",
        code: `
import { Platform } from "react-native";

export { Platform };
`,
      },
      {
        name: "re-exporting something other than Platform",
        code: `
export { View, Text } from "react-native";
`,
      },
      {
        name: "the local name is what counts, and here it is View",
        code: `
export { View as Platform } from "react-native";
`,
      },
    ],
    invalid: [
      {
        name: "export * as leaks the namespace too",
        code: `
export * as RN from "react-native";
`,
        errors: 1,
      },
      {
        name: "export * leaks the namespace too",
        code: `
export * from "react-native";
`,
        errors: 1,
      },
      {
        name: "a namespace import of react-native",
        code: `
import * as RN from "react-native";

export const Screen = () => <RN.View style={styles.screen} />;
`,
        errors: [{ message: "defeats Metro platform shaking", line: 2, column: 8 }],
      },
      {
        name: "a type-only namespace import",
        code: `
import type * as RN from "react-native";

export type Props = RN.ViewProps;
`,
        errors: [{ message: "Import the react-native APIs by name", line: 2, column: 13 }],
      },
      {
        name: "a default import alongside the namespace reports only the namespace",
        code: `
import RN, * as All from "react-native";

export const os = All.Platform.OS;
`,
        errors: [{ line: 2, column: 12 }],
      },
      {
        name: "re-exporting Platform",
        code: `
export { Platform, View } from "react-native";
`,
        errors: [{ message: "Drop this re-export", line: 2, column: 10 }],
      },
      {
        name: "re-exporting Platform under another name",
        code: `
export { Platform as RNPlatform } from "react-native";
`,
        errors: [{ message: "defeats Metro platform shaking", line: 2, column: 10 }],
      },
      {
        name: "the same local re-exported twice",
        code: `
export { Platform, Platform as OS } from "react-native";
`,
        errors: [
          { line: 2, column: 10 },
          { line: 2, column: 20 },
        ],
      },
      {
        name: "a namespace import and a Platform re-export in one file",
        code: `
import * as RN from "react-native";

export { Platform } from "react-native";
`,
        errors: [
          { message: "Import the react-native APIs by name", line: 2, column: 8 },
          { message: "Drop this re-export", line: 4, column: 10 },
        ],
      },
    ],
  },

  "no-scroll-position-state": {
    valid: [
      {
        name: "a hoisted animated scroll handler",
        code: `
import { ScrollView } from "react-native";
import { useAnimatedScrollHandler } from "react-native-reanimated";

export const Screen = () => {
  const onScroll = useAnimatedScrollHandler(event => {
    offset.value = event.contentOffset.y;
  });
  return <ScrollView onScroll={onScroll} />;
};
`,
      },
      {
        name: "the handler writes to a ref instead of state",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ offset }) => (
  <ScrollView
    onScroll={event => {
      offset.current = event.nativeEvent.contentOffset.y;
    }}
  />
);
`,
      },
      {
        name: "the handler calls something that is not a setter",
        code: `
import { ScrollView } from "react-native";

export const Screen = () => <ScrollView onScroll={event => track(event)} />;
`,
      },
      {
        name: "a call whose name only starts with set",
        code: `
import { ScrollView } from "react-native";

export const Screen = () => <ScrollView onScroll={() => settle()} />;
`,
      },
      {
        name: "a call that only contains set plus a capital",
        code: `
import { ScrollView } from "react-native";

export const Screen = () => <ScrollView onScroll={() => resetView()} />;
`,
      },
      {
        name: "a bare set call is not a state setter",
        code: `
import { ScrollView } from "react-native";

export const Screen = () => <ScrollView onScroll={event => set(event)} />;
`,
      },
      {
        name: "a setter reached through a member expression",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ store }) => (
  <ScrollView onScroll={event => store.setOffset(event.nativeEvent.contentOffset.y)} />
);
`,
      },
      {
        name: "the setter is passed by reference, not called",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset }) => <ScrollView onScroll={setOffset} />;
`,
      },
      {
        name: "a setter in a handler that is not a scroll handler",
        code: `
import { ScrollView, View } from "react-native";

export const Screen = ({ setHeight }) => (
  <ScrollView onScroll={handler}>
    <View onLayout={event => setHeight(event.nativeEvent.layout.height)} />
  </ScrollView>
);
`,
      },
      {
        name: "onScrollToTop is not one of the guarded handlers",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setAtTop }) => <ScrollView onScrollToTop={() => setAtTop(true)} />;
`,
      },
      {
        name: "onMomentumScrollEnd on its own, writing to a ref rather than state",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ offset }) => (
  <ScrollView
    onMomentumScrollEnd={event => {
      offset.current = event.nativeEvent.contentOffset.y;
    }}
  />
);
`,
      },
    ],
    invalid: [
      {
        name: "onScroll calling a state setter",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset }) => (
  <ScrollView onScroll={event => setOffset(event.nativeEvent.contentOffset.y)} />
);
`,
        errors: [{ message: "re-renders the screen every frame", line: 5, column: 15 }],
      },
      {
        name: "onScrollBeginDrag calling a state setter",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setDragging }) => (
  <ScrollView onScrollBeginDrag={() => setDragging(true)} />
);
`,
        errors: [{ message: "useAnimatedScrollHandler", line: 5, column: 15 }],
      },
      {
        name: "onScrollEndDrag calling a state setter",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setDragging }) => (
  <ScrollView onScrollEndDrag={() => setDragging(false)} />
);
`,
        errors: [{ line: 5, column: 15 }],
      },
      {
        name: "onMomentumScrollEnd fires once the gate is opened by another handler",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset }) => (
  <ScrollView
    onScroll={handler}
    onMomentumScrollEnd={event => setOffset(event.nativeEvent.contentOffset.y)}
  />
);
`,
        errors: [{ line: 7, column: 5 }],
      },
      {
        name: "a function expression handler",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset }) => (
  <ScrollView
    onScroll={function (event) {
      setOffset(event.nativeEvent.contentOffset.y);
    }}
  />
);
`,
        errors: [{ line: 6, column: 5 }],
      },
      {
        name: "the setter is nested inside a branch and another callback",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset }) => (
  <ScrollView
    onScroll={event => {
      if (event.nativeEvent.contentOffset.y > 100) {
        requestAnimationFrame(() => {
          setOffset(event.nativeEvent.contentOffset.y);
        });
      }
    }}
  />
);
`,
        errors: [{ line: 6, column: 5 }],
      },
      {
        name: "a concise arrow body that is the setter call itself",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setY }) => <ScrollView onScroll={e => setY(e)} />;
`,
        errors: [{ line: 4, column: 49 }],
      },
      {
        name: "two offending handlers on one element",
        code: `
import { ScrollView } from "react-native";

export const Screen = ({ setOffset, setDragging }) => (
  <ScrollView
    onScroll={event => setOffset(event.nativeEvent.contentOffset.y)}
    onScrollEndDrag={() => setDragging(false)}
  />
);
`,
        errors: [
          { line: 6, column: 5 },
          { line: 7, column: 5 },
        ],
      },
    ],
  },

  "no-unlabeled-icon-pressable": {
    valid: [
      {
        name: "raw JSX text beside the icon is a visible label",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike}>
    <HeartIcon />
    Like
  </Pressable>
);
`,
      },
      {
        name: "whitespace-only JSX text is not a label",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike} accessibilityLabel="Like">
    <HeartIcon />
  </Pressable>
);
`,
      },
      {
        name: "an accessibilityLabel on the touchable",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable accessibilityLabel="Like" onPress={onLike}>
    <HeartIcon />
  </Pressable>
);
`,
      },
      {
        name: "an accessibilityHint is enough on its own",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable accessibilityHint="Likes this post" onPress={onLike}>
    <HeartIcon />
  </Pressable>
);
`,
      },
      {
        name: "a visible Text child",
        code: `
import { Pressable, Text } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike}>
    <HeartIcon />
    <Text>Like</Text>
  </Pressable>
);
`,
      },
      {
        name: "an expression child could render an accessible name",
        code: `
import { Pressable } from "react-native";

export const LikeButton = ({ label }) => (
  <Pressable onPress={onLike}>
    <HeartIcon />
    {label}
  </Pressable>
);
`,
      },
      {
        name: "the child is not icon-shaped",
        code: `
import { Pressable } from "react-native";

export const Row = () => (
  <Pressable onPress={onOpen}>
    <Chevron />
  </Pressable>
);
`,
      },
      {
        name: "IconButton does not end with Icon",
        code: `
import { TouchableOpacity } from "react-native";

export const LikeButton = () => (
  <TouchableOpacity onPress={onLike}>
    <IconButton name="heart" />
  </TouchableOpacity>
);
`,
      },
      {
        name: "an icon inside a plain View is not a touchable",
        code: `
import { View } from "react-native";

export const Badge = () => (
  <View>
    <HeartIcon />
  </View>
);
`,
      },
      {
        name: "documents current behaviour: only direct children are inspected",
        code: `
import { Pressable, View } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike}>
    <View style={styles.hitSlop}>
      <HeartIcon />
    </View>
  </Pressable>
);
`,
      },
      {
        name: "a self-closing touchable has no children",
        code: `
import { Pressable } from "react-native";

export const Backdrop = () => <Pressable style={styles.backdrop} onPress={onClose} />;
`,
      },
      {
        name: "TouchableWithoutFeedback is not one of the guarded touchables",
        code: `
import { TouchableWithoutFeedback } from "react-native";

export const LikeButton = () => (
  <TouchableWithoutFeedback onPress={onLike}>
    <HeartIcon />
  </TouchableWithoutFeedback>
);
`,
      },
      {
        name: "an Expo UI Button with a label",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus" label="Add" onPress={onAdd} />;
`,
      },
      {
        name: "an Expo UI Button with an accessibilityLabel",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus" accessibilityLabel="Add" />;
`,
      },
      {
        name: "an Expo UI Button with an accessibilityHint",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus" accessibilityHint="Adds an item" />;
`,
      },
      {
        name: "an Expo UI Button carrying modifiers",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus" modifiers={[accessibilityLabel("Add")]} />;
`,
      },
      {
        name: "a Button with no systemImage is not icon-only",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button onPress={onAdd} />;
`,
      },
      {
        name: "a Button with children is not self-closing",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus">Add</Button>;
`,
      },
      {
        name: "a different component carrying systemImage",
        code: `
export const AddChip = () => <Chip systemImage="plus" />;
`,
      },
    ],
    invalid: [
      {
        name: "a Pressable wrapping only an icon",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike}>
    <HeartIcon />
  </Pressable>
);
`,
        errors: [{ message: "accessibilityLabel", line: 5, column: 4 }],
      },
      {
        name: "a child tag that is exactly Icon",
        code: `
import { TouchableOpacity } from "react-native";

export const LikeButton = () => (
  <TouchableOpacity onPress={onLike}>
    <Icon name="heart" />
  </TouchableOpacity>
);
`,
        errors: [{ message: "visible `<Text>` child", line: 5, column: 4 }],
      },
      {
        name: "TouchableHighlight",
        code: `
import { TouchableHighlight } from "react-native";

export const LikeButton = () => (
  <TouchableHighlight onPress={onLike}>
    <HeartIcon />
  </TouchableHighlight>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "PressableScale",
        code: `
import { PressableScale } from "pressto";

export const LikeButton = () => (
  <PressableScale onPress={onLike}>
    <HeartIcon />
  </PressableScale>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "only the last tag segment is compared, so Animated.Pressable matches",
        code: `
import Animated from "react-native-reanimated";

export const LikeButton = () => (
  <Animated.Pressable onPress={onLike}>
    <HeartIcon />
  </Animated.Pressable>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "documents current behaviour: a spread cannot supply the accessible name",
        code: `
import { Pressable } from "react-native";

export const LikeButton = ({ a11y }) => (
  <Pressable {...a11y} onPress={onLike}>
    <HeartIcon />
  </Pressable>
);
`,
        errors: [{ line: 5, column: 4 }],
      },
      {
        name: "two icons still report once",
        code: `
import { Pressable } from "react-native";

export const LikeButton = () => (
  <Pressable onPress={onLike}>
    <HeartIcon />
    <StarIcon />
  </Pressable>
);
`,
        errors: 1,
      },
      {
        name: "an icon-only Expo UI Button",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage="plus" onPress={onAdd} />;
`,
        errors: [{ message: "Expo UI `<Button>`", line: 4, column: 33 }],
      },
      {
        name: "an animation wrapper of the Expo UI Button",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <AnimatedButton systemImage="plus" />;
`,
        errors: [{ message: "Add a `label`", line: 4, column: 33 }],
      },
      {
        name: "a valueless systemImage attribute still counts as present",
        code: `
import { Button } from "@expo/ui/swift-ui";

export const AddButton = () => <Button systemImage />;
`,
        errors: 1,
      },
      {
        name: "an unlabeled touchable and an unlabeled Expo Button in one file",
        code: `
import { Button } from "@expo/ui/swift-ui";
import { Pressable, View } from "react-native";

export const Toolbar = () => (
  <View>
    <Pressable onPress={onLike}>
      <HeartIcon />
    </Pressable>
    <Button systemImage="plus" onPress={onAdd} />
  </View>
);
`,
        errors: [
          { message: "icon-only touchable", line: 7, column: 6 },
          { message: "icon-only Expo UI", line: 10, column: 6 },
        ],
      },
    ],
  },
});
