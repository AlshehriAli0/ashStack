import { defineModule } from "../../../lib/module.js";

const RNGH = "react-native-gesture-handler";

const HANDLER_COMPONENTS = [
  "PanGestureHandler",
  "TapGestureHandler",
  "LongPressGestureHandler",
  "PinchGestureHandler",
  "RotationGestureHandler",
  "FlingGestureHandler",
  "ForceTouchGestureHandler",
  "NativeViewGestureHandler",
];

const HANDLER_TYPES = [
  "GestureHandlerGestureEvent",
  "GestureHandlerStateChangeEvent",
  ...HANDLER_COMPONENTS.flatMap(name => [
    `${name}GestureEvent`,
    `${name}StateChangeEvent`,
    `${name}Props`,
    `${name}Properties`,
  ]),
];

const BUTTONS = ["RawButton", "BaseButton", "RectButton", "BorderlessButton"];

const TOUCHABLES = ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback", "TouchableNativeFeedback"];

const BUTTON_TYPES = [
  ...BUTTONS.flatMap(name => [`${name}Props`, `Legacy${name}Props`, `Legacy${name}Properties`]),
  "TouchableOpacityProps",
  "TouchableHighlightProps",
  "TouchableWithoutFeedbackProps",
];

const LEGACY_COMPONENTS = [
  "LegacyPressable",
  "LegacyScrollView",
  "LegacyFlatList",
  "LegacyRefreshControl",
  "LegacySwitch",
  "LegacyTextInput",
];

const LEGACY_TYPES = [
  "LegacyPressableProps",
  "LegacyFlingGesture",
  "LegacyHoverGesture",
  "LegacyLongPressGesture",
  "LegacyManualGesture",
  "LegacyPanGesture",
  "LegacyPinchGesture",
  "LegacyRotationGesture",
  "LegacyTapGesture",
  "LegacyComposedGesture",
  "LegacyGestureStateManager",
];

const GESTURE_HOOKS =
  "`usePanGesture`, `useTapGesture`, `useLongPressGesture`, `usePinchGesture`, `useRotationGesture`, `useFlingGesture`, `useNativeGesture`";

export default defineModule({
  meta: { name: "@ashstack/gesture-handler" },
  url: import.meta.url,
  packages: [RNGH],
  minMajor: 3,
  option: "gestureHandler",
  docsWhen: "auto-enabled when `react-native-gesture-handler` 3 or later is a dependency",
  rules: {},
  restrictedImports: {
    paths: [
      {
        name: RNGH,
        importNames: ["Gesture"],
        message: `\`Gesture.*()\` builders are the Gesture Handler 2 API. Create each gesture with its hook (${GESTURE_HOOKS}) and pass it to \`GestureDetector\`; combine gestures with \`useSimultaneousGestures\`, \`useCompetingGestures\` or \`useExclusiveGestures\`.`,
      },
      {
        name: RNGH,
        importNames: HANDLER_COMPONENTS,
        message: `\`*GestureHandler\` components are the Gesture Handler 2 API. Create the gesture with its hook (${GESTURE_HOOKS}) and wrap the view in \`GestureDetector\`. Force touch has no Gesture Handler 3 gesture.`,
      },
      {
        name: RNGH,
        importNames: [...BUTTONS, ...BUTTONS.map(name => `Legacy${name}`), ...TOUCHABLES],
        message:
          "Use `Touchable` from `react-native-gesture-handler`, with `activeOpacity` for an opacity press effect or `activeUnderlayOpacity` for a highlight. Gesture Handler 3 deprecates its buttons and `Touchable*` components.",
      },
      {
        name: RNGH,
        importNames: BUTTON_TYPES,
        message: "Type the props as `TouchableProps`, the props of Gesture Handler 3's `Touchable`.",
      },
      {
        name: RNGH,
        importNames: LEGACY_COMPONENTS,
        message:
          "Import the name without the `Legacy` prefix (`LegacyScrollView` → `ScrollView`). `Legacy*` components are the Gesture Handler 2 versions.",
      },
      {
        name: RNGH,
        importNames: ["LegacyText"],
        message: "Use React Native's `Text` and wrap it in `GestureDetector` or `VirtualGestureDetector`.",
      },
      {
        name: RNGH,
        importNames: ["LegacyDrawerLayoutAndroid"],
        message:
          "Use `ReanimatedDrawerLayout` from `react-native-gesture-handler/ReanimatedDrawerLayout`, or React Native's `DrawerLayoutAndroid`.",
      },
      {
        name: RNGH,
        importNames: ["createNativeWrapper", "legacy_createNativeWrapper"],
        message:
          "Create the gesture with `useNativeGesture` and wrap the native component in `GestureDetector`, instead of wrapping the component with `createNativeWrapper`.",
      },
      {
        name: RNGH,
        importNames: ["GestureType"],
        message:
          "Type a Gesture Handler 3 gesture as `SingleGesture`, `ComposedGesture` for a combination, or the hook's own type (`PanGesture`, `TapGesture`, …). `GestureType` describes the Gesture Handler 2 builders.",
      },
      {
        name: RNGH,
        importNames: HANDLER_TYPES,
        message:
          "Use the Gesture Handler 3 type for the gesture: `PanGestureConfig` for its config, `PanGestureEvent` (or `PanGestureActiveEvent`, `PanGestureBeginEvent`, …) for its callbacks. These types describe the Gesture Handler 2 handler components.",
      },
      {
        name: RNGH,
        importNames: LEGACY_TYPES,
        message:
          "Import the type without the `Legacy` prefix (`LegacyPanGesture` → `PanGesture`). `Legacy*` types describe the Gesture Handler 2 API.",
      },
      {
        name: RNGH,
        importNames: ["LegacyExclusiveGesture", "LegacyRaceGesture", "LegacySimultaneousGesture"],
        message:
          "Type a combined gesture as `ComposedGesture`, what `useSimultaneousGestures`, `useCompetingGestures` and `useExclusiveGestures` return.",
      },
      {
        name: RNGH,
        importNames: ["LegacyForceTouchGesture"],
        message:
          "Gesture Handler 3 has no force touch gesture; `LegacyForceTouchGesture` types the Gesture Handler 2 one.",
      },
    ],
  },
});
