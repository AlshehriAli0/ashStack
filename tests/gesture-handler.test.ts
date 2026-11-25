import { describe, expect, it } from "bun:test";

import type { RestrictedImports } from "../packages/lint/dist/lib/types.js";
import { banGroups, reactNative } from "../packages/lint/dist/react-native/index.js";
import gestureHandler from "../packages/lint/dist/react-native/rules/gesture-handler/index.js";
import { banTests, moduleTests } from "./harness.js";
import { inDir, install, workspace } from "./workspace.js";

const RNGH = "react-native-gesture-handler";

/** Whether `reactNative()`, run in a repo with `installed` in node_modules, bans the `Gesture` import. */
const bansGestureWith = (installed: string, options = {}): boolean => {
  const paths = workspace({ repo: { dependencies: { [RNGH]: `^${installed}` } } });
  install(paths.repo!, RNGH, installed);
  const config = inDir(paths.repo!, () => reactNative(options));
  const [, bans] = config.rules!["no-restricted-imports"] as [string, RestrictedImports];
  return (bans.paths ?? []).some(path => path.name === RNGH && path.importNames?.includes("Gesture"));
};

describe("@ashstack/gesture-handler", () => {
  it("bans the Gesture Handler 2 API when Gesture Handler 3 is installed", () => {
    expect(bansGestureWith("3.5.0")).toBe(true);
  });

  it("leaves it alone on Gesture Handler 2, where it is the current API", () => {
    expect(bansGestureWith("2.28.0")).toBe(false);
  });

  it("turns off by option", () => {
    expect(bansGestureWith("3.5.0", { gestureHandler: false })).toBe(false);
  });
});

banTests("@ashstack/gesture-handler import bans", gestureHandler.restrictedImports!, {
  valid: [
    {
      name: "the Gesture Handler 3 API",
      code: `import {
  Directions,
  FlatList,
  GestureDetector,
  GestureHandlerRootView,
  InterceptingGestureDetector,
  Pressable,
  RefreshControl,
  ScrollView,
  State,
  Switch,
  TextInput,
  Touchable,
  useCompetingGestures,
  useExclusiveGestures,
  useNativeGesture,
  usePanGesture,
  useSimultaneousGestures,
  useTapGesture,
  VirtualGestureDetector,
} from "react-native-gesture-handler";
`,
    },
    {
      name: "Gesture Handler 3 types",
      code: `import type {
  ComposedGesture,
  PanGesture,
  PanGestureConfig,
  PanGestureEvent,
  PressableProps,
  SingleGesture,
  TouchableProps,
} from "react-native-gesture-handler";
`,
    },
    {
      name: "a Gesture export from another library",
      code: `import { Gesture, TouchableOpacity } from "some-other-gestures";\n`,
    },
    {
      name: "the drawer and swipeable entry points",
      code: `import ReanimatedDrawerLayout from "react-native-gesture-handler/ReanimatedDrawerLayout";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
`,
    },
  ],
  invalid: [
    {
      name: "the Gesture builder object",
      code: `import { Gesture, GestureDetector } from "react-native-gesture-handler";\n`,
      errors: [
        { message: /'Gesture' import .*`usePanGesture`.*`useCompetingGestures` \(was `Race`\)/, line: 1, column: 10 },
      ],
    },
    {
      name: "a renamed Gesture import",
      code: `import { Gesture as G } from "react-native-gesture-handler";\n`,
      errors: [{ message: "`GestureDetector`" }],
    },
    {
      name: "a re-export of Gesture",
      code: `export { Gesture } from "react-native-gesture-handler";\n`,
      errors: [{ message: "Gesture Handler 2 API" }],
    },
    {
      name: "every handler component",
      code: `import {
  FlingGestureHandler,
  ForceTouchGestureHandler,
  LongPressGestureHandler,
  NativeViewGestureHandler,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  TapGestureHandler,
} from "react-native-gesture-handler";
`,
      errors: Array.from({ length: 8 }, (_, index) => ({
        message: "wrap the view in `GestureDetector`",
        line: index + 2,
      })),
    },
    {
      name: "the buttons and Touchable components",
      code: `import {
  BaseButton,
  BorderlessButton,
  RawButton,
  RectButton,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native-gesture-handler";
`,
      errors: Array.from({ length: 8 }, () => ({ message: "Use `Touchable` from `react-native-gesture-handler`" })),
    },
    {
      name: "the Legacy buttons",
      code: `import { LegacyBaseButton, LegacyBorderlessButton, LegacyRawButton, LegacyRectButton } from "react-native-gesture-handler";\n`,
      errors: Array.from({ length: 4 }, () => ({ message: "`Touchable`" })),
    },
    {
      name: "the Legacy components with an unprefixed replacement",
      code: `import {
  LegacyFlatList,
  LegacyPressable,
  LegacyRefreshControl,
  LegacyScrollView,
  LegacySwitch,
  LegacyTextInput,
} from "react-native-gesture-handler";
`,
      errors: Array.from({ length: 6 }, () => ({ message: "without the `Legacy` prefix" })),
    },
    {
      name: "LegacyText",
      code: `import { LegacyText } from "react-native-gesture-handler";\n`,
      errors: [{ message: "wrap it in `GestureDetector`" }],
    },
    {
      name: "LegacyDrawerLayoutAndroid",
      code: `import { LegacyDrawerLayoutAndroid } from "react-native-gesture-handler";\n`,
      errors: [{ message: "`ReanimatedDrawerLayout`" }],
    },
    {
      name: "both native wrapper factories",
      code: `import { createNativeWrapper, legacy_createNativeWrapper } from "react-native-gesture-handler";\n`,
      errors: [{ message: "`useNativeGesture`" }, { message: "`useNativeGesture`" }],
    },
    {
      name: "GestureType, as a type-only import",
      code: `import type { GestureType } from "react-native-gesture-handler";\n`,
      errors: [{ message: "`SingleGesture`" }],
    },
    {
      name: "handler event and props types, inline type specifiers",
      code: `import {
  type GestureHandlerGestureEvent,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerProps,
  type TapGestureHandlerStateChangeEvent,
  type LongPressGestureHandlerProperties,
} from "react-native-gesture-handler";
`,
      errors: Array.from({ length: 5 }, () => ({ message: "`PanGestureConfig`" })),
    },
    {
      name: "button props types",
      code: `import type { LegacyRectButtonProps, RectButtonProps, TouchableOpacityProps } from "react-native-gesture-handler";\n`,
      errors: Array.from({ length: 3 }, () => ({ message: "`TouchableProps`" })),
    },
    {
      name: "Legacy gesture types",
      code: `import type { LegacyComposedGesture, LegacyPanGesture, LegacyPressableProps } from "react-native-gesture-handler";\n`,
      errors: Array.from({ length: 3 }, () => ({ message: "without the `Legacy` prefix" })),
    },
    {
      name: "Legacy composition types",
      code: `import type { LegacyExclusiveGesture, LegacyRaceGesture, LegacySimultaneousGesture } from "react-native-gesture-handler";\n`,
      errors: Array.from({ length: 3 }, () => ({ message: "`ComposedGesture`" })),
    },
    {
      name: "the Legacy force touch type",
      code: `import type { LegacyForceTouchGesture } from "react-native-gesture-handler";\n`,
      errors: [{ message: "no force touch gesture" }],
    },
  ],
});

