import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

declare function report(value: number): void;

export function BadReaction() {
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => progress.get(),
    current => {
      progress.set(current + 1);
      scheduleOnRN(report, current);
    }
  );

  return null;
}
