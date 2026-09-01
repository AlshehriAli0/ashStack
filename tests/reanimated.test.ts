import reanimated from "../packages/lint/dist/react-native/rules/reanimated/index.js";
import { moduleTests } from "./harness.js";

moduleTests(reanimated, {
  "animated-reaction-safety": {
    valid: [
      {
        name: "scheduleOnRN guarded by current !== previous",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (onChange) => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => Math.round(offset.get() / 100),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(onChange, current);
      }
    }
  );
};
`,
      },
      {
        name: "loose != counts as a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (current != previous) scheduleOnRN(onChange, current);
    }
  );
};
`,
      },
      {
        name: "guard written the other way round",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (previous !== current) scheduleOnRN(onChange, current);
    }
  );
};
`,
      },
      {
        name: "negated Object.is counts as a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (!Object.is(current, previous)) scheduleOnRN(onChange, current);
    }
  );
};
`,
      },
      {
        name: "scheduleOnRN outside any reaction",
        code: `import { scheduleOnRN } from "react-native-worklets";
import { useAnimatedReaction } from "react-native-reanimated";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(() => offset.get(), (current) => current);
  return () => scheduleOnRN(onChange, 1);
};
`,
      },
      {
        name: "scheduleOnRN after the reaction has been left again",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(() => offset.get(), (current, previous) => {
    if (current !== previous) scheduleOnRN(onChange, current);
  });
  scheduleOnRN(onChange, 0);
};
`,
      },
      {
        name: "result callback is a hoisted reference, not a function literal",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
const react = (current) => scheduleOnRN(console.log, current);
export const useSync = (offset) => {
  useAnimatedReaction(() => offset.get(), react);
};
`,
      },
      {
        name: "result callback writes a shared value the prepare callback does not read",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useMirror = (offset) => {
  const shadow = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      shadow.set(current);
    }
  );
  return shadow;
};
`,
      },
      {
        name: "the write sits in the prepare callback, not the result callback",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useMirror = () => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => {
      offset.set(offset.get() + 1);
      return offset.get();
    },
    (current) => current
  );
};
`,
      },
      {
        name: "reaction called with a prepare callback only",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useMirror = () => {
  const offset = useSharedValue(0);
  useAnimatedReaction(() => offset.get());
};
`,
      },
      {
        name: "a bare set() call is not a shared value write",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { set } from "./store";
export const useMirror = (offset) => {
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      set(current);
    }
  );
};
`,
      },
      {
        name: "the write target is not a plain identifier receiver",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
export const useMirror = (state) => {
  useAnimatedReaction(
    () => state.offset.get(),
    (current) => {
      state.offset.set(current);
    }
  );
};
`,
      },
      {
        name: "documents that a prepare callback reading .value is not tracked",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useMirror = () => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => offset.value,
    (current) => {
      offset.set(current + 1);
    }
  );
};
`,
      },
      {
        name: "an unrelated call inside the result callback",
        code: `import { useAnimatedReaction, withTiming, useSharedValue } from "react-native-reanimated";
export const useMirror = (offset) => {
  const shadow = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      shadow.value = withTiming(current);
    }
  );
};
`,
      },
    ],
    invalid: [
      {
        name: "unguarded scheduleOnRN with both callback parameters",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (onChange) => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => Math.round(offset.get()),
    (current, previous) => {
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 8, column: 7 }],
      },
      {
        name: "result callback takes only the current value",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [
          { message: "Take the previous prepared result as the callback's second parameter", line: 7, column: 7 },
        ],
      },
      {
        name: "result callback takes no parameters at all",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(() => offset.get(), function () {
    scheduleOnRN(onChange);
  });
};
`,
        errors: [{ message: "Take the previous prepared result", line: 5, column: 5 }],
      },
      {
        name: "second parameter is destructured so it cannot be compared",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => ({ x: offset.get() }),
    (current, { x }) => {
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "Take the previous prepared result", line: 7, column: 7 }],
      },
      {
        name: "first parameter is destructured so the comparison cannot be recognised",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => ({ x: offset.get() }),
    ({ x }, previous) => {
      if (x !== previous) scheduleOnRN(onChange, x);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 27 }],
      },
      {
        name: "an equality guard is not a difference guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (current === previous) return;
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 8, column: 7 }],
      },
      {
        name: "guard compares the current value against a literal",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (current !== 0) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 26 }],
      },
      {
        name: "Object.is without the negation is not a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (Object.is(current, previous)) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 41 }],
      },
      {
        name: "negated Object.is against an unrelated name",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange, last) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (!Object.is(current, last)) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 38 }],
      },
      {
        name: "the guard is a sibling statement rather than an ancestor",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange, track) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (current !== previous) {
        track(current);
      }
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 10, column: 7 }],
      },
      {
        name: "result callback writes the shared value its prepare callback reads",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useLoop = () => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      offset.set(current + 1);
    }
  );
};
`,
        errors: [
          { message: "result callback write a shared value its prepare callback does not read", line: 7, column: 7 },
        ],
      },
      {
        name: "modify() feeding its own input reads as modify in the message",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useLoop = () => {
  const box = useSharedValue({ x: 0 });
  useAnimatedReaction(
    () => box.get().x,
    (current) => {
      box.modify((value) => {
        value.x = current + 1;
        return value;
      });
    }
  );
};
`,
        errors: [
          { message: "result callback modify a shared value its prepare callback does not read", line: 7, column: 7 },
        ],
      },
      {
        name: "the innermost reaction owns the write, not the outermost",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useLoop = () => {
  const outer = useSharedValue(0);
  const inner = useSharedValue(0);
  useAnimatedReaction(
    () => outer.get(),
    (current) => {
      useAnimatedReaction(
        () => inner.get(),
        () => {
          inner.set(1);
        }
      );
      outer.set(current);
    }
  );
};
`,
        errors: [
          { message: "feeding its own input loops forever", line: 11, column: 11 },
          { message: "feeding its own input loops forever", line: 14, column: 7 },
        ],
      },
      {
        name: "an equality guard and a truthiness guard both wrap the bridge without comparing difference",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (current === previous) {
        scheduleOnRN(onChange, current);
      }
      if (current && previous) {
        scheduleOnRN(onChange, current);
      }
    }
  );
};
`,
        errors: [
          { message: "comparing the current and previous prepared results", line: 8, column: 9 },
          { message: "comparing the current and previous prepared results", line: 11, column: 9 },
        ],
      },
      {
        name: "the guard compares the previous value against an unrelated name",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange, last) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (previous !== last) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 30 }],
      },
      {
        name: "a unary test that is not a negation is not a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (-Object.is(current, previous)) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 42 }],
      },
      {
        name: "a truthiness check on the previous value alone is not a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (!previous) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 22 }],
      },
      {
        name: "a negated helper that is not Object.is is not a guard",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { isSame } from "./compare";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      if (!isSame(current, previous)) scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 8, column: 39 }],
      },
      {
        name: "a destructured first parameter with a null guard on the previous one",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  useAnimatedReaction(
    () => ({ value: offset.get() }),
    ({ value }, previous) => {
      if (previous !== null) scheduleOnRN(onChange, value);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 7, column: 30 }],
      },
      {
        name: "a bridge in the prepare callback of a reaction whose result callback is hoisted",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
const handleChange = (current, previous) => [current, previous];
export const useSync = (offset, onChange, log) => {
  useAnimatedReaction(
    () => {
      scheduleOnRN(log);
      return offset.get();
    },
    handleChange
  );
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 15, column: 7 }],
      },
      {
        name: "a bridge outside the reaction ahead of one inside it",
        code: `import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useSync = (offset, onChange) => {
  scheduleOnRN(onChange, 0);
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [{ message: "comparing the current and previous prepared results", line: 8, column: 7 }],
      },
      {
        name: "a write loop and an unguarded bridge in the same reaction",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useLoop = (onChange) => {
  const offset = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (current, previous) => {
      offset.set(current + 1);
      scheduleOnRN(onChange, current);
    }
  );
};
`,
        errors: [
          { message: "feeding its own input loops forever", line: 8, column: 7 },
          { message: "comparing the current and previous prepared results", line: 9, column: 7 },
        ],
      },
    ],
  },

  "animated-style-needs-animated-component": {
    valid: [
      {
        name: "animated style on the matching Animated component",
        code: `import Animated, { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Animated.View style={cardStyle} />;
};
`,
      },
      {
        name: "component built with createAnimatedComponent",
        code: `import { Pressable } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
