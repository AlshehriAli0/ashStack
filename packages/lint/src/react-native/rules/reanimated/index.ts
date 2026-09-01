import { defineModule } from "../../../lib/module.js";
import { animatedReactionSafety } from "./animated-reaction-safety.js";
import { animatedStyleNeedsAnimatedComponent } from "./animated-style-needs-animated-component.js";
import { animatedUpdaterPurity } from "./animated-updater-purity.js";
import { gpuPropertiesOnly } from "./gpu-properties-only.js";
import { hoistLayoutAnimationBuilder } from "./hoist-layout-animation-builder.js";
import { interpolateNeedsClamp } from "./interpolate-needs-clamp.js";
import { noReactStateFromContinuousWorklet } from "./no-react-state-from-continuous-worklet.js";
import { noSharedValueDotValue } from "./no-shared-value-dot-value.js";
import { preferLazySharedValueInitializer } from "./prefer-lazy-shared-value-initializer.js";
import { scheduleOnRnScope } from "./schedule-on-rn-scope.js";
import { sharedValueUsage } from "./shared-value-usage.js";

export default defineModule({
  meta: { name: "@ashstack/reanimated" },
  url: import.meta.url,
  packages: ["react-native-reanimated"],
  option: "reanimated",
  docsWhen: "auto-enabled when `react-native-reanimated` is a dependency",
  rules: {
    "animated-reaction-safety": animatedReactionSafety,
    "animated-style-needs-animated-component": animatedStyleNeedsAnimatedComponent,
    "animated-updater-purity": animatedUpdaterPurity,
    "gpu-properties-only": gpuPropertiesOnly,
    "hoist-layout-animation-builder": hoistLayoutAnimationBuilder,
    "interpolate-needs-clamp": interpolateNeedsClamp,
    "no-shared-value-dot-value": noSharedValueDotValue,
    "no-react-state-from-continuous-worklet": noReactStateFromContinuousWorklet,
    "prefer-lazy-shared-value-initializer": preferLazySharedValueInitializer,
    "schedule-on-rn-scope": scheduleOnRnScope,
    "shared-value-usage": sharedValueUsage,
  },
  restrictedImports: {
    paths: [
      {
        name: "react-native",
        importNames: ["Animated"],
        message: "Use `react-native-reanimated` instead of React Native's `Animated` API.",
      },
      {
        name: "react-native-reanimated",
        importNames: ["runOnJS", "runOnUI"],
        message:
          "Use `scheduleOnRN` and `scheduleOnUI` from `react-native-worklets`; `runOnJS` and `runOnUI` are deprecated.",
      },
      {
        name: "react-native-worklets",
        importNames: ["runOnJS", "runOnUI"],
        message:
          "Use `scheduleOnRN` and `scheduleOnUI` from `react-native-worklets`; `runOnJS` and `runOnUI` are deprecated.",
      },
    ],
  },
});
