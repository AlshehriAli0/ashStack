import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

declare function report(value: number): void;

export function GoodReaction() {
  const progress = useSharedValue(0);
  const mirror = useSharedValue(0);

  useAnimatedReaction(
    () => progress.get() > 0.5,
    (current, previous) => {
      if (current !== previous) {
        mirror.set(current ? 1 : 0);
        scheduleOnRN(report, current ? 1 : 0);
      }
    }
  );

  return null;
}