const Touchable = Animated.createAnimatedComponent(Pressable);
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Touchable style={cardStyle} />;
};
`,
      },
      {
        name: "component built with withUnistyles",
        code: `import { View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import { useAnimatedStyle } from "react-native-reanimated";
const Styled = withUnistyles(View);
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Styled style={cardStyle} />;
};
`,
      },
      {
        name: "component built with withAnimated",
        code: `import { View } from "react-native";
import { withAnimated } from "./hoc";
import { useAnimatedStyle } from "react-native-reanimated";
const Motion = withAnimated(View);
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Motion style={cardStyle} />;
};
`,
      },
      {
        name: "an import whose local name already starts with Animated",
        code: `import AnimatedLottieView from "lottie-react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Splash = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <AnimatedLottieView style={cardStyle} />;
};
`,
      },
      {
        name: "plain element with a plain style",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { styles } from "./styles";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={styles.card}>{cardStyle ? null : null}</View>;
};
`,
      },
      {
        name: "the animated value is passed through a prop that is not style",
        code: `import { Path } from "react-native-svg";
import { useAnimatedProps } from "react-native-reanimated";
export const Ring = () => {
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: 1 }));
  return <Path animatedProps={ringProps} />;
};
`,
      },
      {
        name: "no style is tracked when the declarator id is not an identifier",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = ({ style }) => {
  const [cardStyle] = [useAnimatedStyle(() => ({ opacity: 1 }))];
  return <View style={style}>{cardStyle ? null : null}</View>;
};
`,
      },
      {
        name: "a style bound from something other than a call is not tracked",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { base } from "./styles";
export const Card = () => {
  const fallback = base;
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={fallback}>{cardStyle ? null : null}</View>;
};
`,
      },
      {
        name: "style prop holding a call expression names no identifier",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={flatten(cardStyle)} />;
};
`,
      },
      {
        name: "style prop holding an inline object names no identifier",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={{ opacity: cardStyle ? 1 : 0 }} />;
};
`,
      },
      {
        name: "style array holding no plain identifiers",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { styles } from "./styles";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={[styles.card, { opacity: cardStyle ? 1 : 0 }]} />;
};
`,
      },
    ],
    invalid: [
      {
        name: "animated style on a plain View",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={cardStyle} />;
};
`,
        errors: [{ message: "Render this with the matching `Animated.*` component", line: 5, column: 16 }],
      },
      {
        name: "animated style inside a style array",
        code: `import { View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { styles } from "./styles";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <View style={[styles.card, cardStyle]} />;
};
`,
        errors: [{ message: "the style is applied once at mount", line: 6, column: 16 }],
      },
      {
        name: "useAnimatedProps result used as a style",
        code: `import { View } from "react-native";
import { useAnimatedProps } from "react-native-reanimated";
export const Card = () => {
  const cardProps = useAnimatedProps(() => ({ opacity: 1 }));
  return <View style={cardProps} />;
};
`,
        errors: [{ message: "Render this with the matching `Animated.*` component", line: 5, column: 16 }],
      },
      {
        name: "two plain elements report once each",
        code: `import { Text, View } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return (
    <View style={cardStyle}>
      <Text style={cardStyle}>hi</Text>
    </View>
  );
};
`,
        errors: [
          { message: "Render this with the matching", line: 6, column: 11 },
          { message: "Render this with the matching", line: 7, column: 13 },
        ],
      },
      {
        name: "style props that name no identifier are skipped before the one that does",
        code: `import { Text, View } from "react-native";
import { flatten } from "./styles";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return (
    <View style="card">
      <Text style={flatten(cardStyle)} />
      <Text style={cardStyle}>hi</Text>
    </View>
  );
};
`,
        errors: [{ message: "Render this with the matching", line: 9, column: 13 }],
      },
      {
        name: "a factory that is not one of the known three",
        code: `import { View } from "react-native";
import styled from "styled-components/native";
import { useAnimatedStyle } from "react-native-reanimated";
const Row = styled(View);
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Row style={cardStyle} />;
};
`,
        errors: [{ message: "Render this with the matching", line: 7, column: 15 }],
      },
      {
        name: "documents the false positive on a default import not named Animated",
        code: `import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Reanimated.View style={cardStyle} />;
};
`,
        errors: [{ message: "Render this with the matching", line: 4, column: 27 }],
      },
      {
        name: "a deeply namespaced tag never matches an animated component",
        code: `import { Ui } from "./ui";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Ui.Layout.Row style={cardStyle} />;
};
`,
        errors: [{ message: "Render this with the matching", line: 5, column: 25 }],
      },
      {
        name: "an aliased react-native import is still a plain element",
        code: `import { View as Box } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
export const Card = () => {
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  return <Box style={cardStyle} />;
};
`,
        errors: [{ message: "Render this with the matching", line: 5, column: 15 }],
      },
    ],
  },

  "animated-updater-purity": {
    valid: [
      {
        name: "a pure updater",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const progress = useSharedValue(0);
  return useAnimatedStyle(() => ({ opacity: progress.get() }));
};
`,
      },
      {
        name: "the write happens in an event handler, not the updater",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return { style, open: () => progress.set(1) };
};
`,
      },
      {
        name: "a write after the updater has been left again",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
  progress.set(1);
  return style;
};
`,
      },
      {
        name: "a bare set() call inside the updater is not a shared value write",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { set } from "./store";
export const useCard = (progress) =>
  useAnimatedStyle(() => {
    set(1);
    return { opacity: progress.get() };
  });
`,
      },
      {
        name: "scheduleOnRN in an animation completion callback",
        code: `import { useSharedValue, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useCard = (onDone) => {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const open = () => {
    progress.set(withTiming(1, {}, () => scheduleOnRN(onDone)));
  };
  return { style, open };
};
`,
      },
      {
        name: "writes inside useAnimatedReaction are allowed",
        code: `import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
export const useCard = (offset) => {
  const shadow = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      shadow.set(current);
    }
  );
};
`,
      },
      {
        name: "an unrelated method call inside the updater",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useCard = (progress, clamp) =>
  useAnimatedStyle(() => ({ opacity: clamp.apply(progress.get()) }));
`,
      },
    ],
    invalid: [
      {
        name: "shared value write inside useAnimatedStyle",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const opacity = useSharedValue(0);
  return useAnimatedStyle(() => {
    opacity.set(1);
    return { opacity: opacity.get() };
  });
};
`,
        errors: [{ message: "Move this `.set()` write out to an event handler", line: 5, column: 5 }],
      },
      {
        name: "modify inside useAnimatedStyle names modify in the message",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const box = useSharedValue({ x: 0 });
  return useAnimatedStyle(() => {
    box.modify((value) => value);
    return { opacity: 1 };
  });
};
`,
        errors: [{ message: "Move this `.modify()` write out to an event handler", line: 5, column: 5 }],
      },
      {
        name: "scheduleOnRN inside useAnimatedProps",
        code: `import { useAnimatedProps } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useRing = (progress, report) =>
  useAnimatedProps(() => {
    scheduleOnRN(report, progress.get());
    return { strokeDashoffset: progress.get() };
  });