const pressableGroup = banGroups.find(group => group.packages.includes(RNGH))!;

banTests("react-native Pressable ban with react-native-gesture-handler", pressableGroup.restrictedImports, {
  valid: [`import { Pressable, Touchable } from "react-native-gesture-handler";\n`],
  invalid: [
    {
      name: "React Native's Pressable names RNGH's Pressable and, on v3, its Touchable",
      code: `import { Pressable, TouchableOpacity } from "react-native";\n`,
      errors: [
        { message: /Import `Pressable` from `react-native-gesture-handler`; on Gesture Handler 3, its `Touchable`/ },
        { message: "`Touchable` for an opacity or highlight press effect" },
      ],
    },
  ],
});

moduleTests(gestureHandler, {
  "modal-needs-root-view": {
    valid: [
      {
        name: "the gestures doc's fix: a root view inside the modal",
        code: `import { Modal } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
export const Sheet = ({ pan, children }) => (
  <Modal transparent>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={pan}>{children}</GestureDetector>
    </GestureHandlerRootView>
  </Modal>
);
`,
      },
      {
        name: "an aliased root view, a level down",
        code: `import { Modal, View } from "react-native";
import { GestureHandlerRootView as Root, Touchable } from "react-native-gesture-handler";
export const Confirm = ({ onConfirm }) => (
  <Modal>
    <Root style={{ flex: 1 }}>
      <View>
        <Touchable onPress={onConfirm} />
      </View>
    </Root>
  </Modal>
);
`,
      },
      {
        name: "a modal with no Gesture Handler component in it",
        code: `import { Modal, Pressable, Text } from "react-native";
export const Notice = ({ onClose }) => (
  <Modal>
    <Pressable onPress={onClose}>
      <Text>Close</Text>
    </Pressable>
  </Modal>
);
`,
      },
      {
        name: "a modal that is not React Native's",
        code: `import { Modal } from "@/components/ui";
import { Touchable } from "react-native-gesture-handler";
export const Confirm = ({ onConfirm }) => (
  <Modal>
    <Touchable onPress={onConfirm} />
  </Modal>
);
`,
      },
      {
        name: "a gesture next to the modal, not inside it",
        code: `import { Modal, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
export const Screen = ({ pan }) => (
  <View>
    <GestureDetector gesture={pan}>
      <View />
    </GestureDetector>
    <Modal />
  </View>
);
`,
      },
    ],
    invalid: [
      {
        name: "a GestureDetector straight inside a Modal",
        code: `import { Modal } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
export const Sheet = ({ pan, children }) => (
  <Modal transparent>
    <GestureDetector gesture={pan}>{children}</GestureDetector>
  </Modal>
);
`,
        errors: [
          {
            message:
              "Wrap this `Modal`'s content in `GestureHandlerRootView` with `style={{ flex: 1 }}`. A `Modal` renders outside the app's root view, so the gestures inside it never fire without one.",
            line: 4,
            column: 4,
          },
        ],
      },
      {
        name: "a root view beside the gesture instead of around it",
        code: `import { Modal } from "react-native";
import { GestureHandlerRootView as Root, RectButton } from "react-native-gesture-handler";
export const Sheet = ({ onClose }) => (
  <Modal>
    <Root style={{ flex: 1 }} />
    <RectButton onPress={onClose} />
  </Modal>
);
`,
        errors: [{ line: 4, column: 4 }],
      },
      {
        name: "a Gesture Handler component from a subpath",
        code: `import { Modal } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
export const Row = ({ children }) => (
  <Modal>
    <ReanimatedSwipeable>{children}</ReanimatedSwipeable>
  </Modal>
);
`,
        errors: 1,
      },
      {
        name: "an aliased Gesture Handler Pressable nested deeper",
        code: `import { Modal as RNModal, View } from "react-native";
import { Pressable as GHPressable } from "react-native-gesture-handler";
export const Picker = ({ onPick }) => (
  <RNModal>
    <View>
      <GHPressable onPress={onPick} />
    </View>
  </RNModal>
);
`,
        errors: [{ line: 4, column: 4 }],
      },
    ],
  },
});
