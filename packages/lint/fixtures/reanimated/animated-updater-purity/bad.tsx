import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

declare function report(value: number): void;

export function useBadUpdater() {
  const progress = useSharedValue(0);

  return useAnimatedStyle(() => {
    progress.set(progress.get() + 1);
    scheduleOnRN(report, progress.get());
    return { opacity: progress.get() };
  });
}
