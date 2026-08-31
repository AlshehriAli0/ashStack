import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function useGoodUpdater() {
  const progress = useSharedValue(0);
  return useAnimatedStyle(() => ({ opacity: progress.get() }));
}