`,
        errors: [{ message: "Schedule this RN side effect from an animation completion callback", line: 5, column: 5 }],
      },
      {
        name: "scheduleOnRN reached through a namespace",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import * as worklets from "react-native-worklets";
export const useCard = (progress, report) =>
  useAnimatedStyle(() => {
    worklets.scheduleOnRN(report);
    return { opacity: progress.get() };
  });
`,
        errors: [{ message: "Schedule this RN side effect", line: 5, column: 5 }],
      },
      {
        name: "two impurities in one updater",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useCard = (report) => {
  const opacity = useSharedValue(0);
  return useAnimatedStyle(() => {
    opacity.set(1);
    scheduleOnRN(report);
    return { opacity: opacity.get() };
  });
};
`,
        errors: [
          { message: "Move this `.set()` write out", line: 6, column: 5 },
          { message: "Schedule this RN side effect", line: 7, column: 5 },
        ],
      },
      {
        name: "a write nested two updaters deep still reports once",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const opacity = useSharedValue(0);
  return useAnimatedStyle(() => ({
    ...useAnimatedStyle(() => {
      opacity.set(1);
      return {};
    }),
  }));
};
`,
        errors: [{ message: "Move this `.set()` write out", line: 6, column: 7 }],
      },
      {
        name: "the hook reached through a namespace still opens an updater",
        code: `import * as Reanimated from "react-native-reanimated";
export const useCard = (opacity) =>
  Reanimated.useAnimatedStyle(() => {
    opacity.set(1);
    return { opacity: opacity.get() };
  });
`,
        errors: [{ message: "Move this `.set()` write out", line: 4, column: 5 }],
      },
    ],
  },

  "gpu-properties-only": {
    valid: [
      {
        name: "a destructuring pattern key is not a style key",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useBar = (props) =>
  useAnimatedStyle(() => {
    const { width } = props;
    return { opacity: width };
  });
`,
      },
      {
        name: "transform and opacity only",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const progress = useSharedValue(0);
  return useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: progress.get() * 8 }, { scaleY: progress.get() }],
  }));
};
`,
      },
      {
        name: "layout properties in static stylesheets around the updater",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
const CARD = { width: 200, marginTop: 8 };
export const useCard = () => useAnimatedStyle(() => ({ opacity: 1 }));
export const FOOTER = { height: 40, paddingHorizontal: 12 };
export const base = CARD;
`,
      },
      {
        name: "non-layout properties inside the updater",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useCard = () => {
  const progress = useSharedValue(0);
  return useAnimatedStyle(() => ({
    borderRadius: 12,
    backgroundColor: "#fff",
    flexGrow: 1,
    zIndex: 2,
    transformOrigin: "top",
  }));
};
`,
      },
      {
        name: "a computed key that is not a plain literal",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useCard = (key) => useAnimatedStyle(() => ({ [\`width\`]: 10, opacity: 1 }));
`,
      },
      {
        name: "a spread inside the animated style",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
import { base } from "./styles";
export const useCard = () => useAnimatedStyle(() => ({ ...base, opacity: 1 }));
`,
      },
      {
        name: "animated props that are not layout style properties",
        code: `import { useAnimatedProps } from "react-native-reanimated";
export const useRing = (progress) =>
  useAnimatedProps(() => ({ strokeWidth: 2, strokeDashoffset: progress.get() }));
`,
      },
    ],
    invalid: [
      {
        name: "width inside useAnimatedStyle",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useBar = () => {
  const size = useSharedValue(0);
  return useAnimatedStyle(() => ({ width: size.get() }));
};
`,
        errors: [{ message: "Animate `transform` and `opacity` instead", line: 4, column: 36 }],
      },
      {
        name: "three layout properties report three times",
        code: `import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
export const useBar = () => {
  const size = useSharedValue(0);
  return useAnimatedStyle(() => ({
    width: size.get(),
    height: size.get(),
    marginTop: 4,
    opacity: 1,
  }));
};
`,
        errors: [
          { message: "recalculates layout on every frame", line: 5, column: 5 },
          { message: "recalculates layout on every frame", line: 6, column: 5 },
          { message: "recalculates layout on every frame", line: 7, column: 5 },
        ],
      },
      {
        name: "a string literal key is still a layout property",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useBar = (size) => useAnimatedStyle(() => ({ "padding": size.get() }));
`,
        errors: [{ message: "recalculates layout", line: 2, column: 59 }],
      },
      {
        name: "a layout property alongside a transform",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useSheet = (progress) =>
  useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() }],
    paddingBottom: progress.get(),
  }));
`,
        errors: [{ message: "recalculates layout", line: 5, column: 5 }],
      },
      {
        name: "the flex boundary: flexBasis is a layout property, flexGrow is not",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useBar = (size) => useAnimatedStyle(() => ({ flexGrow: 1, flex: 1, flexBasis: size.get() }));
`,
        errors: [
          { message: "recalculates layout", line: 2, column: 72 },
          { message: "recalculates layout", line: 2, column: 81 },
        ],
      },
      {
        name: "gap properties are layout properties",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useRow = (size) =>
  useAnimatedStyle(() => ({ gap: size.get(), rowGap: 1, columnGap: 2 }));
`,
        errors: [
          { message: "recalculates layout", line: 3, column: 29 },
          { message: "recalculates layout", line: 3, column: 46 },
          { message: "recalculates layout", line: 3, column: 57 },
        ],
      },
      {
        name: "start and end are layout properties",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const usePin = (offset) => useAnimatedStyle(() => ({ start: offset.get(), end: 0 }));
`,
        errors: 2,
      },
      {
        name: "every layout property in the set reports",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useEverything = (size) =>
  useAnimatedStyle(() => ({
    width: size.get(),
    height: size.get(),
    minWidth: size.get(),
    minHeight: size.get(),
    maxWidth: size.get(),
    maxHeight: size.get(),
    top: size.get(),
    left: size.get(),
    right: size.get(),
    bottom: size.get(),
    start: size.get(),
    end: size.get(),
    flex: size.get(),
    flexBasis: size.get(),
    padding: size.get(),
    paddingTop: size.get(),
    paddingBottom: size.get(),
    paddingLeft: size.get(),
    paddingRight: size.get(),
    paddingStart: size.get(),
    paddingEnd: size.get(),
    paddingHorizontal: size.get(),
    paddingVertical: size.get(),
    margin: size.get(),
    marginTop: size.get(),
    marginBottom: size.get(),
    marginLeft: size.get(),
    marginRight: size.get(),
    marginStart: size.get(),
    marginEnd: size.get(),
    marginHorizontal: size.get(),
    marginVertical: size.get(),
    gap: size.get(),
    rowGap: size.get(),
    columnGap: size.get(),
    opacity: 1,
    transform: [{ scaleY: 1 }],
  }));
`,
        errors: 35,
      },
      {
        name: "layout property inside useAnimatedProps",
        code: `import { useAnimatedProps } from "react-native-reanimated";
export const useRing = (progress) => useAnimatedProps(() => ({ height: progress.get() }));
`,
        errors: [{ message: "recalculates layout", line: 2, column: 64 }],
      },
      {
        name: "documents that any object inside the updater is checked, not just the returned style",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useBar = (progress) =>
  useAnimatedStyle(() => {
    const config = { duration: 200, top: 0 };
    return { opacity: progress.get() * config.duration };
  });
`,
        errors: [{ message: "recalculates layout", line: 4, column: 37 }],
      },
    ],
  },

  "hoist-layout-animation-builder": {
    valid: [
      {
        name: "a builder already wrapped in useMemo",
        code: `import { useMemo } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
export const Row = ({ ms }) => <Animated.View entering={useMemo(() => FadeIn.duration(ms), [ms])} />;
`,
      },
      {
        name: "builder hoisted to module scope",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
const ENTER = FadeIn.duration(200);
export const Row = () => <Animated.View entering={ENTER} />;
`,
      },
      {
        name: "the JSX itself lives at module scope",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const element = <Animated.View entering={FadeIn.duration(200)} />;
`,
      },
      {
        name: "a bare builder reference with no configuration call",
        code: `import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
export const Row = () => <Animated.View entering={FadeIn} layout={LinearTransition} />;
`,
      },
      {
        name: "an attribute that is not a layout animation prop",
        code: `import Animated, { FadeOut } from "react-native-reanimated";
export const Row = () => <Animated.View exit={FadeOut.duration(200)} />;
`,
      },
      {
        name: "a method call that is not a builder method",
        code: `import Animated from "react-native-reanimated";
import { presets } from "./presets";
export const Row = () => <Animated.View entering={presets.get("in")} />;
`,
      },
      {
        name: "a call whose callee is a plain identifier",
        code: `import Animated from "react-native-reanimated";
import { makeEnter } from "./presets";
export const Row = () => <Animated.View entering={makeEnter(200)} />;
`,
      },
      {
        name: "the builder is memoized into a variable first",
        code: `import { useMemo } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
export const Row = ({ ms }) => {
  const entering = useMemo(() => FadeIn.duration(ms), [ms]);
  return <Animated.View entering={entering} />;
};
`,
      },
      {
        name: "a namespaced attribute name is not a layout animation prop",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const Row = () => <Animated.View data:entering={FadeIn.duration(200)} />;
`,
      },
      {
        name: "a valueless layout attribute",
        code: `import Animated from "react-native-reanimated";
export const Row = () => <Animated.View layout />;
`,
      },
    ],
    invalid: [
      {
        name: "builder built inline inside a component",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const Row = () => <Animated.View entering={FadeIn.duration(200)} />;
`,
        errors: [{ message: "Build this layout animation at module scope", line: 2, column: 51 }],
      },
      {
        name: "a chained builder reports once, at the outermost call",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const Row = () => <Animated.View entering={FadeIn.springify().damping(15)} />;
`,
        errors: [{ message: "Build this layout animation at module scope", line: 2, column: 51 }],
      },
      {
        name: "entering and exiting on one element report once each",
        code: `import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
export const Row = () => (
  <Animated.View
    entering={FadeIn.easing(cubic)}
    exiting={FadeOut.withCallback(done)}
    layout={LinearTransition.withInitialValues({})}
  />
);
`,
        errors: [
          { message: "Build this layout animation", line: 4, column: 15 },
          { message: "Build this layout animation", line: 5, column: 14 },
          { message: "Build this layout animation", line: 6, column: 13 },
        ],
      },
      {
        name: "a builder hidden inside a conditional prop value",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const Row = ({ open }) => <Animated.View entering={open ? FadeIn.delay(100) : undefined} />;
`,
        errors: [{ message: "Build this layout animation", line: 2, column: 66 }],
      },
      {
        name: "inside a render callback rather than a component body",
        code: `import { FlatList } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
export const List = ({ data }) => (
  <FlatList
    data={data}
    renderItem={({ item }) => <Animated.View entering={FadeIn.mass(2)} key={item.id} />}
  />
);
`,
        errors: [{ message: "Build this layout animation", line: 6, column: 56 }],
      },
      {
        name: "documents that the rule matches on method name alone",
        code: `import Animated from "react-native-reanimated";
export const Row = ({ video }) => <Animated.View entering={video.duration(3)} />;
`,
        errors: [{ message: "Build this layout animation", line: 2, column: 60 }],
      },
      {
        name: "every builder method in the set reports",
        code: `import Animated, { FadeIn } from "react-native-reanimated";
export const Row = ({ ease, done }) => (
  <>
    <Animated.View entering={FadeIn.duration(1)} />
    <Animated.View entering={FadeIn.delay(1)} />
    <Animated.View entering={FadeIn.springify()} />
    <Animated.View entering={FadeIn.damping(1)} />
    <Animated.View entering={FadeIn.stiffness(1)} />
    <Animated.View entering={FadeIn.mass(1)} />
    <Animated.View entering={FadeIn.easing(ease)} />
    <Animated.View entering={FadeIn.withCallback(done)} />
    <Animated.View entering={FadeIn.withInitialValues({})} />
    <Animated.View entering={FadeIn.withTargetValues({})} />
  </>
);
`,
        errors: 10,
      },
      {
        name: "a layout prop with no builder call sits ahead of one with a builder call",
        code: `import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
export const Row = () => (
  <Animated.View layout={LinearTransition} entering={FadeIn.duration(200)} />
);
`,
        errors: [{ message: "Build this layout animation", line: 3, column: 54 }],
      },
      {
        name: "spring builder methods",
        code: `import Animated, { SlideInLeft } from "react-native-reanimated";
export const Row = () => <Animated.View entering={SlideInLeft.stiffness(120)} />;
`,
        errors: 1,
      },
    ],
  },

  "interpolate-needs-clamp": {
    valid: [
      {
        name: "a computed fourth argument is not an extrapolation this rule reads",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value, kind) => interpolate(value, [0, 1], [0, 1], modeFor(kind));
`,
      },
      {
        name: "a numeric fourth argument is not an extrapolation this rule reads",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], 0);
`,
      },
      {
        name: "a five-argument call is not the interpolate this rule knows",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], "clamp", extra);
`,
      },
      {
        name: "a spread argument hides the argument count",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value, ranges) => interpolate(value, ...ranges);
`,
      },
      {
        name: "an empty config object clamps nothing but names nothing either",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], {});
`,
      },
      {
        name: "four arguments with an explicit extrapolation",
        code: `import { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
export const useHeader = (scroll) =>
  useAnimatedStyle(() => ({
    opacity: interpolate(scroll.get(), [0, 100], [1, 0], Extrapolation.CLAMP),
  }));
`,
      },
      {
        name: "a clamping fourth argument",
        code: `import { Extrapolation, interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP);
`,
      },
      {
        name: "the legacy Extrapolate namespace, clamping",
        code: `import { Extrapolate, interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], Extrapolate.CLAMP);
`,
      },
      {
        name: "a string extrapolation that clamps",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], "clamp");
`,
      },
      {
        name: "an extrapolation this rule cannot read stays quiet",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value, mode) => interpolate(value, [0, 1], [0, 1], mode);
`,
      },
      {
        name: "a config object that clamps both ends",
        code: `import { Extrapolation, interpolate } from "react-native-reanimated";
export const fade = (value) =>
  interpolate(value, [0, 1], [0, 1], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP });
`,
      },
      {
        name: "two arguments",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1]);
