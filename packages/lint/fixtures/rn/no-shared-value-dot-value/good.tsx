import { useSharedValue } from "react-native-reanimated";

export function useGoodDotValue() {
  const progress = useSharedValue(0);
  progress.set(1);
  return progress.get();
}