`,
      },
      {
        name: "no arguments",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = () => interpolate();
`,
      },
      {
        name: "three arguments where the last is a spread",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value, ranges) => interpolate(value, [0, 1], ...ranges);
`,
      },
      {
        name: "a spread in the middle of three arguments",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value, input) => interpolate(value, ...input, [0, 1]);
`,
      },
      {
        name: "interpolate reached through a namespace",
        code: `import * as Reanimated from "react-native-reanimated";
export const fade = (value) => Reanimated.interpolate(value, [0, 1], [1, 0]);
`,
      },
      {
        name: "interpolateColor is a different function",
        code: `import { interpolateColor } from "react-native-reanimated";
export const tint = (value) => interpolateColor(value, [0, 1], ["#000", "#fff"]);
`,
      },
    ],
    invalid: [
      {
        name: "Extrapolation.EXTEND as the fourth argument",
        code: `import { Extrapolation, interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], Extrapolation.EXTEND);
`,
        errors: [{ message: "`EXTEND` and `IDENTITY`", line: 2, column: 67 }],
      },
      {
        name: "Extrapolation.IDENTITY as the fourth argument",
        code: `import { Extrapolation, interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], Extrapolation.IDENTITY);
`,
        errors: 1,
      },
      {
        name: "a bare EXTEND identifier as the fourth argument",
        code: `import { EXTEND, interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], EXTEND);
`,
        errors: 1,
      },
      {
        name: "the string form of a non-clamping extrapolation",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [0, 1], "extend");
`,
        errors: 1,
      },
      {
        name: "a config object whose right end extends",
        code: `import { Extrapolation, interpolate } from "react-native-reanimated";
export const fade = (value) =>
  interpolate(value, [0, 1], [0, 1], { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.EXTEND });
`,
        errors: 1,
      },
      {
        name: "three arguments inside an animated style",
        code: `import { interpolate, useAnimatedStyle } from "react-native-reanimated";
export const useHeader = (scroll) =>
  useAnimatedStyle(() => ({ opacity: interpolate(scroll.get(), [0, 100], [1, 0]) }));
`,
        errors: [
          {
            message:
              "Pass `Extrapolation.CLAMP` as the fourth argument to `interpolate`. Without it the output keeps extrapolating past the input range, so a scroll offset of 400 against `[0, 100]` runs well past where it should stop.",
            line: 3,
            column: 38,
          },
        ],
      },
      {
        name: "two calls in one file",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(value, [0, 1], [1, 0]);
export const lift = (value) => interpolate(value, [0, 1], [0, 24]);
`,
        errors: [
          { message: "keeps extrapolating past the input range", line: 2, column: 32 },
          {
            message: "keeps extrapolating past the input range",
            line: 3,
            column: 32,
          },
        ],
      },
      {
        name: "nested calls report at both levels",
        code: `import { interpolate } from "react-native-reanimated";
export const fade = (value) => interpolate(interpolate(value, [0, 1], [0, 2]), [0, 2], [1, 0]);
`,
        errors: [
          { line: 2, column: 32 },
          { line: 2, column: 44 },
        ],
      },
    ],
  },

  "no-react-state-from-continuous-worklet": {
    valid: [
      {
        name: "a non-function, non-identifier first argument names no setter",
        code: `import { useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
import { useAnimatedScrollHandler } from "react-native-reanimated";
export const useTop = () => {
  const [top, setTop] = useState(0);
  const handler = useAnimatedScrollHandler(event => {
    scheduleOnRN(handlers[event.kind], event.contentOffset.y);
  });
  return { top, handler };
};
`,
      },
      {
        name: "the setter is bridged from an event handler, not a worklet",
        code: `import { useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
export const useToggle = () => {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => scheduleOnRN(setOpen, !open) };
};
`,
      },
      {
        name: "scheduleOnRN imported from reanimated rather than worklets",
        code: `import { useState } from "react";
import { scheduleOnRN, useAnimatedReaction } from "react-native-reanimated";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
      },
      {
        name: "useState imported from somewhere other than react",
        code: `import { useState } from "preact/hooks";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
      },
      {
        name: "a namespace import of react does not register useState",
        code: `import * as React from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = React.useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
      },
      {
        name: "the bridged function is not a state setter",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset, track) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(track, current);
    }
  );
  return visible;
};
`,
      },
      {
        name: "an aliased useState import leaves the setter unregistered",
        code: `import { useState as useLocalState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useLocalState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
      },
      {
        name: "a single-element array pattern has no setter",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    () => {
      scheduleOnRN(visible);
    }
  );
};
`,
      },
      {
        name: "useReducer is not useState",
        code: `import { useReducer, useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset, reducer) => {
  const [state, dispatch] = useReducer(reducer, false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(dispatch, current);
    }
  );
  return state;
};
`,
      },
      {
        name: "a setter handed to a call that is not scheduleOnRN",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset, runLater) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      runLater(setVisible, current);
    }
  );
  return { visible, sync: () => scheduleOnRN(setVisible, true) };
};
`,
      },
      {
        name: "a setter bridged from a hook that is not continuously evaluated",
        code: `import { useEffect, useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    scheduleOnRN(setVisible, offset > 100);
  }, [offset]);
  return visible;
};
`,
      },
    ],
    invalid: [
      {
        name: "two setters inside one inline callback each report",
        code: `import { useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
import { useAnimatedScrollHandler } from "react-native-reanimated";
export const useTop = () => {
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);
  const handler = useAnimatedScrollHandler(event => {
    scheduleOnRN(() => {
      setTop(event.contentOffset.y);
      setLeft(event.contentOffset.x);
    });
  });
  return { top, left, handler };
};
`,
        errors: 2,
      },
      {
        name: "a setter called inside an inline scheduleOnRN callback",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(() => setVisible(current));
    }
  );
  return visible;
};
`,
        errors: 1,
      },
      {
        name: "state setter bridged out of useAnimatedReaction",
        code: `import { useState } from "react";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
        errors: [{ message: "Keep this gate in shared or native state", line: 9, column: 7 }],
      },
      {
        name: "state setter bridged out of useFrameCallback",
        code: `import { useState } from "react";
import { useFrameCallback } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useTick = () => {
  const [tick, setTick] = useState(0);
  useFrameCallback(() => {
    scheduleOnRN(setTick, 1);
  });
  return tick;
};
`,
        errors: [{ message: "A continuously evaluated worklet that schedules React state", line: 7, column: 5 }],
      },
      {
        name: "state setter bridged out of useDerivedValue",
        code: `import { useState } from "react";
import { useDerivedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useMirror = (offset) => {
  const [mirror, setMirror] = useState(0);
  useDerivedValue(() => {
    scheduleOnRN(setMirror, offset.get());
    return offset.get();
  });
  return mirror;
};
`,
        errors: 1,
      },
      {
        name: "state setter bridged out of useAnimatedStyle",
        code: `import { useState } from "react";
import { useAnimatedStyle } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useCard = (progress) => {
  const [shown, setShown] = useState(false);
  return useAnimatedStyle(() => {
    scheduleOnRN(setShown, true);
    return { opacity: progress.get() };
  });
};
`,
        errors: 1,
      },
      {
        name: "state setter bridged out of useAnimatedProps",
        code: `import { useState } from "react";
import { useAnimatedProps } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useRing = (progress) => {
  const [shown, setShown] = useState(false);
  return useAnimatedProps(() => {
    scheduleOnRN(setShown, true);
    return { strokeDashoffset: progress.get() };
  });
};
`,
        errors: 1,
      },
      {
        name: "state setter bridged out of useAnimatedScrollHandler",
        code: `import { useState } from "react";
import { useAnimatedScrollHandler } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useHeader = () => {
  const [pinned, setPinned] = useState(false);
  return useAnimatedScrollHandler((event) => {
    scheduleOnRN(setPinned, event.contentOffset.y > 0);
  });
};
`,
        errors: 1,
      },
      {
        name: "a hole in the array pattern still leaves the setter at index one",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
};
`,
        errors: [{ line: 9, column: 7 }],
      },
      {
        name: "two setters bridged from the same worklet",
        code: `import React, { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      scheduleOnRN(setVisible, current > 100);
      scheduleOnRN(setTop, current);
    }
  );
  return React.useMemo(() => ({ visible, top }), [visible, top]);
};
`,
        errors: [
          { line: 10, column: 7 },
          { line: 11, column: 7 },
        ],
      },
      {
        name: "declarators that are not a useState array pattern",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset, range) => {
  const [min, max] = range;
  const pair = useState(0);
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > min,
    (current) => {
      scheduleOnRN(setVisible, current);
    }
  );
  return visible ? max : min + pair[0];
};
`,
        errors: [{ line: 11, column: 7 }],
      },
      {
        name: "a bare scheduleOnRN ahead of one carrying a setter",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() > 100,
    (current) => {
      scheduleOnRN();
      scheduleOnRN(setVisible, current);
    }
  );
  return visible;
};
`,
        errors: [{ line: 10, column: 7 }],
      },
      {
        name: "the bridge sits in a helper nested inside the worklet",
        code: `import { useState } from "react";
import { useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
export const useVisible = (offset) => {
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      const commit = () => {
        scheduleOnRN(setVisible, current > 100);
      };
      commit();
    }
  );
  return visible;
};
`,
        errors: [{ line: 10, column: 9 }],
      },
    ],
  },

  "no-shared-value-dot-value": {
    valid: [
      {
        name: "get and set accessors",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  progress.set(progress.get() + 1);
  return progress.get();
};
`,
      },
      {
        name: "a .value on something that is not a shared value",
        code: `export const readInput = (event) => event.target.value;
`,
      },
      {
        name: "an optional chain is left alone",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  return progress?.value;
};
`,
      },
      {
        name: "a computed member access is left alone",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  return progress["value"];
};
`,
      },
      {
        name: "the object is not a plain identifier",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const state = { progress: useSharedValue(0) };
  return state.progress.value;
};
`,
      },
      {
        name: "a property that merely starts with value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  return progress.valueOf();
};
`,
      },
      {
        name: "a shared value assigned outside a declarator is not tracked",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  let progress;
  progress = useSharedValue(0);
  return progress.value;
};
`,
      },
      {
        name: "documents that a remainder assignment is not rewritten",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const index = useSharedValue(0);
  const step = () => {
    index.value %= 3;
  };
  return step;
};
`,
      },
      {
        name: "documents that a logical assignment is not rewritten",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const label = useSharedValue(null);
  const step = () => {
    label.value ??= "idle";
  };
  return step;
};
`,
      },
      {
        name: "a hook result that is not a shared value producer",
        code: `import { useAnimatedStyle } from "react-native-reanimated";
export const useCard = () => {
  const style = useAnimatedStyle(() => ({ opacity: 1 }));
  return style.value;
};
`,
      },
    ],
    invalid: [
      {
        name: "a namespaced producer call is still a producer",
        code: `import * as Reanimated from "react-native-reanimated";
export const useProgress = () => {
  const progress = Reanimated.useSharedValue(0);
  return progress.value;
};
`,
        errors: 1,
      },
      {
        name: "reading through .value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  return progress.value;
};
`,
        errors: [{ message: "Read this shared value with `.get()`", line: 4, column: 10 }],
      },
      {
        name: "writing through .value reports once, on the assignment",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  const reset = () => {
    progress.value = 0;
  };
  return reset;
};
`,
        errors: [{ message: "Write this shared value with `.set(...)`", line: 5, column: 5 }],
      },
      {
        name: "a compound write reports once, with the compound message",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  const step = () => {
    progress.value += 1;
  };
  return step;
};
`,
        errors: [{ message: "Write this shared value with `.set(v => ...)`", line: 5, column: 5 }],
      },
      {
        name: "every compound operator in the map",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(1);
  const step = () => {
    progress.value -= 1;
    progress.value *= 2;
    progress.value /= 3;
  };
  return step;
};
`,
        errors: [
          { message: "`.set(v => ...)`", line: 5, column: 5 },
          { message: "`.set(v => ...)`", line: 6, column: 5 },
          { message: "`.set(v => ...)`", line: 7, column: 5 },
        ],
      },
      {
        name: "an increment reads as a compound write",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const index = useSharedValue(0);
  const next = () => {
    index.value++;
  };
  return next;
};
`,
        errors: [{ message: "Write this shared value with `.set(v => ...)`", line: 5, column: 5 }],
      },
      {
        name: "every producer hook is tracked",
        code: `import {
  makeMutable,
  useDerivedValue,
  useScrollOffset,
  useScrollViewOffset,
} from "react-native-reanimated";
const seed = makeMutable(0);
export const useAll = (ref, base) => {
  const derived = useDerivedValue(() => base.get());
  const offset = useScrollOffset(ref);
  const legacy = useScrollViewOffset(ref);
  return [seed.value, derived.value, offset.value, legacy.value];
};
`,
        errors: [
          { message: "Read this shared value", line: 12, column: 11 },
          { message: "Read this shared value", line: 12, column: 23 },
          { message: "Read this shared value", line: 12, column: 38 },
          { message: "Read this shared value", line: 12, column: 52 },
        ],
      },
      {
        name: "a use above the declaration is still reported",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  function read() {
    return progress.value;
  }
  const progress = useSharedValue(0);
  return read;
};
`,
        errors: [{ message: "Read this shared value", line: 4, column: 12 }],
      },
      {
        name: "a write whose right-hand side is another read",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const from = useSharedValue(0);
  const to = useSharedValue(1);
  const sync = () => {
    to.value = from.value;
  };
  return sync;
};
`,
        errors: [
          { message: "Write this shared value with `.set(...)`", line: 6, column: 5 },
          { message: "Read this shared value with `.get()`", line: 6, column: 16 },
        ],
      },
      {
        name: "a read while JSX is built",
        code: `import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Label = () => {
  const progress = useSharedValue(0);
  return <Text>{progress.value}</Text>;
};
`,
        errors: [{ message: "Read this shared value", line: 5, column: 17 }],
      },
    ],
  },

  "prefer-lazy-shared-value-initializer": {
    valid: [
      {
        name: "a literal initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => useSharedValue(0);
`,
      },
      {
        name: "a lazy initializer",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => useSharedValue(() => measureHeader());
`,
      },
      {
        name: "no argument at all",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => useSharedValue();
`,
      },
      {
        name: "a member expression initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = (props) => useSharedValue(props.initial);
`,
      },
      {
        name: "documents that a method call initializer is not caught",
        code: `import { useSharedValue } from "react-native-reanimated";
import { layout } from "./layout";
export const useHeader = () => useSharedValue(layout.measure());
`,
      },
      {
        name: "the hook reached through a namespace is not checked",
        code: `import * as Reanimated from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => Reanimated.useSharedValue(measureHeader());
`,
      },
      {
        name: "an array literal initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const usePoints = () => useSharedValue([]);
`,
      },
      {
        name: "a conditional initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = (open) => useSharedValue(open ? 1 : 0);
`,
      },
      {
        name: "an eager call nested inside a lazy initializer",
        code: `import { useSharedValue } from "react-native-reanimated";
import { clamp, measureHeader } from "./layout";
export const useHeader = () => useSharedValue(() => clamp(measureHeader(), 0, 100));
`,
      },
      {
        name: "a function passed by reference",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => useSharedValue(measureHeader);
`,
      },
    ],
    invalid: [
      {
        name: "an eager call as the initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => {
  const height = useSharedValue(measureHeader());
  return height;
};
`,
        errors: [{ message: "Wrap this in a lazy initializer", line: 4, column: 18 }],
      },
      {
        name: "a constructor call as the initial value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useStart = () => useSharedValue(new Date());
`,
        errors: [{ message: "the eager call runs on every React render", line: 2, column: 31 }],
      },
      {
        name: "a namespaced constructor is still a NewExpression",
        code: `import { useSharedValue } from "react-native-reanimated";
import { Skia } from "@shopify/react-native-skia";
export const usePath = () => useSharedValue(new Skia.Path());
`,
        errors: 1,
      },
      {
        name: "an animation call as the initial value",
        code: `import { useSharedValue, withTiming } from "react-native-reanimated";
export const useProgress = () => useSharedValue(withTiming(1));
`,
        errors: [{ line: 2, column: 34 }],
      },
      {
        name: "an argumentless call ahead of an eager one",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => {
  const flag = useSharedValue();
  const height = useSharedValue(measureHeader());
  return { flag, height };
};
`,
        errors: [{ line: 5, column: 18 }],
      },
      {
        name: "two eager initializers report once each",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader, measureFooter } from "./layout";
export const useLayout = () => {
  const header = useSharedValue(measureHeader());
  const footer = useSharedValue(measureFooter());
  return { header, footer };
};
`,
        errors: [
          { line: 4, column: 18 },
          { line: 5, column: 18 },
        ],
      },
      {
        name: "extra arguments do not change the first one",
        code: `import { useSharedValue } from "react-native-reanimated";
import { measureHeader } from "./layout";
export const useHeader = () => useSharedValue(measureHeader(), true);
`,
        errors: 1,
      },
    ],
  },

  "schedule-on-rn-scope": {
    valid: [
      {
        name: "a named function reference",
        code: `import { useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
export const useDone = () => {
  const [done, setDone] = useState(false);
  return { done, finish: () => scheduleOnRN(setDone, true) };
};
`,
      },
      {
        name: "a member expression reference",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const finish = (handlers) => scheduleOnRN(handlers.onDone, 1);
`,
      },
      {
        name: "no arguments",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const finish = () => scheduleOnRN();
`,
      },
      {
        name: "scheduleOnUI is a different function",
        code: `import { scheduleOnUI } from "react-native-worklets";
export const start = () => scheduleOnUI(() => 1);
`,
      },
      {
        name: "an inline callback to something that is not scheduleOnRN",
        code: `import { scheduleOnRN } from "react-native-worklets";
import { InteractionManager } from "react-native";
export const finish = (onDone) => {
  InteractionManager.runAfterInteractions(() => onDone());
  scheduleOnRN(onDone);
};
`,
      },
    ],
    invalid: [
      {
        name: "an inline arrow callback",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const useDone = (setDone) => () => {
  scheduleOnRN(() => setDone(true));
};
`,
        errors: [{ message: "Pass a function declared in RN Runtime scope", line: 3, column: 16 }],
      },
      {
        name: "an inline function expression",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const finish = (onDone) => {
  scheduleOnRN(function commit() {
    onDone();
  });
};
`,
        errors: [{ message: "an inline callback has ambiguous runtime ownership", line: 3, column: 16 }],
      },
      {
        name: "only the callback itself reports, not a function nested inside it",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const finish = (run, onDone) => {
  scheduleOnRN(() => run(() => onDone()));
};
`,
        errors: [{ line: 3, column: 16 }],
      },
      {
        name: "a function declaration inside the callback is not itself reported",
        code: `import { scheduleOnRN } from "react-native-worklets";
export const finish = (onDone) => {
  scheduleOnRN(() => {
    function commit() {
      return onDone();
    }
    return commit();
  });
};
`,
        errors: [{ line: 3, column: 16 }],
      },
      {
        name: "scheduleOnRN reached through a namespace",
        code: `import * as worklets from "react-native-worklets";
export const finish = (onDone) => {
  worklets.scheduleOnRN(() => onDone());
};
`,
        errors: [{ line: 3, column: 25 }],
      },
    ],
  },

  "shared-value-usage": {
    valid: [
      {
        name: "a read outside JSX",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const progress = useSharedValue(0);
  const snapshot = progress.get();
  return snapshot;
};
`,
      },
      {
        name: "a write inside an event handler passed through JSX",
        code: `import { Pressable } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Button = () => {
  const progress = useSharedValue(0);
  return <Pressable onPress={() => progress.set(1)} />;
};
`,
      },
      {
        name: "documents that any function in the container suppresses the report",
        code: `import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Label = ({ items }) => {
  const progress = useSharedValue(0);
  return <Text>{items.map((item) => item.id).length + progress.get()}</Text>;
};
`,
      },
      {
        name: "destructuring accessors rather than the value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const { get, set } = useSharedValue(0);
  return { get, set };
};
`,
      },
      {
        name: "documents that only useSharedValue destructuring is checked",
        code: `import { useDerivedValue } from "react-native-reanimated";
export const useMirror = (offset) => {
  const { value } = useDerivedValue(() => offset.get());
  return value;
};
`,
      },
      {
        name: "a rest pattern names no value key",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const { ...rest } = useSharedValue(0);
  return rest;
};
`,
      },
      {
        name: "a computed key is not the value key",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = (key) => {
  const { [key]: picked } = useSharedValue(0);
  return picked;
};
`,
      },
      {
        name: "a get() read in JSX on something that is not a shared value",
        code: `import { Text } from "react-native";
export const Label = ({ cache }) => <Text>{cache.get()}</Text>;
`,
      },
      {
        name: "a non-mutating method on what get() returned",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useIds = () => {
  const items = useSharedValue([]);
  return () => items.get().map((item) => item.id);
};
`,
      },
      {
        name: "get with an argument is not a shared value read",
        code: `import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Label = () => {
  const store = useSharedValue(new Map());
  return <Text>{store.get("a")}</Text>;
};
`,
      },
      {
        name: "a read at module scope, outside any function and any JSX",
        code: `import { makeMutable } from "react-native-reanimated";
const progress = makeMutable(0);
export const initial = progress.get();
`,
      },
      {
        name: "the receiver is not a plain identifier",
        code: `import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Label = () => {
  const state = { progress: useSharedValue(0) };
  return <Text>{state.progress.get()}</Text>;
};
`,
      },
      {
        name: "a property assignment on something that is not a get() result",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useBox = () => {
  const box = useSharedValue({ x: 0 });
  const move = () => {
    box.value.x = 1;
  };
  return move;
};
`,
      },
      {
        name: "a property assignment on a plain function result",
        code: `import { getBox } from "./box";
export const move = () => {
  getBox().x = 1;
};
`,
      },
    ],
    invalid: [
      {
        name: "a read while JSX is built",
        code: `import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Label = () => {
  const progress = useSharedValue(0);
  return <Text>{progress.get()}</Text>;
};
`,
        errors: [{ message: "A `.get()` while JSX is evaluated is untracked", line: 5, column: 17 }],
      },
      {
        name: "a read inside an inline style object",
        code: `import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Card = () => {
  const progress = useSharedValue(0);
  return <View style={{ opacity: progress.get() }} />;
};
`,
        errors: [{ message: "A `.get()` while JSX is evaluated is untracked", line: 5, column: 34 }],
      },
      {
        name: "a write while JSX is built",
        code: `import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Card = ({ open }) => {
  const progress = useSharedValue(0);
  return <View>{open && progress.set(1)}</View>;
};
`,
        errors: [{ message: "render must stay pure", line: 5, column: 25 }],
      },
      {
        name: "destructuring the value out of a shared value",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const { value } = useSharedValue(0);
  return value;
};
`,
        errors: [{ message: "Keep the SharedValue object itself", line: 3, column: 9 }],
      },
      {
        name: "array and rest patterns ahead of a value destructure",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const [first] = useSharedValue([]);
  const { ...rest } = useSharedValue(0);
  const { value } = useSharedValue(1);
  return { first, rest, value };
};
`,
        errors: [{ message: "Keep the SharedValue object itself", line: 5, column: 9 }],
      },
      {
        name: "destructuring the value under another name",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useProgress = () => {
  const { value: opacity } = useSharedValue(1);
  return opacity;
};
`,
        errors: [{ message: "destructuring detaches the value", line: 3, column: 9 }],
      },
      {
        name: "assigning a property of what get() returned",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useBox = () => {
  const box = useSharedValue({ x: 0 });
  const move = () => {
    box.get().x = 1;
  };
  return move;
};
`,
        errors: [{ message: "mutating a property returned by `.get()`", line: 5, column: 5 }],
      },
      {
        name: "pushing into what get() returned",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useIds = () => {
  const items = useSharedValue([]);
  const add = (item) => {
    items.get().push(item);
  };
  return add;
};
`,
        errors: [{ message: "mutating the collection returned by `.get()`", line: 5, column: 5 }],
      },
      {
        name: "every mutating method in the set reports",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useIds = () => {
  const items = useSharedValue([]);
  const tags = useSharedValue(new Map());
  const run = () => {
    items.get().pop();
    items.get().shift();
    items.get().unshift(1);
    items.get().splice(0, 1);
    items.get().sort();
    items.get().reverse();
    items.get().copyWithin(0, 1);
    items.get().fill(0);
    tags.get().set(1, 2);
    tags.get().add(1);
    tags.get().delete(1);
    tags.get().clear();
  };
  return run;
};
`,
        errors: 12,
      },
      {
        name: "mutating a property of what a shared value's get() returned",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useBox = () => {
  const box = useSharedValue({ count: 0 });
  const bump = () => {
    box.get().count = 1;
  };
  return bump;
};
`,
        errors: [{ message: "mutating a property returned by `.get()`", line: 5, column: 5 }],
      },
      {
        name: "set on a Map returned by get() reads as a collection mutation",
        code: `import { useSharedValue } from "react-native-reanimated";
export const useStore = () => {
  const store = useSharedValue(new Map());
  const put = (key, item) => {
    store.get().set(key, item);
  };
  return put;
};
`,
        errors: [{ message: "mutating the collection returned by `.get()`", line: 5, column: 5 }],
      },
      {
        name: "two reads in one component",
        code: `import { Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
export const Card = () => {
  const progress = useSharedValue(0);
  return (
    <View style={{ opacity: progress.get() }}>
      <Text>{progress.get()}</Text>
    </View>
  );
};
`,
        errors: [
          { line: 6, column: 29 },
          { line: 7, column: 14 },
        ],
      },
    ],
  },
});
